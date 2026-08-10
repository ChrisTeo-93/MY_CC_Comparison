import { describe, it, expect, afterEach } from "vitest";
import { adminDisabled, adminPassword, sessionToken, verifyPassword } from "@/lib/auth";

/**
 * The admin gate must fail CLOSED in production. The dev fallback password is
 * published in this repo's README, so falling back to it on a deployed site
 * would leave the catalogue editor open to anyone.
 */

const originalPassword = process.env.ADMIN_PASSWORD;
const originalEnv = process.env.NODE_ENV;

function setEnv(nodeEnv: string, password?: string) {
  // NODE_ENV is readonly in the Next type defs; tests need to drive it.
  (process.env as Record<string, string | undefined>).NODE_ENV = nodeEnv;
  if (password === undefined) delete process.env.ADMIN_PASSWORD;
  else process.env.ADMIN_PASSWORD = password;
}

afterEach(() => {
  setEnv(originalEnv as string, originalPassword);
});

describe("adminPassword", () => {
  it("uses the configured password when one is set", () => {
    setEnv("production", "s3cret");
    expect(adminPassword()).toBe("s3cret");
    expect(adminDisabled()).toBe(false);
  });

  it("falls back to the dev default outside production", () => {
    setEnv("development", undefined);
    expect(adminPassword()).toBe("admin123");
    expect(adminDisabled()).toBe(false);
  });

  it("fails closed in production when ADMIN_PASSWORD is unset", () => {
    setEnv("production", undefined);
    expect(adminPassword()).toBeNull();
    expect(adminDisabled()).toBe(true);
  });

  it("never accepts the published dev default in production", () => {
    setEnv("production", undefined);
    expect(verifyPassword("admin123")).toBe(false);
    expect(verifyPassword("")).toBe(false);
  });

  it("issues no session token while admin access is disabled", () => {
    setEnv("production", undefined);
    expect(sessionToken()).toBeNull();
  });

  it("still authenticates a correctly configured production deployment", () => {
    setEnv("production", "s3cret");
    expect(verifyPassword("s3cret")).toBe(true);
    expect(verifyPassword("wrong")).toBe(false);
    expect(sessionToken()).toMatch(/^[a-f0-9]{64}$/);
  });
});
