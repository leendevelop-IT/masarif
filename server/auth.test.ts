import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearAttempts,
  createSessionToken,
  hashPassword,
  hashPin,
  releaseAttempt,
  takeAttempt,
  verifyPassword,
  verifyPin,
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

describe("pins", () => {
  it("verifies the pin it hashed and rejects others", async () => {
    const stored = await hashPin("1234");
    expect(stored.length).toBeLessThanOrEqual(128);
    expect(await verifyPin("1234", stored)).toBe(true);
    expect(await verifyPin("1235", stored)).toBe(false);
    expect(await verifyPin("1234", null)).toBe(false);
    expect(await verifyPin("1234", "garbage")).toBe(false);
  });
});

describe("sessions", () => {
  it("round-trips the session and rejects tampered or foreign tokens", async () => {
    vi.stubEnv("SESSION_SECRET", "unit-test-signing-key-never-deployed");
    const token = await createSessionToken({ userId: 42, sessionVersion: 3 });
    expect(await verifySessionToken(token)).toEqual({
      userId: 42,
      sessionVersion: 3,
    });
    expect(await verifySessionToken(`${token}x`)).toBeNull();
    expect(await verifySessionToken(undefined)).toBeNull();

    vi.stubEnv("SESSION_SECRET", "a-different-secret-for-another-deploy");
    expect(await verifySessionToken(token)).toBeNull();
  });

  it("expires", async () => {
    vi.stubEnv("SESSION_SECRET", "unit-test-signing-key-never-deployed");
    const token = await createSessionToken(
      { userId: 7, sessionVersion: 1 },
      -1000
    );
    expect(await verifySessionToken(token)).toBeNull();
  });
});

describe("attempt limits", () => {
  it("blocks once the limit is reached and recovers after the window", () => {
    const key = "login|1.2.3.4|someone@example.com";
    const start = 1_000_000;
    clearAttempts(key);
    for (let attempt = 0; attempt < 8; attempt += 1)
      expect(takeAttempt(key, 8, start).allowed).toBe(true);
    const blocked = takeAttempt(key, 8, start + 1000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    expect(takeAttempt(key, 8, start + 16 * 60 * 1000).allowed).toBe(true);
    clearAttempts(key);
    expect(takeAttempt(key, 8, start + 1000).allowed).toBe(true);
    clearAttempts(key);
  });

  it("counts the attempt before the work, so parallel tries share the limit", () => {
    const key = "login|5.6.7.8";
    const start = 2_000_000;
    clearAttempts(key);
    const results = Array.from({ length: 5 }, () => takeAttempt(key, 3, start));
    expect(results.map(result => result.allowed)).toEqual([
      true,
      true,
      true,
      false,
      false,
    ]);
    releaseAttempt(key);
    expect(takeAttempt(key, 3, start).allowed).toBe(true);
    clearAttempts(key);
  });
});
