"use server";

import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { homeForRole, safeNextPath } from "@/lib/auth/paths";
import { createSession, destroySession } from "@/lib/auth/session";
import { getDb, isDuplicateKeyError, newId, withTransaction, type Db, type Tx } from "@/lib/db/client";
import type { User, UserRole } from "@/lib/db/schema";
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

interface NewUser {
  readonly name: string;
  readonly email: string;
  readonly passwordHash: string;
  readonly role: UserRole;
}

/** Returns null when the email is already registered. The unique index on email is the real guard. */
async function insertUser(db: Db, input: NewUser, tx?: Tx): Promise<User | null> {
  const user: User = { id: newId(), ...input, createdAt: new Date() };
  const { id, ...fields } = user;
  try {
    await db.users.insertOne({ _id: id, ...fields }, { session: tx });
    return user;
  } catch (error: unknown) {
    if (isDuplicateKeyError(error)) return null;
    throw error;
  }
}

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return zodFormState(parsed.error);
  const { email, password } = parsed.data;
  if (await tooManyAttempts("login", email)) return TOO_MANY;

  const db = await getDb();
  const user = await db.users.findOne({ email });
  const valid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !valid) return { ok: false, message: "Email or password is incorrect." };

  await createSession({ userId: user._id, role: user.role, name: user.name, email: user.email });
  const next = formData.get("next");
  redirect(safeNextPath(typeof next === "string" ? next : null, homeForRole(user.role)));
}

export async function registerAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return zodFormState(parsed.error);
  const { name, email, password } = parsed.data;
  if (await tooManyAttempts("register", email)) return TOO_MANY;

  const db = await getDb();
  const existing = await db.users.findOne({ email }, { projection: { _id: 1 } });
  if (existing) return EMAIL_TAKEN;

  const passwordHash = await bcrypt.hash(password, 10);
  // Two simultaneous sign-ups with one email end up here: the second one gets null.
  const user = await insertUser(db, { name, email, passwordHash, role: "customer" });
  if (!user) return EMAIL_TAKEN;
  await createSession({ userId: user.id, role: user.role, name: user.name, email: user.email });
  const next = formData.get("next");
  redirect(safeNextPath(typeof next === "string" ? next : null, "/"));
}

class EmailTakenError extends Error {}

async function uniqueVendorSlug(base: string): Promise<string> {
  const db = await getDb();
  const root = slugify(base) || "vendor";
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate = attempt === 0 ? root : `${root}-${attempt + 1}`;
    const taken = await db.vendors.findOne({ slug: candidate }, { projection: { _id: 1 } });
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
  const existing = await db.users.findOne({ email: input.email }, { projection: { _id: 1 } });
  if (existing) return { ok: false, fieldErrors: { email: "An account with this email already exists." } };

  const passwordHash = await bcrypt.hash(input.password, 10);
  const slug = await uniqueVendorSlug(input.businessName);
  // The account and its vendor profile are created together or not at all.
  let user: User | null;
  try {
    user = await withTransaction(db, async (tx) => {
      const created = await insertUser(db, { name: input.name, email: input.email, passwordHash, role: "vendor" }, tx);
      if (!created) throw new EmailTakenError();
      await db.vendors.insertOne(
        {
          _id: newId(),
          ownerId: created.id,
          name: input.businessName,
          slug,
          countryCode: input.countryCode,
          city: input.city,
          about: input.about,
          contactEmail: input.email,
          contactPhone: input.contactPhone,
          status: "active",
          createdAt: new Date(),
        },
        { session: tx },
      );
      return created;
    });
  } catch (error: unknown) {
    if (!(error instanceof EmailTakenError)) throw error;
    user = null;
  }

  if (!user) return EMAIL_TAKEN;
  await createSession({ userId: user.id, role: user.role, name: user.name, email: user.email });
  redirect("/vendor");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/");
}
