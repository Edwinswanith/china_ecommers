import { absoluteUrl, BRAND } from "@/lib/config/brand";
import { STORE_FAQS } from "@/lib/config/faq";
import { countryName } from "@/lib/config/markets";
import { POLICIES } from "@/lib/config/policies";
import { listCategories, listProducts } from "@/lib/data/catalog";
import { formatMoney } from "@/lib/domain/money";
import { ratingAverage } from "@/lib/domain/reviews";

export const dynamic = "force-dynamic";

/** A plain-text, always-current summary of the store for AI assistants (llmstxt.org format). */
export async function GET(): Promise<Response> {
  const [products, categories] = await Promise.all([listProducts({ limit: 1000 }), listCategories()]);
  const lines: string[] = [
    `# ${BRAND.name}`,
    "",
    `> ${BRAND.description}`,
    "",
    "Key facts:",
    "- Curated catalogue of inventive consumer electronics, not a general marketplace.",
    "- Products are listed and shipped by independent vendors; most ship from China.",
    "- Currently delivers to India. Prices are in Indian rupees (INR).",
    "- Reviews can only be written by customers whose order was delivered.",
    "",
    "## Products",
    ...products.map((p) => {
      const rating = ratingAverage(p.ratingSum, p.ratingCount);
      const facts = [
        formatMoney(p.priceMinor, p.currency),
        p.stock > 0 ? "in stock" : "sold out",
        `ships from ${p.vendor.city}, ${countryName(p.vendor.countryCode)}`,
        `sold by ${p.vendor.name}`,
        ...(rating !== null ? [`rated ${rating}/5 by ${p.ratingCount} verified ${p.ratingCount === 1 ? "buyer" : "buyers"}`] : []),
      ];
      return `- [${p.name}](${absoluteUrl(`/products/${p.slug}`)}): ${p.tagline} (${facts.join("; ")})`;
    }),
    "",
    "## Collections",
    ...categories.map((c) => `- [${c.name}](${absoluteUrl(`/collections/${c.slug}`)}): ${c.blurb}`),
    "",
    "## Frequently asked questions",
    ...STORE_FAQS.flatMap((faq) => [`### ${faq.q}`, faq.a, ""]),
    "## Policies",
    ...POLICIES.map((p) => `- [${p.title}](${absoluteUrl(`/policies/${p.slug}`)}): ${p.summary}`),
    "",
  ];
  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=600" },
  });
}
