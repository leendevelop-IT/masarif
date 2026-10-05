import { ERR } from "@shared/const";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

/** Driver error codes that mean the database could not be reached at all. */
const CONNECTION_ERROR = /^(ECONN|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|08|57P)/;

const isConnectionFailure = (cause: unknown) =>
  typeof cause === "object" &&
  cause !== null &&
  "code" in cause &&
  typeof cause.code === "string" &&
  CONNECTION_ERROR.test(cause.code);

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    // Expected errors carry a code the client translates. Anything unexpected
    // (a driver error, a bug) is logged server-side and reaches the browser
    // only as a generic code, never with its raw message.
    if (error.code !== "INTERNAL_SERVER_ERROR") return shape;
    if (error.message === ERR.DB_UNAVAILABLE) return shape;
    return {
      ...shape,
      message: isConnectionFailure(error.cause)
        ? ERR.DB_UNAVAILABLE
        : ERR.INTERNAL_ERROR,
      data: { ...shape.data, stack: undefined },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async ({ ctx, next }) => {
  if (!ctx.user)
    throw new TRPCError({ code: "UNAUTHORIZED", message: ERR.UNAUTHORIZED });
  return next({ ctx: { ...ctx, user: ctx.user } });
});

export const protectedProcedure = t.procedure.use(requireUser);
