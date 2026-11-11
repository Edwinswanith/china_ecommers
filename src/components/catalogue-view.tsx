import { ChevronRight, SearchX } from "lucide-react";
import Link from "next/link";
import type { ProductListing, ProductSort } from "@/lib/data/catalog";
import type { Category } from "@/lib/db/schema";
import { ProductCard } from "./product-card";
import { SortSelect } from "./sort-select";

export const SORT_OPTIONS: ReadonlyArray<{ value: ProductSort; label: string }> = [
  { value: "newest", label: "Newest first" },
  { value: "rating", label: "Top rated" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
];

export function parseSort(value: string | undefined): ProductSort {
  return SORT_OPTIONS.find((o) => o.value === value)?.value ?? "newest";
}

interface CatalogueViewProps {
  title: string;
  intro: string;
  products: readonly ProductListing[];
  categories: readonly Category[];
  activeCategory?: string;
  sort: ProductSort;
  query?: string;
  /** Path the sort control submits to. */
  basePath: string;
}

export function CatalogueView({ title, intro, products, categories, activeCategory, sort, query, basePath }: CatalogueViewProps) {
  return (
    <div className="shell py-8 md:py-10">
      <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1.5 text-[13.5px] text-subtle">
        <Link href="/" className="hover:text-fg">Home</Link>
        <ChevronRight size={14} aria-hidden="true" />
        {activeCategory ? (
          <>
            <Link href="/products" className="hover:text-fg">All products</Link>
            <ChevronRight size={14} aria-hidden="true" />
            <span className="text-fg" aria-current="page">{title}</span>
          </>
        ) : (
          <span className="text-fg" aria-current="page">All products</span>
        )}
      </nav>

      <header>
        <h1 className="display text-3xl md:text-4xl">{query ? `Results for “${query}”` : title}</h1>
        <p className="mt-2 max-w-2xl text-[16px] text-subtle">{intro}</p>
      </header>

      <div className="mt-6 flex flex-col gap-4 border-y border-line py-4 lg:flex-row lg:items-center lg:justify-between">
        <nav aria-label="Categories" className="flex flex-wrap gap-2">
          <Link href="/products" className={`chip ${!activeCategory ? "chip-active" : ""}`} aria-current={!activeCategory ? "page" : undefined}>All</Link>
          {categories.map((c) => (
            <Link key={c.id} href={`/collections/${c.slug}`} className={`chip ${activeCategory === c.slug ? "chip-active" : ""}`} aria-current={activeCategory === c.slug ? "page" : undefined}>
              {c.name}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-4">
          <p className="num text-[14px] text-subtle" role="status">
            {products.length} {products.length === 1 ? "product" : "products"}
          </p>
          <SortSelect basePath={basePath} sort={sort} query={query} options={SORT_OPTIONS} />
        </div>
      </div>

      {products.length === 0 ? (
        <div className="mt-8 rounded-2xl bg-muted px-6 py-16 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-white text-subtle shadow-sm"><SearchX size={24} aria-hidden="true" /></span>
          <p className="mt-4 text-xl font-semibold tracking-tight">No products found</p>
          <p className="mt-1.5 text-subtle">{query ? "Try a different word, or browse everything we have." : "New products are added every week."}</p>
          <Link href="/products" className="btn btn-primary mt-6">Browse all products</Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((product, index) => (
            <ProductCard key={product.id} product={product} priority={index < 4} />
          ))}
        </div>
      )}
    </div>
  );
}
