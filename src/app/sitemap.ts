import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/config/brand";
import { POLICIES } from "@/lib/config/policies";
import { listCategories, listProducts } from "@/lib/data/catalog";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories] = await Promise.all([listProducts({ limit: 5000 }), listCategories()]);
  return [
    { url: absoluteUrl("/"), changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl("/products"), changeFrequency: "daily", priority: 0.9 },
    ...categories.map((c) => ({ url: absoluteUrl(`/collections/${c.slug}`), changeFrequency: "weekly" as const, priority: 0.7 })),
    ...products.map((p) => ({
      url: absoluteUrl(`/products/${p.slug}`),
      lastModified: p.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
      images: p.images.map((src) => absoluteUrl(src)),
    })),
    { url: absoluteUrl("/sell"), changeFrequency: "monthly", priority: 0.4 },
    ...POLICIES.map((p) => ({ url: absoluteUrl(`/policies/${p.slug}`), changeFrequency: "monthly" as const, priority: 0.3 })),
  ];
}
