"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireVendor } from "@/lib/auth/guards";
import { getDb, newId } from "@/lib/db/client";
import { toMinor } from "@/lib/domain/money";
import { slugify, zodFormState, type FormState } from "@/lib/form-state";
import { ImageRejectedError, MAX_IMAGES_PER_PRODUCT, saveProductImage } from "@/lib/storage";
import { parseFaqs, parseHighlights, parseSpecs } from "@/lib/validation/product-text";
import { productSchema } from "@/lib/validation/schemas";

const IMAGE_PATH = /^\/(media|demo)\/[A-Za-z0-9._-]+$/;

async function uniqueProductSlug(name: string): Promise<string> {
  const db = await getDb();
  const root = slugify(name) || "product";
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate = attempt === 0 ? root : `${root}-${attempt + 1}`;
    const taken = await db.products.findOne({ slug: candidate }, { projection: { _id: 1 } });
    if (!taken) return candidate;
  }
  return `${root}-${Date.now().toString(36)}`;
}

async function collectImages(formData: FormData, existing: readonly string[]): Promise<string[]> {
  // A vendor may only keep images this product already has, never reference another product's files.
  const kept = formData.getAll("keepImage").filter((v): v is string => typeof v === "string" && IMAGE_PATH.test(v) && existing.includes(v));
  const files = formData.getAll("images").filter((v): v is File => v instanceof File && v.size > 0);
  if (kept.length + files.length > MAX_IMAGES_PER_PRODUCT) {
    throw new ImageRejectedError(`A product can have at most ${MAX_IMAGES_PER_PRODUCT} images.`);
  }
  const uploaded: string[] = [];
  for (const file of files) uploaded.push(await saveProductImage(file));
  return [...kept, ...uploaded];
}

/** Create (no productId) or update (productId present) one of the signed-in vendor's products. */
export async function saveProductAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { vendor } = await requireVendor();
  if (vendor.status !== "active") return { ok: false, message: "Your vendor account is suspended. Contact the store admin." };

  const parsed = productSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return zodFormState(parsed.error);
  const input = parsed.data;

  const priceMinor = toMinor(input.price);
  const compareAtMinor = input.compareAt ? toMinor(input.compareAt) : null;
  if (priceMinor <= 0) return { ok: false, fieldErrors: { price: "Price must be greater than zero." } };
  if (compareAtMinor !== null && compareAtMinor <= priceMinor) {
    return { ok: false, fieldErrors: { compareAt: "Compare-at price must be higher than the price." } };
  }

  const db = await getDb();
  const category = await db.categories.findOne({ _id: input.categoryId }, { projection: { _id: 1 } });
  if (!category) return { ok: false, fieldErrors: { categoryId: "Choose a category." } };

  const productId = formData.get("productId");
  const editing = typeof productId === "string" && productId !== "";
  let existingImages: readonly string[] = [];
  if (editing) {
    if (!z.uuid().safeParse(productId).success) return { ok: false, message: "Product not found." };
    const current = await db.products.findOne(
      { _id: productId, vendorId: vendor.id, status: { $ne: "archived" } },
      { projection: { images: 1 } },
    );
    if (!current) return { ok: false, message: "Product not found." };
    existingImages = current.images;
  }

  let images: string[];
  try {
    images = await collectImages(formData, existingImages);
  } catch (error: unknown) {
    if (error instanceof ImageRejectedError) return { ok: false, fieldErrors: { images: error.message } };
    throw error;
  }
  if (images.length === 0 && input.status === "active") {
    return { ok: false, fieldErrors: { images: "Add at least one photo before publishing." } };
  }

  const values = {
    categoryId: input.categoryId,
    name: input.name,
    tagline: input.tagline,
    description: input.description,
    highlights: parseHighlights(input.highlights),
    specs: parseSpecs(input.specs),
    faqs: parseFaqs(input.faqs),
    images,
    sku: input.sku,
    priceMinor,
    compareAtMinor,
    stock: input.stock,
    weightGrams: input.weightGrams,
    status: input.status,
    updatedAt: new Date(),
  };

  if (editing) {
    const updated = await db.products.updateOne(
      // Archived products (removed by the vendor or taken down by the admin) cannot be edited back to life.
      { _id: productId, vendorId: vendor.id, status: { $ne: "archived" } },
      { $set: values },
    );
    if (updated.matchedCount === 0) return { ok: false, message: "Product not found." };
  } else {
    await db.products.insertOne({
      ...values,
      _id: newId(),
      vendorId: vendor.id,
      slug: await uniqueProductSlug(input.name),
      currency: "INR",
      originCountry: vendor.countryCode,
      ratingSum: 0,
      ratingCount: 0,
      createdAt: values.updatedAt,
    });
  }

  revalidatePath("/", "layout");
  redirect("/vendor/products?saved=1");
}

const archiveInput = z.object({ productId: z.uuid() });

export async function archiveProductAction(formData: FormData): Promise<void> {
  const { vendor } = await requireVendor();
  const parsed = archiveInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const db = await getDb();
  await db.products.updateOne({ _id: parsed.data.productId, vendorId: vendor.id }, { $set: { status: "archived", updatedAt: new Date() } });
  revalidatePath("/", "layout");
}
