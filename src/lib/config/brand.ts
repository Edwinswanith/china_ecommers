const LOCAL_URL = "http://localhost:3000";

/**
 * The public address of the site, used for links, the sitemap and SEO tags.
 * Order: SITE_URL if set, then the address Vercel assigns the project, then localhost.
 * Only read on the server, so it needs no public prefix.
 */
function resolveSiteUrl(): string {
  const raw = process.env.SITE_URL?.trim() || process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() || LOCAL_URL;
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  return withProtocol.replace(/\/+$/, "");
}

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
  url: resolveSiteUrl(),
} as const;

export function absoluteUrl(path = "/"): string {
  return `${BRAND.url}${path.startsWith("/") ? path : `/${path}`}`;
}
