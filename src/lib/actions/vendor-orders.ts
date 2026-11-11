"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireVendor } from "@/lib/auth/guards";
import { getDb } from "@/lib/db/client";
import { fulfillmentEvents, orderItems, products, vendorOrders } from "@/lib/db/schema";
import { canTransition, FULFILLMENT_LABELS, validateShipReadiness, type PackageDetails } from "@/lib/domain/fulfillment";
import { zodFormState, type FormState } from "@/lib/form-state";
import { packageSchema, shipmentUpdateSchema } from "@/lib/validation/schemas";

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
  const [current] = await db
    .select()
    .from(vendorOrders)
    .where(and(eq(vendorOrders.id, vendorOrderId), eq(vendorOrders.vendorId, vendor.id)))
    .limit(1);
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
  const applied = await db.transaction(async (tx) => {
    const updated = await tx
      .update(vendorOrders)
      .set({
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
      })
      .where(and(eq(vendorOrders.id, vendorOrderId), eq(vendorOrders.status, current.status)))
      .returning({ id: vendorOrders.id });
    // Zero rows means another request changed the status first; record nothing.
    if (updated.length === 0) return false;
    if (intent !== "save") {
      await tx.insert(fulfillmentEvents).values({ vendorOrderId, status: intent, note: vendorNote || null });
    }
    if (intent === "cancelled") {
      // Return the cancelled units to stock.
      const items = await tx
        .select({ productId: orderItems.productId, quantity: orderItems.quantity })
        .from(orderItems)
        .where(eq(orderItems.vendorOrderId, vendorOrderId));
      for (const item of items) {
        await tx.update(products).set({ stock: sql`${products.stock} + ${item.quantity}` }).where(eq(products.id, item.productId));
      }
    }
    return true;
  });
  if (!applied) return { ok: false, message: "This shipment was just updated elsewhere. Refresh the page and try again." };

  revalidatePath("/vendor", "layout");
  revalidatePath("/admin", "layout");
  revalidatePath("/orders", "layout");
  return { ok: true, message: intent === "save" ? "Details saved." : `Marked ${FULFILLMENT_LABELS[intent].toLowerCase()}.` };
}
