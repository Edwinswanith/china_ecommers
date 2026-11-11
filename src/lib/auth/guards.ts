import "server-only";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db/client";
import { users, vendors, type Vendor } from "@/lib/db/schema";
import { homeForRole } from "./paths";
import { getSession, type Session } from "./session";

export { homeForRole, safeNextPath } from "./paths";

export async function requireUser(nextPath: string): Promise<Session> {
  const session = await getSession();
  if (!session) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  return session;
}

export async function requireAdmin(): Promise<Session> {
  const session = await requireUser("/admin");
  if (session.role !== "admin") redirect(homeForRole(session.role));
  // Re-check against the database so a removed or demoted admin loses access immediately.
  const db = await getDb();
  const [user] = await db.select({ role: users.role }).from(users).where(eq(users.id, session.userId)).limit(1);
  if (user?.role !== "admin") redirect("/");
  return session;
}

export interface VendorContext {
  readonly session: Session;
  readonly vendor: Vendor;
}

/** Vendor role is checked against the database on every request, so a suspension takes effect immediately. */
export async function requireVendor(): Promise<VendorContext> {
  const session = await requireUser("/vendor");
  if (session.role !== "vendor") redirect(homeForRole(session.role));
  const db = await getDb();
  const [vendor] = await db.select().from(vendors).where(eq(vendors.ownerId, session.userId)).limit(1);
  if (!vendor) redirect("/sell");
  return { session, vendor };
}
