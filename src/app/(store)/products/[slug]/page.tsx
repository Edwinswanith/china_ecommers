import { Check, ChevronRight, type LucideIcon, MapPin, PackageCheck, Store, Truck } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCart } from "@/components/cart/add-to-cart";
import { FaqList } from "@/components/faq-list";
import { JsonLd } from "@/components/json-ld";
import { ProductCard } from "@/components/product-card";
import { ProductGallery } from "@/components/product-gallery";
import { ProductReviews } from "@/components/product-reviews";
import { RatingSummary } from "@/components/rating";
import { absoluteUrl } from "@/lib/config/brand";
import { countryName } from "@/lib/config/markets";
import { getProductBySlug, listRelatedProducts, listReviews } from "@/lib/data/catalog";
import { formatMoney } from "@/lib/domain/money";
import { breadcrumbLd, faqLd, productLd } from "@/lib/seo/structured-data";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const product = await getProductBySlug((await params).slug);
  if (!product) return { title: "Product not found", robots: { index: false } };
  const description = `${product.tagline} ${formatMoney(product.priceMinor, product.currency)}, ships to India from ${product.vendor.city}, ${countryName(product.vendor.countryCode)}.`;
  const path = `/products/${product.slug}`;
  return {
    title: `${product.name} — ${product.tagline}`,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      url: absoluteUrl(path),
      title: product.name,
      description,
      images: product.images.slice(0, 1).map((src) => ({ url: absoluteUrl(src), alt: product.name })),
    },
  };
}

export default async function ProductPage({ params }: PageProps) {
  const product = await getProductBySlug((await params).slug);
  if (!product) notFound();
  const [reviews, related] = await Promise.all([listReviews(product.id), listRelatedProducts(product, 4)]);
  const origin = `${product.vendor.city}, ${countryName(product.vendor.countryCode)}`;
  const faqs = product.faqs.map((f) => ({ q: f.q, a: f.a }));
  const facts: ReadonlyArray<{ icon: LucideIcon; term: string; value: string }> = [
    { icon: Truck, term: "Ships from", value: origin },
    { icon: MapPin, term: "Delivers to", value: "Anywhere in India" },
    { icon: Store, term: "Sold by", value: product.vendor.name },
    { icon: PackageCheck, term: "Availability", value: product.stock > 0 ? "In stock, ready to ship" : "Currently out of stock" },
  ];

  return (
    <>
      <JsonLd
        data={[
          productLd(product, reviews),
          breadcrumbLd([
            { name: "Home", path: "/" },
            { name: product.category.name, path: `/collections/${product.category.slug}` },
            { name: product.name, path: `/products/${product.slug}` },
          ]),
          ...(faqs.length > 0 ? [faqLd(faqs)] : []),
        ]}
      />
      <div className="shell py-6 md:py-8">
        <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-1.5 text-[13.5px] text-subtle">
          <Link href="/" className="hover:text-fg">Home</Link>
          <ChevronRight size={14} aria-hidden="true" />
          <Link href={`/collections/${product.category.slug}`} className="hover:text-fg">{product.category.name}</Link>
          <ChevronRight size={14} aria-hidden="true" />
          <span className="text-fg" aria-current="page">{product.name}</span>
        </nav>

        <article className="grid gap-8 lg:grid-cols-2 lg:gap-14">
          <ProductGallery images={product.images} name={product.name} />

          <div>
            <p className="text-[14px] font-medium text-brand">{product.category.name}</p>
            <h1 className="display mt-1.5 text-3xl md:text-[2.4rem]">{product.name}</h1>
            <p className="mt-3 text-[17px] leading-relaxed text-subtle">{product.tagline}</p>
            <a href="#reviews" className="mt-4 inline-block rounded-md transition-opacity hover:opacity-75">
              <RatingSummary ratingSum={product.ratingSum} ratingCount={product.ratingCount} />
            </a>

            <div className="mt-6 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="num text-[2rem] font-bold tracking-tight">{formatMoney(product.priceMinor, product.currency)}</span>
              {product.compareAtMinor ? (
                <>
                  <span className="num text-[17px] text-subtle line-through">{formatMoney(product.compareAtMinor, product.currency)}</span>
                  <span className="num rounded-full bg-sale/10 px-2.5 py-1 text-[13px] font-bold text-sale">
                    Save {Math.round((1 - product.priceMinor / product.compareAtMinor) * 100)}%
                  </span>
                </>
              ) : null}
            </div>
            <p className="mt-1 text-[13.5px] text-subtle">
              Price in Indian rupees. <Link href="/policies/shipping" className="underline underline-offset-2 hover:text-fg">Shipping and duties</Link>
            </p>

            <div className="mt-6">
              <AddToCart productId={product.id} stock={product.stock} name={product.name} priceLabel={formatMoney(product.priceMinor, product.currency)} />
            </div>

            <ul className="mt-6 divide-y divide-line rounded-2xl border border-line">
              {facts.map(({ icon: Icon, term, value }) => (
                <li key={term} className="flex items-center gap-3.5 px-4 py-3.5">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-muted text-fg"><Icon size={19} aria-hidden="true" /></span>
                  <span>
                    <span className="block text-[13px] text-subtle">{term}</span>
                    <span className="block text-[14.5px] font-semibold">{value}</span>
                  </span>
                </li>
              ))}
            </ul>

            <section className="mt-10" aria-labelledby="about-heading">
              <h2 id="about-heading" className="text-[19px] font-bold tracking-tight">About this product</h2>
              <p className="mt-3 text-[16px] leading-relaxed text-subtle">{product.description}</p>
              {product.highlights.length > 0 ? (
                <ul className="mt-5 space-y-2.5">
                  {product.highlights.map((highlight) => (
                    <li key={highlight} className="flex gap-3 text-[15.5px]">
                      <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-ok-soft text-ok"><Check size={13} strokeWidth={3} aria-hidden="true" /></span>
                      {highlight}
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>

            {product.specs.length > 0 ? (
              <section className="mt-10" aria-labelledby="specs-heading">
                <h2 id="specs-heading" className="text-[19px] font-bold tracking-tight">Specifications</h2>
                <table className="mt-4 w-full overflow-hidden rounded-2xl border border-line text-[15px]">
                  <tbody className="divide-y divide-line">
                    {product.specs.map((spec, index) => (
                      <tr key={spec.label} className={index % 2 === 0 ? "bg-muted/60" : "bg-white"}>
                        <th scope="row" className="w-2/5 px-4 py-3 text-left align-top font-medium text-subtle">{spec.label}</th>
                        <td className="num px-4 py-3 font-medium">{spec.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            ) : null}
          </div>
        </article>

        {faqs.length > 0 ? (
          <section className="mx-auto mt-16 max-w-3xl" aria-labelledby="product-faq-heading">
            <h2 id="product-faq-heading" className="display mb-6 text-center text-2xl md:text-[1.9rem]">Common questions</h2>
            <FaqList faqs={faqs} />
          </section>
        ) : null}

        <div className="mt-16">
          <ProductReviews product={product} reviews={reviews} />
        </div>

        {related.length > 0 ? (
          <section className="mt-16" aria-labelledby="related-heading">
            <h2 id="related-heading" className="display mb-6 text-2xl md:text-[1.9rem]">You may also like</h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((item, index) => (
                <Reveal key={item.id} delay={index * 70} className="h-full"><ProductCard product={item} /></Reveal>
              ))}
            </div>
          </section>
        ) : null}
        {/* Leaves room for the buy bar that sits at the bottom of the screen on phones. */}
        <div className="h-16 lg:hidden" aria-hidden="true" />
      </div>
    </>
  );
}
