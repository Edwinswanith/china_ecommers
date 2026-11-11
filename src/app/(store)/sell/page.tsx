import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth-card";
import { VendorRegisterForm } from "@/components/auth-forms";
import { getSession } from "@/lib/auth/session";
import { BRAND } from "@/lib/config/brand";

export const metadata: Metadata = {
  title: "Sell with us — open a vendor account",
  description: `List your inventive electronics on ${BRAND.name} and sell to customers in India. Products go live as soon as you publish them.`,
  alternates: { canonical: "/sell" },
};

export default async function SellPage() {
  const session = await getSession();
  return (
    <AuthCard
      wide
      eyebrow="For makers and vendors"
      title="Sell with us"
      intro="Open an account, list your product, and it is live immediately. Each order arrives in your portal with the customer's delivery address; you pack it, enter the package details and ship."
    >
      {session ? (
        <div>
          <p className="text-[16px]">
            You are signed in as <strong>{session.email}</strong> ({session.role}).
          </p>
          {session.role === "vendor" ? (
            <Link href="/vendor" className="btn btn-dark mt-5">Go to your vendor portal →</Link>
          ) : (
            <p className="mt-2 text-subtle">Sign out first to open a separate vendor account.</p>
          )}
        </div>
      ) : (
        <VendorRegisterForm />
      )}
    </AuthCard>
  );
}
