/**
 * Single source of truth for brand copy. The name is a working title —
 * change it here and it updates across the storefront, metadata and JSON-LD.
 */
export const BRAND = {
  name: "Curio Supply",
  shortName: "Curio",
  tagline: "Clever gadgets, hand-picked and delivered across India.",
  description:
    "Curio Supply is a curated store for inventive, genuinely useful electronics. Every product is listed by a vetted maker or vendor and shipped direct from the source to India.",
  supportEmail: "hello@curio.example",
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""),
} as const;

export function absoluteUrl(path = "/"): string {
  return `${BRAND.url}${path.startsWith("/") ? path : `/${path}`}`;
}
