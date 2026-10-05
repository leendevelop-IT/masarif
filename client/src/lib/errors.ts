import { TRPCClientError } from "@trpc/client";
import type { Dictionary } from "./i18n";

/** Turn a server error (a code such as EMAIL_TAKEN) into a sentence in the current language. */
export function describeError(error: unknown, t: Dictionary): string {
  const messages = t.errors as Record<string, string>;
  if (error instanceof TRPCClientError) {
    const message = String(error.message || "");
    if (messages[message]) return messages[message];
    if (error.data?.code === "UNAUTHORIZED") return messages.UNAUTHORIZED;
    if (error.data?.code === "BAD_REQUEST" && error.data?.zodError)
      return messages.GENERIC;
    if (/fetch|network|Failed to fetch|Load failed/i.test(message))
      return messages.NETWORK;
    return messages.GENERIC;
  }
  if (error instanceof Error && error.message && messages[error.message])
    return messages[error.message];
  return messages.GENERIC;
}
