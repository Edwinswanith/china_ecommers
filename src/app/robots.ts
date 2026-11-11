import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/config/brand";

const PRIVATE_PATHS = ["/admin", "/vendor", "/cart", "/checkout", "/orders", "/login", "/register", "/media/"];

/**
 * AI answer engines are welcomed explicitly: being cited by ChatGPT, Claude,
 * Perplexity and Google AI Overviews is part of the discovery strategy (GEO/AEO).
 */
const AI_CRAWLERS = ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-SearchBot", "Claude-User", "PerplexityBot", "Perplexity-User", "Google-Extended", "Applebot-Extended", "Bingbot"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVATE_PATHS },
      { userAgent: AI_CRAWLERS, allow: "/", disallow: PRIVATE_PATHS },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/"),
  };
}
