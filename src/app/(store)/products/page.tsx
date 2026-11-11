import type { Metadata } from "next";
import { CatalogueView, parseSort } from "@/components/catalogue-view";
import { JsonLd } from "@/components/json-ld";
import { BRAND } from "@/lib/config/brand";
import { listCategories, listProducts } from "@/lib/data/catalog";
import { breadcrumbLd, itemListLd } from "@/lib/seo/structured-data";

interface PageProps {
  searchParams: Promise<{ q?: string; sort?: string }>;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const { q, sort } = await searchParams;
  return {
    title: "All products — clever gadgets and inventive electronics",
    description: `Browse every product in the ${BRAND.name} catalogue: inventive, hand-picked electronics shipped to India directly from the vendor.`,
    alternates: { canonical: "/products" },
    // Search and sort variations are the same content; keep them out of the index.
    robots: q || sort ? { index: false, follow: true } : undefined,
  };
}

export default async function ProductsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const sort = parseSort(params.sort);
  const query = params.q?.trim().slice(0, 80) || undefined;
  const [products, categories] = await Promise.all([listProducts({ sort, query }), listCategories()]);
  return (
    <>
      <JsonLd data={[breadcrumbLd([{ name: "Home", path: "/" }, { name: "All products", path: "/products" }]), itemListLd("All products", products)]} />
      <CatalogueView
        title="All products"
        intro="Every product here is hand-picked, sold by its maker and delivered across India."
        products={products}
        categories={categories}
        sort={sort}
        query={query}
        basePath="/products"
      />
    </>
  );
}
