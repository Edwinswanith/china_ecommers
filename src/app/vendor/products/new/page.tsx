import type { Metadata } from "next";
import Link from "next/link";
import { ProductForm } from "@/components/dashboard/product-form";
import { PageHeader } from "@/components/dashboard/shell";
import { requireVendor } from "@/lib/auth/guards";
import { listCategories } from "@/lib/data/catalog";

export const metadata: Metadata = { title: "New product" };

export default async function NewProductPage() {
  await requireVendor();
  const categories = await listCategories();
  return (
    <>
      <Link href="/vendor/products" className="inline-flex items-center gap-1 text-[14px] font-medium text-subtle transition-colors hover:text-fg">← Products</Link>
      <div className="mt-3"><PageHeader eyebrow="It goes live as soon as you publish" title="New product" /></div>
      <ProductForm categories={categories} />
    </>
  );
}
