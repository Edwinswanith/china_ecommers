import { BadgeCheck, Lock, Truck } from "lucide-react";
import Link from "next/link";
import { BRAND } from "@/lib/config/brand";
import { POLICIES } from "@/lib/config/policies";
import { listCategories } from "@/lib/data/catalog";
import { Wordmark } from "./site-header";

const linkClass = "text-white/70 transition-colors hover:text-white";

export async function SiteFooter() {
  const categories = await listCategories();
  return (
    <footer className="mt-20 bg-fg text-white">
      <div className="shell grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div>
          <Wordmark light />
          <p className="mt-4 max-w-xs text-[15px] leading-relaxed text-white/70">{BRAND.tagline}</p>
          <ul className="mt-6 space-y-2.5 text-[14px] text-white/70">
            <li className="flex items-center gap-2.5"><Truck size={16} aria-hidden="true" /> Delivery across India</li>
            <li className="flex items-center gap-2.5"><BadgeCheck size={16} aria-hidden="true" /> Reviews from verified buyers only</li>
            <li className="flex items-center gap-2.5"><Lock size={16} aria-hidden="true" /> Secure checkout</li>
          </ul>
        </div>
        <div>
          <h2 className="text-[14px] font-semibold">Shop</h2>
          <ul className="mt-4 space-y-2.5 text-[14.5px]">
            <li><Link href="/products" className={linkClass}>All products</Link></li>
            {categories.map((c) => (
              <li key={c.id}><Link href={`/collections/${c.slug}`} className={linkClass}>{c.name}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="text-[14px] font-semibold">Help</h2>
          <ul className="mt-4 space-y-2.5 text-[14.5px]">
            <li><Link href="/orders" className={linkClass}>Track your order</Link></li>
            {POLICIES.map((p) => (
              <li key={p.slug}><Link href={`/policies/${p.slug}`} className={linkClass}>{p.title}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="text-[14px] font-semibold">Sell with us</h2>
          <ul className="mt-4 space-y-2.5 text-[14.5px]">
            <li><Link href="/sell" className={linkClass}>Become a vendor</Link></li>
            <li><Link href="/login?next=/vendor" className={linkClass}>Vendor sign in</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="shell flex flex-wrap items-center justify-between gap-3 py-5 text-[13px] text-white/55">
          <span>© {new Date().getFullYear()} {BRAND.name}. All rights reserved.</span>
          <span>Prices in Indian rupees (₹)</span>
        </div>
      </div>
    </footer>
  );
}
