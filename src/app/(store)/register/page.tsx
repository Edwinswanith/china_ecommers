import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth-card";
import { RegisterForm } from "@/components/auth-forms";
import { homeForRole, safeNextPath } from "@/lib/auth/guards";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Create an account", robots: { index: false, follow: false } };

interface PageProps {
  searchParams: Promise<{ next?: string }>;
}

export default async function RegisterPage({ searchParams }: PageProps) {
  const { next } = await searchParams;
  const session = await getSession();
  if (session) redirect(safeNextPath(next, homeForRole(session.role)));
  return (
    <AuthCard eyebrow="One minute" title="Create your account" intro="So we can save your order, your address and your delivery updates.">
      <RegisterForm next={next ? safeNextPath(next) : undefined} />
    </AuthCard>
  );
}
