import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/guards";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard/shell";
import { ProductImage } from "@/components/product-image";
import { Badge } from "@/components/status-badge";
import { setProductStatusAction } from "@/lib/actions/admin";
import { listAllProducts } from "@/lib/data/admin";
import { formatMoney } from "@/lib/domain/money";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Products" };

export default async function AdminProductsPage() {
  await requireAdmin();
  const products = await listAllProducts();
  const live = products.filter((p) => p.status === "active").length;
  return (
    <>
      <PageHeader eyebrow={`${live} live · ${products.length} total`} title="Products" />
      <div className="panel overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Vendor</th>
              <th>Collection</th>
              <th>Listed</th>
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
                    <div className="w-11 shrink-0 overflow-hidden rounded-lg"><ProductImage src={product.image} alt="" sizes="44px" /></div>
                    {product.status === "active" ? (
                      <Link href={`/products/${product.slug}`} className="font-medium underline-offset-4 hover:underline">{product.name}</Link>
                    ) : (
                      <span className="font-medium">{product.name}</span>
                    )}
                  </div>
                </td>
                <td>{product.vendorName}</td>
                <td className="text-subtle">{product.categoryName}</td>
                <td className="whitespace-nowrap text-subtle">{formatDate(product.createdAt)}</td>
                <td className="num text-right">{formatMoney(product.priceMinor, product.currency)}</td>
                <td className="num text-right">{product.stock}</td>
                <td>
                  {product.status === "active" ? <Badge tone="ok">Live</Badge> : product.status === "draft" ? <Badge tone="neutral">Draft</Badge> : <Badge tone="muted">Removed</Badge>}
                </td>
                <td className="text-right">
                  {product.status === "draft" ? null : (
                    <form action={setProductStatusAction}>
                      <input type="hidden" name="productId" value={product.id} />
                      <input type="hidden" name="status" value={product.status === "active" ? "archived" : "active"} />
                      <button type="submit" className="btn btn-ghost btn-sm">{product.status === "active" ? "Take down" : "Restore"}</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 max-w-2xl text-[14px] text-subtle">Vendor products go live without approval. Use “Take down” to remove a listing that should not be on the store.</p>
    </>
  );
}
