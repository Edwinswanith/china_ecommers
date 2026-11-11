import type { Metadata } from "next";
import { CartView } from "@/components/cart/cart-view";
import { CheckoutSteps } from "@/components/checkout-steps";

export const metadata: Metadata = { title: "Your cart", robots: { index: false, follow: false } };

export default function CartPage() {
  return (
    <div className="shell py-8 md:py-10">
      <CheckoutSteps current={1} />
      <h1 className="display mb-6 mt-6 text-3xl md:text-4xl">Your cart</h1>
      <CartView />
    </div>
  );
}
