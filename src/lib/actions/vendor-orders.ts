"use server";

import { revalidatePath } from "next/cache";
import { requireVendor } from "@/lib/auth/guards";
import { getDb, newId, withTransaction } from "@/lib/db/client";
import { canTransition, FULFILLMENT_LABELS, validateShipReadiness, type PackageDetails } from "@/lib/domain/fulfillment";
import { zodFormState, type FormState } from "@/lib/form-state";
import { packageSchema, shipmentUpdateSchema } from "@/lib/validation/schemas";

const DONE_MESSAGES: Readonly<Record<string, string>> = {
  save: "Details saved.",
  accepted: "Order accepted.",
  packed: "Marked as packed.",
  shipped: "Marked as shipped. The customer can now see the tracking number.",
  delivered: "Marked as delivered.",
  cancelled: "Shipment cancelled. The items are back in stock.",
};

const PACKAGE_FIELDS = ["packageCount", "weightGrams", "lengthCm", "widthCm", "heightCm"] as const;

function hasPackageInput(formData: FormData): boolean {
  return PACKAGE_FIELDS.some((field) => String(formData.get(field) ?? "").trim() !== "");
}

/**
 * Single entry point for a vendor updating a shipment: save package details
 * and notes, and optionally move it to the next status.
 */
export async function updateShipmentAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { vendor } = await requireVendor();
  if (vendor.status !== "active") return { ok: false, message: "Your vendor account is suspended. Contact the store admin." };

  const parsed = shipmentUpdateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return zodFormState(parsed.error);
  const { vendorOrderId, intent, carrier, trackingNumber, vendorNote } = parsed.data;

  const db = await getDb();
  const current = await db.vendorOrders.findOne({ _id: vendorOrderId, vendorId: vendor.id });
  if (!current) return { ok: false, message: "Shipment not found." };

  const editable = current.status === "new" || current.status === "accepted" || current.status === "packed";
  let pkg: PackageDetails = current;
  if (editable && hasPackageInput(formData)) {
    const parsedPackage = packageSchema.safeParse(Object.fromEntries(formData));
    if (!parsedPackage.success) return zodFormState(parsedPackage.error);
    pkg = parsedPackage.data;
  }

  if (intent !== "save") {
    if (!canTransition(current.status, intent)) {
      return { ok: false, message: `A ${FULFILLMENT_LABELS[current.status].toLowerCase()} shipment cannot be marked ${FULFILLMENT_LABELS[intent].toLowerCase()}.` };
    }
    if ((intent === "packed" || intent === "shipped") && !validateShipReadiness(pkg)) {
      return { ok: false, message: "Enter the package count, weight and dimensions before marking this packed." };
    }
  }

  const now = new Date();
  const nextStatus = intent === "save" ? current.status : intent;
  const applied = await withTransaction(db, async (tx) => {
    const updated = await db.vendorOrders.updateOne(
      // Matching on the status we read means a competing update makes this one a no-op.
      { _id: vendorOrderId, status: current.status },
      {
        $set: {
          status: nextStatus,
          packageCount: pkg.packageCount,
          weightGrams: pkg.weightGrams,
          lengthCm: pkg.lengthCm,
          widthCm: pkg.widthCm,
          heightCm: pkg.heightCm,
          carrier: carrier || current.carrier,
          trackingNumber: trackingNumber || current.trackingNumber,
          vendorNote: vendorNote || current.vendorNote,
          updatedAt: now,
          shippedAt: intent === "shipped" ? now : current.shippedAt,
          deliveredAt: intent === "delivered" ? now : current.deliveredAt,
        },
      },
      { session: tx },
    );
    // No match means another request changed the status first; record nothing.
    if (updated.matchedCount === 0) return false;
    if (intent !== "save") {
      await db.fulfillmentEvents.insertOne(
        { _id: newId(), vendorOrderId, status: intent, note: vendorNote || null, createdAt: now },
        { session: tx },
      );
    }
    if (intent === "cancelled") {
      // Return the cancelled units to stock.
      const items = await db.orderItems.find({ vendorOrderId }, { session: tx, projection: { productId: 1, quantity: 1 } }).toArray();
      for (const item of items) {
        await db.products.updateOne({ _id: item.productId }, { $inc: { stock: item.quantity } }, { session: tx });
      }
    }
    return true;
  });
  if (!applied) return { ok: false, message: "This shipment was just updated elsewhere. Refresh the page and try again." };

  revalidatePath("/vendor", "layout");
  revalidatePath("/admin", "layout");
  revalidatePath("/orders", "layout");
  return { ok: true, message: DONE_MESSAGES[intent] ?? "Saved." };
}
