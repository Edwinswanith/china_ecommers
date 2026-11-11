import { absoluteUrl, BRAND } from "@/lib/config/brand";
import { countryName } from "@/lib/config/markets";
import type { Faq } from "@/lib/config/faq";
import type { ProductListing, PublicReview } from "@/lib/data/catalog";
import { ratingAverage } from "@/lib/domain/reviews";

type Ld = Record<string, unknown>;

const price = (minor: number): string => (minor / 100).toFixed(2);

export function organizationLd(): Ld {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": absoluteUrl("/#organization"),
    name: BRAND.name,
    url: BRAND.url,
    description: BRAND.description,
    email: BRAND.supportEmail,
    areaServed: { "@type": "Country", name: "India" },
  };
}

export function websiteLd(): Ld {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": absoluteUrl("/#website"),
    name: BRAND.name,
    url: BRAND.url,
    inLanguage: "en-IN",
    publisher: { "@id": absoluteUrl("/#organization") },
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${absoluteUrl("/products")}?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
}

export function breadcrumbLd(trail: ReadonlyArray<{ name: string; path: string }>): Ld {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((item, index) => ({ "@type": "ListItem", position: index + 1, name: item.name, item: absoluteUrl(item.path) })),
  };
}

export function faqLd(faqs: readonly Faq[]): Ld {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({ "@type": "Question", name: faq.q, acceptedAnswer: { "@type": "Answer", text: faq.a } })),
  };
}

export function itemListLd(name: string, products: readonly ProductListing[]): Ld {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    numberOfItems: products.length,
    itemListElement: products.map((p, index) => ({ "@type": "ListItem", position: index + 1, name: p.name, url: absoluteUrl(`/products/${p.slug}`) })),
  };
}

export function productLd(product: ProductListing, reviews: readonly PublicReview[]): Ld {
  const average = ratingAverage(product.ratingSum, product.ratingCount);
  const url = absoluteUrl(`/products/${product.slug}`);
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${url}#product`,
    name: product.name,
    description: product.description,
    sku: product.sku,
    category: product.category.name,
    image: product.images.map((src) => absoluteUrl(src)),
    brand: { "@type": "Brand", name: product.vendor.name },
    countryOfOrigin: { "@type": "Country", name: countryName(product.originCountry) },
    weight: { "@type": "QuantitativeValue", value: product.weightGrams, unitCode: "GRM" },
    additionalProperty: product.specs.map((spec) => ({ "@type": "PropertyValue", name: spec.label, value: spec.value })),
    offers: {
      "@type": "Offer",
      url,
      price: price(product.priceMinor),
      priceCurrency: product.currency,
      availability: product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@type": "Organization", name: product.vendor.name },
      shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingDestination: { "@type": "DefinedRegion", addressCountry: "IN" },
        shippingOrigin: { "@type": "DefinedRegion", addressCountry: product.vendor.countryCode },
      },
    },
    ...(average !== null
      ? { aggregateRating: { "@type": "AggregateRating", ratingValue: average, reviewCount: product.ratingCount, bestRating: 5, worstRating: 1 } }
      : {}),
    ...(reviews.length > 0
      ? {
          review: reviews.slice(0, 10).map((r) => ({
            "@type": "Review",
            name: r.title,
            reviewBody: r.body,
            datePublished: r.createdAt.toISOString().slice(0, 10),
            author: { "@type": "Person", name: r.authorName },
            reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5, worstRating: 1 },
          })),
        }
      : {}),
  };
}
