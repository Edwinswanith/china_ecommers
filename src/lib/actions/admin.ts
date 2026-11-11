"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guards";
import { getDb } from "@/lib/db/client";

const vendorStatusInput = z.object({ vendorId: z.uuid(), status: z.enum(["active", "suspended"]) });
const productStatusInput = z.object({ productId: z.uuid(), status: z.enum(["active", "archived"]) });

/** Suspending a vendor hides all their products from the storefront immediately. */
export async function setVendorStatusAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const parsed = vendorStatusInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const db = await getDb();
  await db.vendors.updateOne({ _id: parsed.data.vendorId }, { $set: { status: parsed.data.status } });
  revalidatePath("/", "layout");
}

/** Products go live without approval, so the admin's control is a takedown. */
export async function setProductStatusAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const parsed = productStatusInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const db = await getDb();
  await db.products.updateOne({ _id: parsed.data.productId }, { $set: { status: parsed.data.status, archivedBy: parsed.data.status === "archived" ? "admin" : null, updatedAt: new Date() } });
  revalidatePath("/", "layout");
}
