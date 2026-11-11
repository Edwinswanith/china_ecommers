import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CatalogueView, parseSort } from "@/components/catalogue-view";
import { JsonLd } from "@/components/json-ld";
import { getCategoryBySlug, listCategories, listProducts } from "@/lib/data/catalog";
import { breadcrumbLd, itemListLd } from "@/lib/seo/structured-data";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ q?: string; sort?: string }>;
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const [{ slug }, { q, sort }] = await Promise.all([params, searchParams]);
  const category = await getCategoryBySlug(slug);
  if (!category) return {};
  return {
    title: `${category.name} — inventive electronics`,
    description: `${category.blurb} Hand-picked ${category.name.toLowerCase()} gadgets, shipped to India direct from the vendor.`,
    alternates: { canonical: `/collections/${category.slug}` },
    robots: q || sort ? { index: false, follow: true } : undefined,
  };
}

export default async function CollectionPage({ params, searchParams }: PageProps) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const category = await getCategoryBySlug(slug);
  if (!category) notFound();
  const sort = parseSort(query.sort);
  const q = query.q?.trim().slice(0, 80) || undefined;
  const [products, categories] = await Promise.all([listProducts({ categorySlug: slug, sort, query: q }), listCategories()]);
  const path = `/collections/${category.slug}`;
  return (
    <>
      <JsonLd
        data={[
          breadcrumbLd([{ name: "Home", path: "/" }, { name: "All products", path: "/products" }, { name: category.name, path }]),
          itemListLd(category.name, products),
        ]}
      />
      <CatalogueView
        title={category.name}
        intro={category.blurb}
        products={products}
        categories={categories}
        activeCategory={category.slug}
        sort={sort}
        query={q}
        basePath={path}
      />
    </>
  );
}
