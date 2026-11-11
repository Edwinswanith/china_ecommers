import { Truck } from "lucide-react";
import Link from "next/link";
import { countryName } from "@/lib/config/markets";
import type { ProductListing } from "@/lib/data/catalog";
import { formatMoney } from "@/lib/domain/money";
import { ProductImage } from "./product-image";
import { RatingSummary } from "./rating";

interface ProductCardProps {
  product: ProductListing;
  priority?: boolean;
}

export function ProductCard({ product, priority = false }: ProductCardProps) {
  const soldOut = product.stock <= 0;
  const discount = product.compareAtMinor ? Math.round((1 - product.priceMinor / product.compareAtMinor) * 100) : 0;
  return (
    <article className="group h-full">
      <Link
        href={`/products/${product.slug}`}
        className="lift flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-white"
        aria-label={`${product.name}, ${formatMoney(product.priceMinor, product.currency)}`}
      >
        <div className="relative overflow-hidden">
          <ProductImage src={product.images[0]} alt={product.name} priority={priority} className="transition-transform duration-500 ease-out group-hover:scale-[1.05]" />
          {soldOut ? (
            <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[12px] font-semibold text-fg shadow-sm">Out of stock</span>
          ) : discount > 0 ? (
            <span className="num absolute left-3 top-3 rounded-full bg-sale px-2.5 py-1 text-[12px] font-bold text-white">{discount}% off</span>
          ) : null}
        </div>
        <div className="flex flex-1 flex-col p-4">
          <p className="text-[12.5px] font-medium text-subtle">{product.category.name}</p>
          <h3 className="mt-1 text-[16px] font-semibold leading-snug tracking-tight transition-colors group-hover:text-brand">{product.name}</h3>
          <p className="mt-1.5 line-clamp-2 text-[14px] leading-snug text-subtle">{product.tagline}</p>
          <div className="mt-auto pt-4">
            <div className="flex items-baseline justify-between gap-2">
              <p className="flex items-baseline gap-2">
                <span className="num text-[19px] font-bold tracking-tight">{formatMoney(product.priceMinor, product.currency)}</span>
                {product.compareAtMinor ? <span className="num text-[13.5px] text-subtle line-through">{formatMoney(product.compareAtMinor, product.currency)}</span> : null}
              </p>
              <RatingSummary ratingSum={product.ratingSum} ratingCount={product.ratingCount} compact />
            </div>
            <p className="mt-3 flex items-center gap-1.5 border-t border-line pt-3 text-[12.5px] text-subtle">
              <Truck size={14} aria-hidden="true" /> Ships from {countryName(product.vendor.countryCode)}
            </p>
          </div>
        </div>
      </Link>
    </article>
  );
}
