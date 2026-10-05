import { COOKIE_NAME, SESSION_TTL_MS } from "@shared/const";
import { parse as parseCookieHeader } from "cookie";
import type { CookieOptions, Request, Response } from "express";
import { SignJWT, jwtVerify } from "jose";
import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import { ENV } from "./env";

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: string,
  keyLength: number
) => Promise<Buffer>;
const PASSWORD_KEY_LENGTH = 64;
const PIN_KEY_LENGTH = 32;

// ---------------------------------------------------------------------------
// Passwords
// ---------------------------------------------------------------------------

/** Hash a password with scrypt. Stored as `scrypt:<salt>:<hash>`. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = await scrypt(password, salt, PASSWORD_KEY_LENGTH);
  return `scrypt:${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  stored: string | null | undefined
): Promise<boolean> {
  if (!stored) return false;
  const [scheme, salt, expectedHex] = stored.split(":");
  if (scheme !== "scrypt" || !salt || !expectedHex) return false;
  const expected = Buffer.from(expectedHex, "hex");
  const actual = await scrypt(password, salt, expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

// ---------------------------------------------------------------------------
// PINs (same scheme, shorter key; stored as `<salt>:<hash>`)
// ---------------------------------------------------------------------------

export async function hashPin(pin: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = await scrypt(pin, salt, PIN_KEY_LENGTH);
  return `${salt}:${derived.toString("hex")}`;
}

export async function verifyPin(
  pin: string,
  stored: string | null | undefined
): Promise<boolean> {
  if (!stored) return false;
  const [salt, expectedHex] = stored.split(":");
  if (!salt || !expectedHex) return false;
  const expected = Buffer.from(expectedHex, "hex");
  const actual = await scrypt(pin, salt, expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

// ---------------------------------------------------------------------------
// Sessions (signed JWT in an httpOnly cookie)
// ---------------------------------------------------------------------------

/**
 * What a session cookie proves. `sessionVersion` is copied from the user row
 * when the cookie is issued; bumping the row's version (on a password change)
 * invalidates every cookie issued before it.
 */
export type Session = { userId: number; sessionVersion: number };

function secretKey() {
  return new TextEncoder().encode(ENV.sessionSecret);
}

export async function createSessionToken(
  session: Session,
  ttlMs = SESSION_TTL_MS
): Promise<string> {
  const expires = Math.floor((Date.now() + ttlMs) / 1000);
  return new SignJWT({ sv: session.sessionVersion })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(String(session.userId))
    .setIssuedAt()
    .setExpirationTime(expires)
    .sign(secretKey());
}

export async function verifySessionToken(
  token: string | undefined | null
): Promise<Session | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      algorithms: ["HS256"],
    });
    const userId = Number(payload.sub);
    const sessionVersion = payload.sv;
    if (!Number.isInteger(userId) || userId <= 0) return null;
    if (typeof sessionVersion !== "number" || !Number.isInteger(sessionVersion))
      return null;
    return { userId, sessionVersion };
  } catch {
    return null;
  }
}

export function sessionCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: ENV.isProduction,
  };
}

export async function issueSession(
  res: Response,
  user: { id: number; sessionVersion: number }
) {
  const token = await createSessionToken({
    userId: user.id,
    sessionVersion: user.sessionVersion,
  });
  res.cookie(COOKIE_NAME, token, {
    ...sessionCookieOptions(),
    maxAge: SESSION_TTL_MS,
  });
}

export function clearSession(res: Response) {
  res.clearCookie(COOKIE_NAME, sessionCookieOptions());
}

/** The session carried by the request cookie, or null when absent or invalid. */
export async function readSession(req: Request): Promise<Session | null> {
  const cookies = parseCookieHeader(req.headers.cookie ?? "");
  return verifySessionToken(cookies[COOKIE_NAME]);
}

// ---------------------------------------------------------------------------
// Attempt limits (in memory; enough for a single-instance deployment)
// ---------------------------------------------------------------------------

const WINDOW_MS = 15 * 60 * 1000;
/** Upper bound on tracked keys, so an attacker spraying addresses cannot grow memory without limit. */
const MAX_TRACKED_KEYS = 10_000;
const PRUNE_EVERY = 200;

/** Attempts allowed per key within a 15-minute window. */
export const LIMITS = {
  /** Sign-ins against one email from one address. */
  loginPerAccount: 8,
  /** Sign-ins from one address, whatever the email. */
  loginPerAddress: 40,
  /** New accounts from one address. */
  registerPerAddress: 10,
  /** PIN guesses for one user. */
  pinPerUser: 10,
} as const;

const attempts = new Map<string, { count: number; windowStart: number }>();
let callsSincePrune = 0;

function prune(now: number) {
  for (const [key, entry] of attempts)
    if (now - entry.windowStart > WINDOW_MS) attempts.delete(key);
  if (attempts.size > MAX_TRACKED_KEYS) {
    // Still over the cap with live entries only: drop the oldest ones.
    let excess = attempts.size - MAX_TRACKED_KEYS;
    for (const key of attempts.keys()) {
      if (excess-- <= 0) break;
      attempts.delete(key);
    }
  }
}

/**
 * Count one attempt against `key` and say whether it may proceed. The attempt
 * is counted before the work happens, so parallel requests cannot all slip
 * past the limit together. Once blocked, the key stays blocked until its
 * window ends; `clearAttempts` lifts it early (after a successful sign-in).
 */
export function takeAttempt(
  key: string,
  limit: number,
  now = Date.now()
): { allowed: boolean; retryAfterSeconds: number } {
  if (++callsSincePrune >= PRUNE_EVERY) {
    callsSincePrune = 0;
    prune(now);
  }
  let entry = attempts.get(key);
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    entry = { count: 0, windowStart: now };
    attempts.set(key, entry);
  }
  if (entry.count >= limit)
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil(
        (entry.windowStart + WINDOW_MS - now) / 1000
      ),
    };
  entry.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

/** Give back one attempt, for work that turned out to be legitimate. */
export function releaseAttempt(key: string) {
  const entry = attempts.get(key);
  if (entry && entry.count > 0) entry.count -= 1;
}

export function clearAttempts(key: string) {
  attempts.delete(key);
}
