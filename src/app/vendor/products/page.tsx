import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard/shell";
import { ProductImage } from "@/components/product-image";
import { Badge } from "@/components/status-badge";
import { archiveProductAction } from "@/lib/actions/vendor-products";
import { requireVendor } from "@/lib/auth/guards";
import { listVendorProducts, LOW_STOCK_THRESHOLD } from "@/lib/data/vendor";
import { formatMoney } from "@/lib/domain/money";

export const metadata: Metadata = { title: "Products" };

interface PageProps {
  searchParams: Promise<{ saved?: string }>;
}

export default async function VendorProductsPage({ searchParams }: PageProps) {
  const { vendor } = await requireVendor();
  const [{ saved }, products] = await Promise.all([searchParams, listVendorProducts(vendor.id)]);
  return (
    <>
      <PageHeader eyebrow="Everything you have listed on the store" title="Products" action={<Link href="/vendor/products/new" className="btn btn-primary">Add product</Link>} />
      {saved ? <p role="status" className="animate-fade mb-5 rounded-xl bg-ok-soft px-4 py-3 text-[14px] font-medium text-ok">Product saved.</p> : null}
      {products.length === 0 ? (
        <div className="rounded-2xl bg-white px-6 py-16 text-center shadow-[var(--shadow-card)]">
          <p className="text-xl font-semibold tracking-tight">List your first product.</p>
          <p className="mt-2 text-subtle">It goes live on the store as soon as you publish it.</p>
          <Link href="/vendor/products/new" className="btn btn-primary mt-6">Add product</Link>
        </div>
      ) : (
        <div className="panel overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th className="text-right">Price</th>
                <th className="text-right">Stock</th>
                <th>Status</th>
                <th><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-11 shrink-0 overflow-hidden rounded-lg"><ProductImage src={product.images[0]} alt="" sizes="44px" /></div>
                      <span className="font-medium">{product.name}</span>
                    </div>
                  </td>
                  <td className="num text-subtle">{product.sku}</td>
                  <td className="num text-right">{formatMoney(product.priceMinor, product.currency)}</td>
                  <td className={`num text-right ${product.stock <= LOW_STOCK_THRESHOLD ? "font-bold text-amber-700" : ""}`}>{product.stock}</td>
                  <td>{product.status === "active" ? <Badge tone="ok">Live</Badge> : <Badge tone="neutral">Draft</Badge>}</td>
                  <td>
                    <div className="flex justify-end gap-2">
                      {product.status === "active" ? <Link href={`/products/${product.slug}`} className="btn btn-ghost btn-sm">View</Link> : null}
                      <Link href={`/vendor/products/${product.id}`} className="btn btn-ghost btn-sm">Edit</Link>
                      <form action={archiveProductAction}>
                        <input type="hidden" name="productId" value={product.id} />
                        <button type="submit" className="btn btn-ghost btn-sm" aria-label={`Remove ${product.name}`}>Remove</button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
