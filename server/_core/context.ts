import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { readSessionUserId } from "./auth";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;
  try {
    const userId = await readSessionUserId(opts.req);
    if (userId) user = (await db.getUserById(userId)) ?? null;
  } catch (error) {
    // Authentication is optional for public procedures; protected ones reject below.
    console.warn(
      "[Auth] Failed to resolve session:",
      error instanceof Error ? error.message : error
    );
  }
  return { req: opts.req, res: opts.res, user };
}
