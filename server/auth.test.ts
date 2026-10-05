import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearLoginFailures,
  createSessionToken,
  hashPassword,
  loginThrottle,
  recordLoginFailure,
  verifyPassword,
  verifySessionToken,
} from "./_core/auth";

afterEach(() => vi.unstubAllEnvs());

describe("passwords", () => {
  it("verifies the password it hashed and rejects others", async () => {
    const stored = await hashPassword("correct horse battery");
    expect(stored.startsWith("scrypt:")).toBe(true);
    expect(await verifyPassword("correct horse battery", stored)).toBe(true);
    expect(await verifyPassword("correct horse batter", stored)).toBe(false);
    expect(await verifyPassword("anything", null)).toBe(false);
    expect(await verifyPassword("anything", "garbage")).toBe(false);
  });

  it("salts every hash", async () => {
    expect(await hashPassword("same")).not.toBe(await hashPassword("same"));
  });
});

describe("sessions", () => {
  it("round-trips the user id and rejects tampered or foreign tokens", async () => {
    vi.stubEnv("SESSION_SECRET", "unit-test-signing-key-never-deployed");
    const token = await createSessionToken(42);
    expect(await verifySessionToken(token)).toBe(42);
    expect(await verifySessionToken(`${token}x`)).toBeNull();
    expect(await verifySessionToken(undefined)).toBeNull();

    vi.stubEnv("SESSION_SECRET", "a-different-secret-for-another-deploy");
    expect(await verifySessionToken(token)).toBeNull();
  });

  it("expires", async () => {
    vi.stubEnv("SESSION_SECRET", "unit-test-signing-key-never-deployed");
    const token = await createSessionToken(7, -1000);
    expect(await verifySessionToken(token)).toBeNull();
  });
});

describe("sign-in throttle", () => {
  it("blocks after repeated failures and recovers after the window", () => {
    const key = "1.2.3.4|someone@example.com";
    const start = 1_000_000;
    clearLoginFailures(key);
    for (let attempt = 0; attempt < 8; attempt += 1) {
      expect(loginThrottle(key, start).allowed).toBe(true);
      recordLoginFailure(key, start);
    }
    const blocked = loginThrottle(key, start + 1000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    expect(loginThrottle(key, start + 16 * 60 * 1000).allowed).toBe(true);
    clearLoginFailures(key);
    expect(loginThrottle(key, start + 1000).allowed).toBe(true);
  });
});
