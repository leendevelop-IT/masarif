import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { Request } from "express";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { readSession } from "./auth";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

/**
 * The signed-in user for this request: a valid session cookie whose version
 * still matches the account. A password change bumps the account's version,
 * which signs out every other device.
 */
export async function resolveUser(req: Request): Promise<User | null> {
  const session = await readSession(req);
  if (!session) return null;
  const user = await db.getUserById(session.userId);
  if (!user || user.sessionVersion !== session.sessionVersion) return null;
  return user;
}

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;
  try {
    user = await resolveUser(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures; protected ones reject below.
    console.warn(
      "[Auth] Failed to resolve session:",
      error instanceof Error ? error.message : error
    );
  }
  return { req: opts.req, res: opts.res, user };
}
