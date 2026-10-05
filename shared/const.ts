/** Name of the httpOnly session cookie set after sign-in. */
export const COOKIE_NAME = "masarif_session";
/** Sessions last 30 days; signing in again issues a fresh one. */
export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;
/** Attachments are served from this path followed by their id. */
export const ATTACHMENT_URL_PREFIX = "/api/attachments/";
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
/** All of one account's attachments together may not exceed this. */
export const MAX_ATTACHMENT_TOTAL_BYTES = 100 * 1024 * 1024;
export const MIN_PASSWORD_LENGTH = 8;

/**
 * Error codes thrown by the server. The client maps them to translated
 * messages, so the API itself stays language-neutral.
 */
export const ERR = {
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  DB_UNAVAILABLE: "DB_UNAVAILABLE",
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  EMAIL_TAKEN: "EMAIL_TAKEN",
  TOO_MANY_ATTEMPTS: "TOO_MANY_ATTEMPTS",
  WRONG_PASSWORD: "WRONG_PASSWORD",
  INVALID_CATEGORY: "INVALID_CATEGORY",
  CATEGORY_EXISTS: "CATEGORY_EXISTS",
  CATEGORY_IN_USE: "CATEGORY_IN_USE",
  RECORD_NUMBER_TAKEN: "RECORD_NUMBER_TAKEN",
  TRANSACTION_NOT_FOUND: "TRANSACTION_NOT_FOUND",
  INVALID_PIN: "INVALID_PIN",
  ATTACHMENT_TOO_LARGE: "ATTACHMENT_TOO_LARGE",
  ATTACHMENT_EMPTY: "ATTACHMENT_EMPTY",
  ATTACHMENT_NOT_FOUND: "ATTACHMENT_NOT_FOUND",
  ATTACHMENT_QUOTA_EXCEEDED: "ATTACHMENT_QUOTA_EXCEEDED",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ErrorCode = (typeof ERR)[keyof typeof ERR];
