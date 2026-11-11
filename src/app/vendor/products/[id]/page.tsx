import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ProductForm } from "@/components/dashboard/product-form";
import { PageHeader } from "@/components/dashboard/shell";
import { requireVendor } from "@/lib/auth/guards";
import { listCategories } from "@/lib/data/catalog";
import { getVendorProduct } from "@/lib/data/vendor";

export const metadata: Metadata = { title: "Edit product" };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditProductPage({ params }: PageProps) {
  const { vendor } = await requireVendor();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const [product, categories] = await Promise.all([getVendorProduct(id, vendor.id), listCategories()]);
  if (!product || product.status === "archived") notFound();
  return (
    <>
      <Link href="/vendor/products" className="inline-flex items-center gap-1 text-[14px] font-medium text-subtle transition-colors hover:text-fg">← Products</Link>
      <div className="mt-3"><PageHeader eyebrow="Edit product" title={product.name} /></div>
      <ProductForm categories={categories} product={product} />
    </>
  );
}
