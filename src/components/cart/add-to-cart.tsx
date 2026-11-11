"use client";

import { Check, Minus, Plus, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { MAX_QUANTITY_PER_LINE } from "@/lib/domain/cart";
import { cart } from "./cart-store";

interface AddToCartProps {
  productId: string;
  stock: number;
}

const CONFIRM_MS = 1800;

export function AddToCart({ productId, stock }: AddToCartProps) {
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);
  const [everAdded, setEverAdded] = useState(false);
  const max = Math.min(stock, MAX_QUANTITY_PER_LINE);

  useEffect(() => {
    if (!justAdded) return;
    const timer = window.setTimeout(() => setJustAdded(false), CONFIRM_MS);
    return () => window.clearTimeout(timer);
  }, [justAdded]);

  if (stock <= 0) {
    return <button className="btn btn-ghost btn-lg w-full" disabled>Out of stock</button>;
  }

  const change = (delta: number): void => setQuantity((q) => Math.max(1, Math.min(max, q + delta)));
  const stepper = "grid h-full w-11 place-items-center text-fg transition-colors hover:bg-muted disabled:opacity-30 disabled:hover:bg-transparent";

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <div className="flex h-[50px] overflow-hidden rounded-xl border border-line" role="group" aria-label="Quantity">
          <button type="button" className={stepper} onClick={() => change(-1)} disabled={quantity <= 1} aria-label="Decrease quantity"><Minus size={16} /></button>
          <span className="num grid w-9 place-items-center text-[15px] font-semibold" aria-live="polite">{quantity}</span>
          <button type="button" className={stepper} onClick={() => change(1)} disabled={quantity >= max} aria-label="Increase quantity"><Plus size={16} /></button>
        </div>
        <button
          type="button"
          className={`btn btn-lg flex-1 ${justAdded ? "bg-ok text-white" : "btn-primary"}`}
          onClick={() => {
            cart.add(productId, quantity);
            setJustAdded(true);
            setEverAdded(true);
          }}
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
    </div>
  );
}
