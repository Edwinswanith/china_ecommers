import { ArrowRight, BadgeCheck, Headphones, Lamp, Lock, type LucideIcon, Monitor, PackageCheck, Plane, Sparkles, Store, Truck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { FaqList } from "@/components/faq-list";
import { JsonLd } from "@/components/json-ld";
import { ProductCard } from "@/components/product-card";
import { ProductImage } from "@/components/product-image";
import { RatingSummary } from "@/components/rating";
import { Reveal } from "@/components/ui/reveal";
import { BRAND } from "@/lib/config/brand";
import { STORE_FAQS } from "@/lib/config/faq";
import { countryName } from "@/lib/config/markets";
import { listCategories, listProducts } from "@/lib/data/catalog";
import { formatMoney } from "@/lib/domain/money";
import { faqLd, itemListLd, organizationLd, websiteLd } from "@/lib/seo/structured-data";

export const metadata: Metadata = { alternates: { canonical: "/" } };

const PROMISES: ReadonlyArray<{ icon: LucideIcon; title: string; text: string }> = [
  { icon: Truck, title: "Delivered across India", text: "Shipped direct from the maker" },
  { icon: BadgeCheck, title: "Verified reviews", text: "Only from people who bought it" },
  { icon: Lock, title: "Secure checkout", text: "Your details stay protected" },
  { icon: Sparkles, title: "Hand-picked", text: "A short list of genuinely clever products" },
];

const STEPS: ReadonlyArray<{ icon: LucideIcon; title: string; text: string }> = [
  { icon: Store, title: "Makers list their products", text: "Each product is added by the vendor who makes or supplies it, with full details and specifications." },
  { icon: PackageCheck, title: "Your order ships from the source", text: "The vendor packs your order and sends it straight to your address. You can follow every step." },
  { icon: BadgeCheck, title: "Real buyers leave reviews", text: "Only customers whose order was delivered can review a product, so you can trust what you read." },
];

const CATEGORY_ICONS: Readonly<Record<string, LucideIcon>> = { desk: Monitor, carry: Plane, home: Lamp, audio: Headphones };

function SectionHeading({ id, title, intro, action }: { id: string; title: string; intro?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h2 id={id} className="display text-2xl md:text-[1.9rem]">{title}</h2>
        {intro ? <p className="mt-1.5 text-[16px] text-subtle">{intro}</p> : null}
      </div>
      {action}
    </div>
  );
}

export default async function HomePage() {
  const [products, categories] = await Promise.all([listProducts({ sort: "newest" }), listCategories()]);
  const featured = [...products].sort((a, b) => b.ratingCount - a.ratingCount)[0] ?? null;
  const grid = products.slice(0, 8);

  return (
    <>
      <JsonLd data={[organizationLd(), websiteLd(), faqLd(STORE_FAQS), itemListLd("Popular products", grid)]} />

      <section className="bg-gradient-to-b from-brand-soft to-white">
        <div className="shell grid items-center gap-10 hero-inner py-12 md:py-16 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
          <div>
            <p className="animate-rise inline-flex items-center gap-2 rounded-full border border-brand/20 bg-white px-3.5 py-1.5 text-[13.5px] font-medium text-brand-dark shadow-sm">
              <span className="relative flex h-2 w-2" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-brand" />
              </span>
              New arrivals every week
            </p>
            <h1 className="display animate-rise mt-5 text-[2.5rem] leading-[1.08] [animation-delay:60ms] hero-title md:text-[3.5rem]">
              Clever gadgets you didn’t know you needed.
            </h1>
            <p className="animate-rise mt-5 max-w-lg text-[17.5px] leading-relaxed text-subtle [animation-delay:120ms]">
              {BRAND.shortName} brings you a hand-picked range of inventive electronics, sold by the people who make them and delivered to your door anywhere in India.
            </p>
            <div className="hero-actions animate-rise mt-8 flex flex-wrap gap-3 [animation-delay:180ms]">
              <Link href="/products" className="btn btn-primary btn-lg">Shop all products <ArrowRight size={18} aria-hidden="true" /></Link>
              <Link href="#how-it-works" className="btn btn-ghost btn-lg">How it works</Link>
            </div>
            <ul className="animate-rise mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[14px] text-subtle [animation-delay:240ms]">
              <li className="flex items-center gap-2"><BadgeCheck size={17} className="text-ok" aria-hidden="true" /> Verified buyer reviews</li>
              <li className="flex items-center gap-2"><Lock size={16} className="text-ok" aria-hidden="true" /> Secure checkout</li>
              <li className="flex items-center gap-2"><Truck size={17} className="text-ok" aria-hidden="true" /> Delivery across India</li>
            </ul>
          </div>

          {featured ? (
            <Link
              href={`/products/${featured.slug}`}
              className="lift animate-rise group mx-auto block w-full hero-card max-w-md overflow-hidden rounded-3xl border border-line bg-white shadow-[var(--shadow-lift)] [animation-delay:150ms]"
              aria-label={`Featured: ${featured.name}`}
            >
              <div className="relative overflow-hidden">
                <ProductImage src={featured.images[0]} alt={featured.name} priority sizes="(min-width: 1024px) 40vw, 90vw" className="transition-transform duration-700 ease-out group-hover:scale-[1.04]" />
                <span className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1 text-[12.5px] font-semibold shadow-sm">Customer favourite</span>
              </div>
              <div className="flex items-center justify-between gap-4 p-5">
                <div>
                  <p className="text-[17px] font-semibold tracking-tight">{featured.name}</p>
                  <div className="mt-1"><RatingSummary ratingSum={featured.ratingSum} ratingCount={featured.ratingCount} compact /></div>
                  <p className="mt-1 text-[13px] text-subtle">Ships from {countryName(featured.vendor.countryCode)}</p>
                </div>
                <div className="text-right">
                  <p className="num text-xl font-bold tracking-tight">{formatMoney(featured.priceMinor, featured.currency)}</p>
                  <p className="mt-1 flex items-center justify-end gap-1 text-[13.5px] font-semibold text-brand">
                    View <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" aria-hidden="true" />
                  </p>
                </div>
              </div>
            </Link>
          ) : null}
        </div>
      </section>

      <section className="shell" aria-label="Why shop with us">
        <ul className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {PROMISES.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex items-center gap-3.5 bg-white p-5">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand"><Icon size={21} aria-hidden="true" /></span>
              <span>
                <span className="block text-[14.5px] font-semibold">{title}</span>
                <span className="block text-[13.5px] text-subtle">{text}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="shell pt-16" aria-labelledby="categories-heading">
        <SectionHeading id="categories-heading" title="Shop by category" />
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((category, index) => {
            const Icon = CATEGORY_ICONS[category.slug] ?? Sparkles;
            return (
              <li key={category.id}>
                <Reveal delay={index * 70} className="h-full">
                <Link href={`/collections/${category.slug}`} className="lift group flex h-full flex-col rounded-2xl border border-line bg-white p-5">
                  <span className="grid h-12 w-12 place-items-center rounded-xl bg-muted text-fg transition-colors group-hover:bg-brand group-hover:text-white"><Icon size={22} aria-hidden="true" /></span>
                  <span className="mt-4 text-[16.5px] font-semibold tracking-tight">{category.name}</span>
                  <span className="mt-1 text-[14px] leading-snug text-subtle">{category.blurb}</span>
                  <span className="mt-4 flex items-center gap-1 text-[14px] font-semibold text-brand">
                    Browse <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" aria-hidden="true" />
                  </span>
                </Link>
                </Reveal>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="shell pt-16" aria-labelledby="popular-heading">
        <SectionHeading
          id="popular-heading"
          title="Popular right now"
          intro="Our latest and most-loved products."
          action={<Link href="/products" className="link flex items-center gap-1 text-[15px]">View all products <ArrowRight size={16} aria-hidden="true" /></Link>}
        />
        {grid.length === 0 ? (
          <p className="rounded-2xl bg-muted p-10 text-center text-subtle">The first products are being added right now. Please check back shortly.</p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {grid.map((product, index) => (
              <Reveal key={product.id} delay={(index % 4) * 70} className="h-full"><ProductCard product={product} priority={index < 4} /></Reveal>
            ))}
          </div>
        )}
      </section>

      <section id="how-it-works" className="mt-16 scroll-mt-32 bg-muted" aria-labelledby="how-heading">
        <div className="shell py-14 md:py-16">
          <div className="mx-auto max-w-2xl text-center">
            <h2 id="how-heading" className="display text-2xl md:text-[1.9rem]">How it works</h2>
            <p className="mt-2 text-[16px] text-subtle">Buying from makers in other countries, made simple.</p>
          </div>
          <ol className="mt-10 grid gap-5 md:grid-cols-3">
            {STEPS.map(({ icon: Icon, title, text }, index) => (
              <li key={title}>
                <Reveal delay={index * 110} className="h-full rounded-2xl border border-line bg-white p-6 shadow-[var(--shadow-card)]">
                <div className="flex items-center justify-between">
                  <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand text-white"><Icon size={22} aria-hidden="true" /></span>
                  <span className="num text-[13px] font-semibold text-subtle">Step {index + 1}</span>
                </div>
                <h3 className="mt-5 text-[17px] font-semibold tracking-tight">{title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-subtle">{text}</p>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="shell pt-16" aria-labelledby="faq-heading">
        <div className="mx-auto max-w-3xl">
          <div className="mb-8 text-center">
            <h2 id="faq-heading" className="display text-2xl md:text-[1.9rem]">Questions, answered</h2>
            <p className="mt-2 text-[16px] text-subtle">Everything you need to know before you buy.</p>
          </div>
          <Reveal><FaqList faqs={STORE_FAQS} /></Reveal>
        </div>
      </section>

      <section className="shell pt-16" aria-labelledby="sell-heading">
        <Reveal className="flex flex-col items-start justify-between gap-6 rounded-3xl bg-fg p-8 text-white md:flex-row md:items-center md:p-12">
          <div className="max-w-xl">
            <p className="flex items-center gap-2 text-[14px] font-medium text-white/70"><Store size={17} aria-hidden="true" /> For makers and vendors</p>
            <h2 id="sell-heading" className="display mt-3 text-2xl md:text-3xl">Have a product people will love? Sell it here.</h2>
            <p className="mt-3 text-[15.5px] leading-relaxed text-white/75">Open a vendor account, add your product and start receiving orders from customers across India.</p>
          </div>
          <Link href="/sell" className="btn btn-lg shrink-0 bg-white text-fg hover:bg-white/90">Become a vendor <ArrowRight size={18} aria-hidden="true" /></Link>
        </Reveal>
      </section>
    </>
  );
}
