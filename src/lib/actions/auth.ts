"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { homeForRole, safeNextPath } from "@/lib/auth/paths";
import { createSession, destroySession } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { users, vendors } from "@/lib/db/schema";
import { slugify, zodFormState, type FormState } from "@/lib/form-state";
import { isRateLimited } from "@/lib/rate-limit";
import { loginSchema, registerSchema, vendorRegisterSchema } from "@/lib/validation/schemas";

const ATTEMPTS = 8;
const WINDOW_MS = 10 * 60 * 1000;
const TOO_MANY: FormState = { ok: false, message: "Too many attempts. Please wait a few minutes and try again." };
// Compared against when the email is unknown, so response time does not reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 10);

/** Limited per client address and, separately, per email, so a spoofed forwarding header cannot reset the count. */
async function tooManyAttempts(scope: string, email: string): Promise<boolean> {
  const forwarded = (await headers()).get("x-forwarded-for") ?? "local";
  const byClient = isRateLimited(`${scope}:ip:${forwarded.split(",")[0].trim()}`, ATTEMPTS * 5, WINDOW_MS);
  const byEmail = isRateLimited(`${scope}:email:${email}`, ATTEMPTS, WINDOW_MS);
  return byClient || byEmail;
}

const EMAIL_TAKEN: FormState = { ok: false, fieldErrors: { email: "An account with this email already exists. Sign in instead." } };

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return zodFormState(parsed.error);
  const { email, password } = parsed.data;
  if (await tooManyAttempts("login", email)) return TOO_MANY;

  const db = await getDb();
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const valid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !valid) return { ok: false, message: "Email or password is incorrect." };

  await createSession({ userId: user.id, role: user.role, name: user.name, email: user.email });
  const next = formData.get("next");
  redirect(safeNextPath(typeof next === "string" ? next : null, homeForRole(user.role)));
}

export async function registerAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return zodFormState(parsed.error);
  const { name, email, password } = parsed.data;
  if (await tooManyAttempts("register", email)) return TOO_MANY;

  const db = await getDb();
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing) return { ok: false, fieldErrors: { email: "An account with this email already exists. Sign in instead." } };

  const passwordHash = await bcrypt.hash(password, 10);
  // The unique index is the real guard; two simultaneous sign-ups with one email end up here.
  const [user] = await db
    .insert(users)
    .values({ name, email, passwordHash, role: "customer" })
    .onConflictDoNothing({ target: users.email })
    .returning();
  if (!user) return EMAIL_TAKEN;
  await createSession({ userId: user.id, role: user.role, name: user.name, email: user.email });
  const next = formData.get("next");
  redirect(safeNextPath(typeof next === "string" ? next : null, "/"));
}

async function uniqueVendorSlug(base: string): Promise<string> {
  const db = await getDb();
  const root = slugify(base) || "vendor";
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate = attempt === 0 ? root : `${root}-${attempt + 1}`;
    const [taken] = await db.select({ id: vendors.id }).from(vendors).where(eq(vendors.slug, candidate)).limit(1);
    if (!taken) return candidate;
  }
  return `${root}-${Date.now().toString(36)}`;
}

export async function registerVendorAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = vendorRegisterSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return zodFormState(parsed.error);
  const input = parsed.data;
  if (await tooManyAttempts("register", input.email)) return TOO_MANY;

  const db = await getDb();
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, input.email)).limit(1);
  if (existing) return { ok: false, fieldErrors: { email: "An account with this email already exists." } };

  const passwordHash = await bcrypt.hash(input.password, 10);
  const slug = await uniqueVendorSlug(input.businessName);
  const user = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(users)
      .values({ name: input.name, email: input.email, passwordHash, role: "vendor" })
      .onConflictDoNothing({ target: users.email })
      .returning();
    if (!created) return null;
    await tx.insert(vendors).values({
      ownerId: created.id,
      name: input.businessName,
      slug,
      countryCode: input.countryCode,
      city: input.city,
      about: input.about,
      contactEmail: input.email,
      contactPhone: input.contactPhone,
    });
    return created;
  });

  if (!user) return EMAIL_TAKEN;
  await createSession({ userId: user.id, role: user.role, name: user.name, email: user.email });
  redirect("/vendor");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/");
}
