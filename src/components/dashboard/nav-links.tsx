"use client";

import { Boxes, ClipboardList, LayoutDashboard, type LucideIcon, Store } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavIcon = "overview" | "orders" | "products" | "vendors";

const ICONS: Readonly<Record<NavIcon, LucideIcon>> = { overview: LayoutDashboard, orders: ClipboardList, products: Boxes, vendors: Store };

export interface NavItem {
  readonly href: string;
  readonly label: string;
  readonly icon: NavIcon;
  /** Match only the exact path (used for the section's index page). */
  readonly exact?: boolean;
  readonly count?: number;
}

export function NavLinks({ items }: { items: readonly NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Section" className="flex gap-1 overflow-x-auto px-3 py-2 [scrollbar-width:none] lg:flex-col lg:py-4">
      {items.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        const Icon = ICONS[item.icon];
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-[14.5px] font-medium transition-colors ${active ? "bg-brand-soft text-brand-dark" : "text-subtle hover:bg-muted hover:text-fg"}`}
          >
            <Icon size={18} aria-hidden="true" />
            {item.label}
            {item.count ? <span className="num ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1.5 text-[11.5px] font-bold text-white">{item.count}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}
