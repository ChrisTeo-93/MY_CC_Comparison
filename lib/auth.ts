import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

/**
 * Minimal password gate for the /admin editor. A single shared password
 * (ADMIN_PASSWORD) unlocks a deterministic session token stored in an httpOnly
 * cookie. This is intentionally simple — it protects an internal data-curation
 * tool, not user accounts. For multi-user/auditing, swap for a real auth
 * provider later.
 */

export const ADMIN_COOKIE = "kc_admin";

/** Falls back to a dev default so the tool runs locally without config. */
export function adminPassword(): string {
  return process.env.ADMIN_PASSWORD || "admin123";
}

/** Deterministic token derived from the password — same password → same token. */
export function sessionToken(): string {
  return createHmac("sha256", adminPassword()).update("kadcompare-admin").digest("hex");
}

export function verifyPassword(input: string): boolean {
  const a = Buffer.from(input);
  const b = Buffer.from(adminPassword());
  return a.length === b.length && timingSafeEqual(a, b);
}

function tokenMatches(value: string | undefined): boolean {
  if (!value) return false;
  const expected = sessionToken();
  const a = Buffer.from(value);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** True when the current request carries a valid admin session cookie. */
export function isAuthed(): boolean {
  return tokenMatches(cookies().get(ADMIN_COOKIE)?.value);
}
