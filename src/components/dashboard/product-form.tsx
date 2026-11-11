"use client";

import Link from "next/link";
import { useActionState } from "react";
import { SelectField, TextAreaField, TextField } from "@/components/forms/field";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { ProductImage } from "@/components/product-image";
import { MAX_IMAGE_BYTES, MAX_IMAGES_PER_PRODUCT } from "@/lib/storage-names";
import { PhotoPicker } from "./photo-picker";
import { saveProductAction } from "@/lib/actions/vendor-products";
import type { Category, Product } from "@/lib/db/schema";
import { fromMinor } from "@/lib/domain/money";
import { EMPTY_FORM_STATE } from "@/lib/form-state";
import { formatFaqs, formatHighlights, formatSpecs } from "@/lib/validation/product-text";

interface ProductFormProps {
  categories: readonly Category[];
  product?: Product;
}

export function ProductForm({ categories, product }: ProductFormProps) {
  const [state, action] = useActionState(saveProductAction, EMPTY_FORM_STATE);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={action} className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
      {product ? <input type="hidden" name="productId" value={product.id} /> : null}

      <div className="space-y-6">
        <section className="panel space-y-5 p-5 md:p-6">
          <h2 className="text-[18px] font-bold tracking-tight">The product</h2>
          <TextField label="Product name" name="name" maxLength={90} required defaultValue={product?.name} placeholder="e.g. Halo Levitating Lamp" error={errors.name} />
          <TextField label="Tagline" name="tagline" maxLength={140} required defaultValue={product?.tagline} hint="One sentence that says what makes it clever. Shown on cards and in search results." error={errors.tagline} />
          <TextAreaField label="Description" name="description" rows={6} maxLength={4000} required defaultValue={product?.description} hint="Start with what it is and what it does, in plain language." error={errors.description} />
          <TextAreaField label="Highlights" name="highlights" rows={4} defaultValue={product ? formatHighlights(product.highlights) : ""} hint="One per line. Up to 8." error={errors.highlights} placeholder={"Magnetic levitation with wireless power\nThree warm-white brightness levels"} />
          <TextAreaField label="Specifications" name="specs" rows={5} defaultValue={product ? formatSpecs(product.specs) : ""} hint="One per line, written as Label: value." error={errors.specs} placeholder={"Weight: 1.1 kg\nPower: 12 W, USB-C"} />
          <TextAreaField label="Questions and answers" name="faqs" rows={4} defaultValue={product ? formatFaqs(product.faqs) : ""} hint="One per line, written as Question? | Answer. These help buyers and search engines." error={errors.faqs} placeholder="Is it bright enough to read by? | Yes, 320 lumens at the highest level." />
        </section>

        <section className="panel space-y-5 p-5 md:p-6">
          <div>
            <h2 className="text-[18px] font-bold tracking-tight">Photos</h2>
            <p className="mt-0.5 text-[14px] text-subtle">Square images work best. JPG, PNG, WebP or AVIF, up to 4 MB each, 6 photos maximum. The first photo is the cover.</p>
          </div>
          {product && product.images.length > 0 ? (
            <ul className="grid grid-cols-3 gap-3 sm:grid-cols-6">
              {product.images.map((src, index) => (
                <li key={src}>
                  <label className="block cursor-pointer">
                    <span className="block overflow-hidden rounded-xl border border-line"><ProductImage src={src} alt={`Photo ${index + 1}`} sizes="120px" /></span>
                    <span className="label mt-1.5 flex items-center gap-1.5">
                      <input type="checkbox" name="keepImage" value={src} defaultChecked className="h-4 w-4 accent-[#2152e5]" /> Keep
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          ) : null}
          <PhotoPicker label={product ? "Add more photos" : "Upload photos"} error={errors.images} maxBytes={MAX_IMAGE_BYTES} maxFiles={MAX_IMAGES_PER_PRODUCT} />
        </section>
      </div>

      <div className="space-y-6">
        <section className="panel space-y-5 p-5 md:p-6">
          <h2 className="text-[18px] font-bold tracking-tight">Price and stock</h2>
          <TextField label="Price (₹)" name="price" inputMode="decimal" required defaultValue={product ? fromMinor(product.priceMinor) : ""} placeholder="2499" error={errors.price} />
          <TextField label="Compare-at price (₹, optional)" name="compareAt" inputMode="decimal" defaultValue={product?.compareAtMinor ? fromMinor(product.compareAtMinor) : ""} hint="Shown struck through to indicate a discount." error={errors.compareAt} />
          <TextField label="Units in stock" name="stock" type="number" inputMode="numeric" min={0} required defaultValue={product?.stock ?? ""} error={errors.stock} />
          <TextField label="SKU" name="sku" maxLength={40} required defaultValue={product?.sku} placeholder="Your internal code" error={errors.sku} />
          <TextField label="Product weight (grams)" name="weightGrams" type="number" inputMode="numeric" min={1} required defaultValue={product?.weightGrams || ""} error={errors.weightGrams} />
        </section>

        <section className="panel space-y-5 p-5 md:p-6">
          <h2 className="text-[18px] font-bold tracking-tight">Listing</h2>
          <SelectField label="Collection" name="categoryId" required defaultValue={product?.categoryId ?? ""} error={errors.categoryId}>
            <option value="" disabled>Choose a collection</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </SelectField>
          <SelectField label="Visibility" name="status" defaultValue={product?.status === "draft" ? "draft" : "active"} hint="Live products appear on the store immediately." error={errors.status}>
            <option value="active">Live on the store</option>
            <option value="draft">Draft (hidden)</option>
          </SelectField>
        </section>

        <div className="space-y-3">
          <FormMessage state={state} />
          <SubmitButton className="btn btn-primary w-full" pendingLabel="Saving…">{product ? "Save changes" : "Publish product"}</SubmitButton>
          <Link href="/vendor/products" className="btn btn-ghost w-full">Cancel</Link>
        </div>
      </div>
    </form>
  );
}
