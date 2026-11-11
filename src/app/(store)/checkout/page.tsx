import type { Metadata } from "next";
import Link from "next/link";
import { CheckoutForm } from "@/components/cart/checkout-form";
import { CheckoutSteps } from "@/components/checkout-steps";
import { requireUser } from "@/lib/auth/guards";
import { PAYMENTS_ARE_LIVE } from "@/lib/payments";

export const metadata: Metadata = { title: "Checkout", robots: { index: false, follow: false } };

export default async function CheckoutPage() {
  const session = await requireUser("/checkout");
  return (
    <div className="shell py-8 md:py-10">
      <CheckoutSteps current={2} />
      <h1 className="display mt-6 text-3xl md:text-4xl">Checkout</h1>
      <p className="mb-6 mt-1.5 text-[14.5px] text-subtle">Signed in as {session.email}</p>
      {session.role === "customer" ? (
        <CheckoutForm defaultName={session.name} paymentsLive={PAYMENTS_ARE_LIVE} />
      ) : (
        <div className="panel p-8">
          <p className="text-xl font-semibold tracking-tight">This is a {session.role} account</p>
          <p className="mt-2 text-subtle">Orders can only be placed from a customer account. Sign out and sign in as a customer to continue.</p>
          <Link href="/" className="btn btn-ghost mt-6">Back to the store</Link>
        </div>
      )}
    </div>
  );
}
