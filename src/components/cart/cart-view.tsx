"use client";

import { ArrowRight, Info, Lock, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { countryName } from "@/lib/config/markets";
import { MAX_QUANTITY_PER_LINE } from "@/lib/domain/cart";
import { ProductImage } from "../product-image";
import { AnimatedNumber } from "../ui/animated-number";
import { showToast } from "../ui/toast";
import { cart } from "./cart-store";
import { useCartProducts } from "./use-cart-products";

/** Matches the row-leave animation in globals.css. */
const REMOVE_ANIMATION_MS = 300;

const stepper = "grid h-9 w-9 place-items-center transition-colors hover:bg-muted disabled:opacity-30 disabled:hover:bg-transparent";

export function CartView() {
  const data = useCartProducts();
  const [leaving, setLeaving] = useState<ReadonlySet<string>>(new Set());

  /** Slide the row away, then take it out of the cart and offer to put it back. */
  const removeLine = (productId: string, name: string, quantity: number): void => {
    setLeaving((current) => new Set([...current, productId]));
    window.setTimeout(() => {
      cart.remove(productId);
      setLeaving((current) => new Set([...current].filter((id) => id !== productId)));
      showToast({ message: `Removed ${name} from your cart.`, undo: () => cart.add(productId, quantity) });
    }, REMOVE_ANIMATION_MS);
  };

  // Drop lines for products that have been removed from sale.
  useEffect(() => {
    data.unavailable.forEach((line) => cart.remove(line.productId));
  }, [data.unavailable]);

  if (data.lineCount === 0) {
    return (
      <div className="rounded-3xl bg-muted px-6 py-16 text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-white text-subtle shadow-sm"><ShoppingBag size={26} aria-hidden="true" /></span>
        <p className="mt-5 text-xl font-semibold tracking-tight">Your cart is empty</p>
        <p className="mt-1.5 text-subtle">Find something you like and it will show up here.</p>
        <Link href="/products" className="btn btn-primary btn-lg mt-7">Start shopping <ArrowRight size={18} aria-hidden="true" /></Link>
      </div>
    );
  }
  if (data.loading && data.rows.length === 0) {
    return (
      <div className="space-y-4" role="status" aria-label="Loading your cart">
        {[0, 1].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-2xl bg-muted" />
        ))}
      </div>
    );
  }

  const vendorCount = new Set(data.rows.map((r) => r.product.vendorName)).size;
  const blocked = data.rows.some((r) => r.product.stock < r.line.quantity);
  const units = data.rows.reduce((sum, r) => sum + r.line.quantity, 0);

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.7fr_1fr]">
      <ul className="min-w-0">
        {data.rows.map(({ line, product }) => {
          const max = Math.min(product.stock, MAX_QUANTITY_PER_LINE);
          const short = product.stock < line.quantity;
          return (
            <li key={product.id} className={`${leaving.has(product.id) ? "row-leave" : "animate-fade"} mb-4 flex gap-3 rounded-2xl border border-line bg-white p-4 sm:gap-5`}>
              <Link href={`/products/${product.slug}`} className="w-20 shrink-0 self-start overflow-hidden rounded-xl sm:w-28">
                <ProductImage src={product.image} alt={product.name} sizes="112px" />
              </Link>
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                  <div className="min-w-0">
                    <Link href={`/products/${product.slug}`} className="text-[16px] font-semibold leading-snug tracking-tight transition-colors hover:text-brand">{product.name}</Link>
                    <p className="mt-1 text-[13.5px] text-subtle">Sold by {product.vendorName} · Ships from {countryName(product.vendorCountry)}</p>
                  </div>
                  <p className="num whitespace-nowrap text-[17px] font-bold"><AnimatedNumber value={product.priceMinor * line.quantity} format="money" currency={product.currency} /></p>
                </div>
                {short ? (
                  <p className="mt-2 text-[13.5px] font-medium text-danger" role="alert">
                    {product.stock === 0 ? "This item is now out of stock. Please remove it to continue." : `Only ${product.stock} left. Please reduce the quantity.`}
                  </p>
                ) : null}
                <div className="mt-auto flex items-center justify-between gap-2 pt-4 sm:gap-4">
                  <div className="flex items-center overflow-hidden rounded-lg border border-line" role="group" aria-label={`Quantity of ${product.name}`}>
                    <button type="button" className={stepper} disabled={line.quantity <= 1} onClick={() => cart.setQuantity(product.id, line.quantity - 1)} aria-label="Decrease quantity"><Minus size={15} /></button>
                    <span className="num grid w-9 place-items-center text-[14px] font-semibold">{line.quantity}</span>
                    <button type="button" className={stepper} disabled={line.quantity >= max} onClick={() => cart.setQuantity(product.id, line.quantity + 1)} aria-label="Increase quantity"><Plus size={15} /></button>
                  </div>
                  <button type="button" className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[13.5px] font-medium text-subtle transition-colors hover:bg-red-50 hover:text-danger" onClick={() => removeLine(product.id, product.name, line.quantity)} aria-label={`Remove ${product.name}`}>
                    <Trash2 size={15} aria-hidden="true" /> <span className="max-[359px]:sr-only">Remove</span>
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <aside className="h-fit rounded-2xl border border-line bg-white p-6 shadow-[var(--shadow-card)] lg:sticky lg:top-32 lg:max-h-[calc(100vh-9rem)] lg:overflow-y-auto" aria-label="Order summary">
        <h2 className="text-[18px] font-bold tracking-tight">Order summary</h2>
        <dl className="mt-5 space-y-3 text-[15px]">
          <div className="flex justify-between"><dt className="text-subtle">Items ({units})</dt><dd className="num font-medium"><AnimatedNumber value={data.subtotalMinor} format="money" currency={data.currency} /></dd></div>
          <div className="flex justify-between"><dt className="text-subtle">Shipping</dt><dd className="text-subtle">Shown at checkout</dd></div>
          <div className="flex justify-between border-t border-line pt-4 text-[17px] font-bold"><dt>Total</dt><dd className="num"><AnimatedNumber value={data.subtotalMinor} format="money" currency={data.currency} /></dd></div>
        </dl>
        {vendorCount > 1 ? (
          <p className="mt-4 flex gap-2.5 rounded-xl bg-brand-soft p-3 text-[13.5px] leading-snug text-brand-dark">
            <Info size={17} className="mt-px shrink-0" aria-hidden="true" />
            Your items come from {vendorCount} sellers, so they will arrive in {vendorCount} separate deliveries.
          </p>
        ) : null}
        {blocked ? (
          <button className="btn btn-primary btn-lg mt-6 w-full" disabled>Update your cart to continue</button>
        ) : (
          <Link href="/checkout" className="btn btn-primary btn-lg mt-6 w-full">Proceed to checkout <ArrowRight size={18} aria-hidden="true" /></Link>
        )}
        <p className="mt-3 flex items-center justify-center gap-1.5 text-[13px] text-subtle"><Lock size={13} aria-hidden="true" /> Secure checkout</p>
        <Link href="/products" className="mt-4 block text-center text-[14px] font-semibold text-brand hover:underline">Continue shopping</Link>
      </aside>
    </div>
  );
}
