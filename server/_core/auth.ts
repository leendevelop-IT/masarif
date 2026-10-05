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
const KEY_LENGTH = 64;

// ---------------------------------------------------------------------------
// Passwords
// ---------------------------------------------------------------------------

/** Hash a password with scrypt. Stored as `scrypt:<salt>:<hash>`. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = await scrypt(password, salt, KEY_LENGTH);
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
// Sessions (signed JWT in an httpOnly cookie)
// ---------------------------------------------------------------------------

function secretKey() {
  return new TextEncoder().encode(ENV.sessionSecret);
}

export async function createSessionToken(
  userId: number,
  ttlMs = SESSION_TTL_MS
): Promise<string> {
  const expires = Math.floor((Date.now() + ttlMs) / 1000);
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(String(userId))
    .setIssuedAt()
    .setExpirationTime(expires)
    .sign(secretKey());
}

export async function verifySessionToken(
  token: string | undefined | null
): Promise<number | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      algorithms: ["HS256"],
    });
    const userId = Number(payload.sub);
    return Number.isInteger(userId) && userId > 0 ? userId : null;
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

export async function issueSession(res: Response, userId: number) {
  const token = await createSessionToken(userId);
  res.cookie(COOKIE_NAME, token, {
    ...sessionCookieOptions(),
    maxAge: SESSION_TTL_MS,
  });
}

export function clearSession(res: Response) {
  res.clearCookie(COOKIE_NAME, sessionCookieOptions());
}

/** Resolve the signed-in user id from the request cookie, or null. */
export async function readSessionUserId(req: Request): Promise<number | null> {
  const cookies = parseCookieHeader(req.headers.cookie ?? "");
  return verifySessionToken(cookies[COOKIE_NAME]);
}

// ---------------------------------------------------------------------------
// Sign-in throttling (in memory; enough for a single-instance deployment)
// ---------------------------------------------------------------------------

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 8;
const failures = new Map<string, { count: number; windowStart: number }>();

function pruneFailures(now: number) {
  if (failures.size < 1000) return;
  for (const [key, entry] of failures)
    if (now - entry.windowStart > WINDOW_MS) failures.delete(key);
}

export function loginThrottle(
  key: string,
  now = Date.now()
): { allowed: boolean; retryAfterSeconds: number } {
  const entry = failures.get(key);
  if (!entry || now - entry.windowStart > WINDOW_MS)
    return { allowed: true, retryAfterSeconds: 0 };
  if (entry.count < MAX_FAILURES)
    return { allowed: true, retryAfterSeconds: 0 };
  return {
    allowed: false,
    retryAfterSeconds: Math.ceil((entry.windowStart + WINDOW_MS - now) / 1000),
  };
}

export function recordLoginFailure(key: string, now = Date.now()) {
  pruneFailures(now);
  const entry = failures.get(key);
  if (!entry || now - entry.windowStart > WINDOW_MS)
    failures.set(key, { count: 1, windowStart: now });
  else entry.count += 1;
}

export function clearLoginFailures(key: string) {
  failures.delete(key);
}
