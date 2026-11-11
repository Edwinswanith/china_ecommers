import "server-only";
import { redirect } from "next/navigation";
import { fromDoc, getDb } from "@/lib/db/client";
import type { Vendor } from "@/lib/db/schema";
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
  const user = await db.users.findOne({ _id: session.userId }, { projection: { role: 1 } });
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
  const vendor = await db.vendors.findOne({ ownerId: session.userId });
  if (!vendor) redirect("/sell");
  return { session, vendor: fromDoc<Vendor>(vendor) };
}
