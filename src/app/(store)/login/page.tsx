import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth-card";
import { LoginForm } from "@/components/auth-forms";
import { homeForRole, safeNextPath } from "@/lib/auth/guards";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Sign in", robots: { index: false, follow: false } };

interface PageProps {
  searchParams: Promise<{ next?: string }>;
}

export default async function LoginPage({ searchParams }: PageProps) {
  const { next } = await searchParams;
  const session = await getSession();
  if (session) redirect(safeNextPath(next, homeForRole(session.role)));
  return (
    <AuthCard eyebrow="Welcome back" title="Sign in" intro="Customers, vendors and the store admin all sign in here.">
      <LoginForm next={next ? safeNextPath(next) : undefined} />
    </AuthCard>
  );
}
