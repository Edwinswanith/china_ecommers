"use client";

import { Check, Minus, Plus, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { MAX_QUANTITY_PER_LINE } from "@/lib/domain/cart";
import { cart } from "./cart-store";

interface AddToCartProps {
  productId: string;
  stock: number;
  /** Shown in the bar that follows phone shoppers down the page. */
  name: string;
  priceLabel: string;
}

const CONFIRM_MS = 1800;
/** Height of the header that stays at the top on phones; the main button is out of sight once it is under it. */
const STICKY_HEADER_PX = 120;

export function AddToCart({ productId, stock, name, priceLabel }: AddToCartProps) {
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);
  const [everAdded, setEverAdded] = useState(false);
  const max = Math.min(stock, MAX_QUANTITY_PER_LINE);
  const mainButton = useRef<HTMLDivElement>(null);
  const [scrolledPast, setScrolledPast] = useState(false);

  // On phones, once the main button has scrolled off the top, keep a buy bar within reach.
  // Checked on scroll rather than with an observer, which misses jumps straight past the button (e.g. to #reviews).
  useEffect(() => {
    const element = mainButton.current;
    if (!element) return;
    let frame = 0;
    const check = (): void => {
      frame = 0;
      setScrolledPast(element.getBoundingClientRect().bottom < STICKY_HEADER_PX);
    };
    const onScroll = (): void => {
      if (frame === 0) frame = requestAnimationFrame(check);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    if (!justAdded) return;
    const timer = window.setTimeout(() => setJustAdded(false), CONFIRM_MS);
    return () => window.clearTimeout(timer);
  }, [justAdded]);

  if (stock <= 0) {
    return <button className="btn btn-ghost btn-lg w-full" disabled>Out of stock</button>;
  }

  const add = (): void => {
    cart.add(productId, quantity);
    setJustAdded(true);
    setEverAdded(true);
  };
  const change = (delta: number): void => setQuantity((q) => Math.max(1, Math.min(max, q + delta)));
  const stepper = "grid h-full w-11 place-items-center text-fg transition-colors hover:bg-muted disabled:opacity-30 disabled:hover:bg-transparent";

  return (
    <div className="space-y-3">
      <div ref={mainButton} className="flex gap-3">
        <div className="flex h-[50px] overflow-hidden rounded-xl border border-line" role="group" aria-label="Quantity">
          <button type="button" className={stepper} onClick={() => change(-1)} disabled={quantity <= 1} aria-label="Decrease quantity"><Minus size={16} /></button>
          <span className="num grid w-9 place-items-center text-[15px] font-semibold" aria-live="polite">{quantity}</span>
          <button type="button" className={stepper} onClick={() => change(1)} disabled={quantity >= max} aria-label="Increase quantity"><Plus size={16} /></button>
        </div>
        <button
          type="button"
          className={`btn btn-lg flex-1 ${justAdded ? "bg-ok text-white" : "btn-primary"}`}
          onClick={add}
        >
          {justAdded ? (
            <span className="animate-fade flex items-center gap-2"><Check size={18} /> Added to cart</span>
          ) : (
            <span className="flex items-center gap-2"><ShoppingBag size={18} /> Add to cart</span>
          )}
        </button>
      </div>
      {everAdded ? (
        <Link href="/cart" className="btn btn-ghost animate-fade w-full">View cart and checkout</Link>
      ) : null}
      {stock <= 10 ? <p className="text-[14px] font-medium text-sale" role="status">Only {stock} left in stock</p> : null}

      <div
        className={`fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 px-4 py-3 backdrop-blur transition-transform duration-300 ease-out lg:hidden ${scrolledPast ? "translate-y-0 shadow-[0_-8px_24px_-12px_rgb(15_23_42/0.25)]" : "translate-y-full"}`}
        aria-hidden={scrolledPast ? undefined : true}
        inert={!scrolledPast}
      >
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13.5px] font-medium text-subtle">{name}</p>
            <p className="num text-[17px] font-bold leading-tight">{priceLabel}</p>
          </div>
          <button type="button" className={`btn shrink-0 ${justAdded ? "bg-ok text-white" : "btn-primary"}`} onClick={add}>
            {justAdded ? <><Check size={17} aria-hidden="true" /> Added</> : <><ShoppingBag size={17} aria-hidden="true" /> Add to cart</>}
          </button>
          {everAdded ? <Link href="/cart" className="btn btn-ghost shrink-0">Cart</Link> : null}
        </div>
      </div>
    </div>
  );
}
