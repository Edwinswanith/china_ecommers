import type { UserRole } from "@/lib/db/schema";

const REDIRECT_BASE = "http://local.invalid";

/** Only allow same-site relative redirects (blocks //host, backslashes and control characters). */
export function safeNextPath(next: string | null | undefined, fallback = "/"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return fallback;
  if (/[\\\u0000-\u001f\u007f]/.test(next)) return fallback;
  try {
    return new URL(next, REDIRECT_BASE).origin === REDIRECT_BASE ? next : fallback;
  } catch {
    return fallback;
  }
}

export function homeForRole(role: UserRole): string {
  if (role === "admin") return "/admin";
  if (role === "vendor") return "/vendor";
  return "/";
}
