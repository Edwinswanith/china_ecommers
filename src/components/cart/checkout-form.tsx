"use client";

import { ArrowRight, Info, Lock, MapPin, Wallet } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { placeOrderAction } from "@/lib/actions/checkout";
import { countryName, INDIAN_STATES } from "@/lib/config/markets";
import { formatMoney } from "@/lib/domain/money";
import { SelectField, TextField } from "../forms/field";
import { cart } from "./cart-store";
import { useCartProducts } from "./use-cart-products";

interface CheckoutFormProps {
  defaultName: string;
  paymentsLive: boolean;
}

export function CheckoutForm({ defaultName, paymentsLive }: CheckoutFormProps) {
  const router = useRouter();
  const data = useCartProducts();
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<readonly string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Readonly<Record<string, string>>>({});
  const [placed, setPlaced] = useState(false);

  if (!placed && data.lineCount === 0) {
    return (
      <div className="rounded-3xl bg-muted px-6 py-16 text-center">
        <p className="text-xl font-semibold tracking-tight">There is nothing to check out</p>
        <p className="mt-1.5 text-subtle">Add a product to your cart first.</p>
        <Link href="/products" className="btn btn-primary btn-lg mt-6">Start shopping <ArrowRight size={18} aria-hidden="true" /></Link>
      </div>
    );
  }

  const submit = (formData: FormData): void => {
    const address = Object.fromEntries(formData);
    const lines = data.rows.map((r) => ({ productId: r.line.productId, quantity: r.line.quantity }));
    startTransition(async () => {
      const result = await placeOrderAction(lines, address);
      if (result.ok) {
        setPlaced(true);
        cart.clear();
        // Start the confirmation page at the top, so the thank-you message is not hidden under the header.
        window.scrollTo({ top: 0, behavior: "instant" });
        router.push(`/orders/${result.orderId}?placed=1`);
        return;
      }
      setErrors(result.errors);
      setFieldErrors(result.fieldErrors ?? {});
    });
  };

  const groups = [...new Set(data.rows.map((r) => r.product.vendorName))].map((vendorName) => ({
    vendorName,
    rows: data.rows.filter((r) => r.product.vendorName === vendorName),
  }));

  return (
    <form action={submit} className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
      <div className="space-y-6">
        <section aria-labelledby="address-heading" className="rounded-2xl border border-line bg-white p-5 md:p-6">
          <h2 id="address-heading" className="flex items-center gap-2.5 text-[18px] font-bold tracking-tight">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-soft text-brand"><MapPin size={18} aria-hidden="true" /></span>
            Delivery address
          </h2>
          <p className="mt-2 text-[14.5px] text-subtle">We deliver anywhere in India. Your address is shared only with the sellers shipping your order.</p>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <TextField label="Full name" name="fullName" defaultValue={defaultName} autoComplete="name" required error={fieldErrors.fullName} />
            <TextField label="Mobile number" name="phone" type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="10-digit number" pattern="[6-9][0-9]{9}" title="Enter a 10-digit Indian mobile number." maxLength={10} required error={fieldErrors.phone} />
            <div className="sm:col-span-2">
              <TextField label="Address line 1" name="line1" autoComplete="address-line1" placeholder="House / flat, street" required error={fieldErrors.line1} />
            </div>
            <div className="sm:col-span-2">
              <TextField label="Address line 2 (optional)" name="line2" autoComplete="address-line2" placeholder="Area, landmark" error={fieldErrors.line2} />
            </div>
            <TextField label="City" name="city" autoComplete="address-level2" required error={fieldErrors.city} />
            <TextField label="PIN code" name="postalCode" inputMode="numeric" autoComplete="postal-code" maxLength={6} pattern="[1-9][0-9]{5}" title="Enter a 6-digit PIN code." required error={fieldErrors.postalCode} />
            <div className="sm:col-span-2">
              <SelectField label="State" name="state" autoComplete="address-level1" required defaultValue="" error={fieldErrors.state}>
                <option value="" disabled>Choose a state</option>
                {INDIAN_STATES.map((state) => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </SelectField>
            </div>
          </div>
        </section>

        <section aria-labelledby="payment-heading" className="rounded-2xl border border-line bg-white p-5 md:p-6">
          <h2 id="payment-heading" className="flex items-center gap-2.5 text-[18px] font-bold tracking-tight">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-soft text-brand"><Wallet size={18} aria-hidden="true" /></span>
            Payment
          </h2>
          {paymentsLive ? null : (
            <div className="mt-4 flex gap-3 rounded-xl bg-amber-50 p-4 text-amber-900">
              <Info size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
              <p className="text-[14.5px] leading-relaxed">
                <strong className="font-semibold">Test mode.</strong> Online payment is not connected yet. You will not be charged for this order.
              </p>
            </div>
          )}
        </section>
      </div>

      <aside className="h-fit rounded-2xl border border-line bg-white p-6 shadow-[var(--shadow-card)] lg:sticky lg:top-44" aria-label="Order summary">
        <h2 className="text-[18px] font-bold tracking-tight">Order summary</h2>
        <div className="mt-5 space-y-5">
          {groups.map((group, index) => (
            <div key={group.vendorName}>
              <p className="text-[13px] font-medium text-subtle">
                Delivery {index + 1} of {groups.length} · {group.vendorName}, {countryName(group.rows[0].product.vendorCountry)}
              </p>
              <ul className="mt-2 space-y-1.5 text-[15px]">
                {group.rows.map(({ line, product }) => (
                  <li key={product.id} className="flex justify-between gap-4">
                    <span>{product.name} <span className="num text-subtle">× {line.quantity}</span></span>
                    <span className="num">{formatMoney(product.priceMinor * line.quantity, product.currency)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <dl className="mt-5 space-y-3 border-t border-line pt-4 text-[15px]">
          <div className="flex justify-between"><dt>Subtotal</dt><dd className="num">{formatMoney(data.subtotalMinor, data.currency)}</dd></div>
          <div className="flex justify-between text-subtle"><dt>Shipping</dt><dd>To be confirmed</dd></div>
          <div className="flex justify-between text-subtle"><dt>Duties and taxes</dt><dd>To be confirmed</dd></div>
          <div className="flex justify-between border-t border-line pt-4 text-[17px] font-bold"><dt>Total</dt><dd className="num">{formatMoney(data.subtotalMinor, data.currency)}</dd></div>
        </dl>
        {errors.length > 0 ? (
          <ul role="alert" className="animate-fade mt-4 space-y-1 rounded-xl bg-red-50 p-3.5 text-[14px] font-medium text-danger">
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        ) : null}
        <button type="submit" className="btn btn-primary btn-lg mt-5 w-full" disabled={pending || placed || data.loading || data.rows.length === 0}>
          <Lock size={16} aria-hidden="true" /> {pending || placed ? "Placing your order…" : "Place order"}
        </button>
        <p className="mt-3 text-center text-[13px] text-subtle">
          By ordering you agree to the <Link href="/policies/terms" className="underline underline-offset-2">terms</Link> and{" "}
          <Link href="/policies/returns" className="underline underline-offset-2">returns policy</Link>.
        </p>
      </aside>
    </form>
  );
}
