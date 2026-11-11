import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { cache } from "react";
import type { UserRole } from "@/lib/db/schema";

const COOKIE_NAME = "curio_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export interface Session {
  readonly userId: string;
  readonly role: UserRole;
  readonly name: string;
  readonly email: string;
}

function secretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be set to at least 32 characters.");
  }
  return new TextEncoder().encode(secret);
}

export async function createSession(session: Session): Promise<void> {
  const token = await new SignJWT({ role: session.role, name: session.name, email: session.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(session.userId)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secretKey());
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

const ROLES: readonly string[] = ["customer", "vendor", "admin"];

/** Read and verify the session cookie. Cached per request. */
export const getSession = cache(async (): Promise<Session | null> => {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    const { sub, role, name, email } = payload;
    if (typeof sub !== "string" || typeof role !== "string" || !ROLES.includes(role)) return null;
    if (typeof name !== "string" || typeof email !== "string") return null;
    return { userId: sub, role: role as UserRole, name, email };
  } catch {
    // Expired or tampered token: treat as signed out.
    return null;
  }
});
