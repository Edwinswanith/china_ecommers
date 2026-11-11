"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guards";
import { VENDOR_COUNTRIES } from "@/lib/config/markets";
import { CUSTOMER_COUNTRY_COOKIE, VENDOR_COUNTRY_COOKIE } from "@/lib/data/admin-scope";
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

const COUNTRY_FILTER_MAX_AGE_SECONDS = 60 * 60 * 24 * 90;
const countryCode = z.union([z.literal(""), z.enum(Object.keys(VENDOR_COUNTRIES) as [string, ...string[]])]);
const countryFilterInput = z.object({ vendorCountry: countryCode, customerCountry: countryCode });

/** Remember which countries the admin wants to see. An empty value means all countries. */
export async function setCountryFilterAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const parsed = countryFilterInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const store = await cookies();
  const choices = [
    [VENDOR_COUNTRY_COOKIE, parsed.data.vendorCountry],
    [CUSTOMER_COUNTRY_COOKIE, parsed.data.customerCountry],
  ] as const;
  for (const [name, value] of choices) {
    if (value === "") store.delete({ name, path: "/admin" });
    else store.set(name, value, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/admin", maxAge: COUNTRY_FILTER_MAX_AGE_SECONDS });
  }
}
