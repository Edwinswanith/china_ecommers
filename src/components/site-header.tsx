import { Package, Search, Store, Truck, User } from "lucide-react";
import Link from "next/link";
import { logoutAction } from "@/lib/actions/auth";
import { homeForRole } from "@/lib/auth/paths";
import { getSession } from "@/lib/auth/session";
import { BRAND } from "@/lib/config/brand";
import { listCategories } from "@/lib/data/catalog";
import { CartLink } from "./cart/cart-link";

export function Wordmark({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className="group flex shrink-0 items-center gap-2.5" aria-label={`${BRAND.name} home`}>
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand transition-transform duration-200 group-hover:scale-105" aria-hidden="true">
        <svg viewBox="0 0 32 32" width="22" height="22">
          <path d="M21.5 11.5a7 7 0 1 0 0 9" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" />
        </svg>
      </span>
      <span className={`text-[1.35rem] font-extrabold tracking-tight ${light ? "text-white" : "text-fg"}`}>{BRAND.shortName}</span>
    </Link>
  );
}

const navAction = "flex items-center gap-2 rounded-lg px-2.5 py-2 text-[14px] font-medium text-fg transition-colors hover:bg-muted";

export async function SiteHeader() {
  const [session, categories] = await Promise.all([getSession(), listCategories()]);
  const account = session
    ? session.role === "customer"
      ? { href: "/orders", label: "My orders", icon: Package }
      : { href: homeForRole(session.role), label: session.role === "vendor" ? "Vendor portal" : "Admin", icon: Store }
    : { href: "/login", label: "Sign in", icon: User };
  const AccountIcon = account.icon;

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur">
      <div className="hidden bg-fg text-white sm:block">
        <div className="shell flex h-9 items-center justify-between text-[13px]">
          <p className="flex items-center gap-2 text-white/85">
            <Truck size={15} aria-hidden="true" /> Delivering across India, shipped direct from the maker
          </p>
          <Link href="/sell" className="font-medium text-white/85 transition-colors hover:text-white">Sell on {BRAND.shortName}</Link>
        </div>
      </div>

      <div className="shell flex h-16 items-center gap-4 md:gap-8">
        <Wordmark />

        <form action="/products" method="get" role="search" className="group relative hidden max-w-[520px] flex-1 transition-[max-width] duration-300 ease-out focus-within:max-w-[760px] md:block">
          <label htmlFor="header-search" className="sr-only">Search products</label>
          <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-subtle transition-colors group-focus-within:text-brand" aria-hidden="true" />
          <input
            id="header-search"
            type="search"
            name="q"
            maxLength={80}
            placeholder="Search for gadgets, e.g. projector, charger"
            className="h-11 w-full rounded-full border border-line bg-muted pl-11 pr-4 text-[15px] transition-all placeholder:text-subtle focus:border-brand focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand/15"
          />
        </form>

        <div className="ml-auto flex items-center gap-1">
          <Link href={account.href} className={navAction}>
            <AccountIcon size={19} aria-hidden="true" />
            <span className="hidden sm:inline">{account.label}</span>
          </Link>
          {session ? (
            <form action={logoutAction} className="hidden lg:block">
              <button type="submit" className={`${navAction} cursor-pointer text-subtle`}>Sign out</button>
            </form>
          ) : null}
          <CartLink />
        </div>
      </div>

      <div className="shell pb-3 md:hidden">
        <form action="/products" method="get" role="search" className="relative">
          <label htmlFor="header-search-mobile" className="sr-only">Search products</label>
          <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-subtle" aria-hidden="true" />
          <input id="header-search-mobile" type="search" name="q" maxLength={80} placeholder="Search for gadgets" className="h-11 w-full rounded-full border border-line bg-muted pl-11 pr-4 text-[15px] transition-all placeholder:text-subtle focus:border-brand focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand/15" />
        </form>
      </div>

      <nav aria-label="Categories" className="border-t border-line">
        <div className="shell flex gap-1 overflow-x-auto py-1.5 text-[14px] font-medium [scrollbar-width:none]">
          <Link href="/products" className="shrink-0 rounded-lg px-3 py-1.5 text-fg transition-colors hover:bg-muted">All products</Link>
          {categories.map((category) => (
            <Link key={category.id} href={`/collections/${category.slug}`} className="shrink-0 rounded-lg px-3 py-1.5 text-subtle transition-colors hover:bg-muted hover:text-fg">
              {category.name}
            </Link>
          ))}
          <Link href="/#how-it-works" className="ml-auto hidden shrink-0 rounded-lg px-3 py-1.5 text-subtle transition-colors hover:bg-muted hover:text-fg md:block">How it works</Link>
        </div>
      </nav>
    </header>
  );
}
