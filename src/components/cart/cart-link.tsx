"use client";

import { ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useCart } from "./cart-store";

export function CartLink() {
  const count = useCart().reduce((sum, line) => sum + line.quantity, 0);
  return (
    <Link
      href="/cart"
      className="relative flex items-center gap-2 rounded-lg px-2.5 py-2 text-[14px] font-medium text-fg transition-colors hover:bg-muted"
      aria-label={`Cart, ${count} ${count === 1 ? "item" : "items"}`}
    >
      <span className="relative">
        <ShoppingBag size={20} aria-hidden="true" />
        {count > 0 ? (
          // Re-keyed on every change so the badge "pops" when an item is added.
          <span key={count} className="num animate-pop absolute -right-2 -top-2 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-brand px-1 text-[11px] font-bold text-white">
            {count}
          </span>
        ) : null}
      </span>
      <span className="hidden sm:inline">Cart</span>
    </Link>
  );
}
