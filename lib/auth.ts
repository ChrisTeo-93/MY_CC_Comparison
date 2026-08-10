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

/** Convenience password for local development only — never used in production. */
const DEV_FALLBACK_PASSWORD = "admin123";

/**
 * The configured admin password, or `null` when the editor must refuse every
 * login.
 *
 * `ADMIN_PASSWORD` is **mandatory in production**. Falling back to a default
 * there would be no protection at all, since the fallback is published in this
 * repo's README — anyone could open `/admin` on the deployed site. So when the
 * variable is missing in production we fail closed (locking ourselves out is
 * the safe direction) rather than fail open. Outside production the fallback
 * stands, so local dev needs no configuration.
 */
export function adminPassword(): string | null {
  const configured = process.env.ADMIN_PASSWORD;
  if (configured) return configured;
  return process.env.NODE_ENV === "production" ? null : DEV_FALLBACK_PASSWORD;
}

/** True when no password is configured and admin access is therefore disabled. */
export function adminDisabled(): boolean {
  return adminPassword() === null;
}

/**
 * Deterministic token derived from the password — same password → same token.
 * `null` when admin access is disabled, so no cookie value can ever match.
 */
export function sessionToken(): string | null {
  const password = adminPassword();
  if (password === null) return null;
  return createHmac("sha256", password).update("kadcompare-admin").digest("hex");
}

export function verifyPassword(input: string): boolean {
  const password = adminPassword();
  if (password === null) return false;
  const a = Buffer.from(input);
  const b = Buffer.from(password);
  return a.length === b.length && timingSafeEqual(a, b);
}

function tokenMatches(value: string | undefined): boolean {
  if (!value) return false;
  const expected = sessionToken();
  if (expected === null) return false;
  const a = Buffer.from(value);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** True when the current request carries a valid admin session cookie. */
export function isAuthed(): boolean {
  return tokenMatches(cookies().get(ADMIN_COOKIE)?.value);
}
