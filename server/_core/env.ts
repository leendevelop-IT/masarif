// Runtime configuration. Values are read at use time so tests can stub them.
const DEV_SESSION_SECRET = "masarif-dev-only-secret-change-me";

export const ENV = {
  get databaseUrl() {
    return process.env.DATABASE_URL ?? "";
  },
  get isProduction() {
    return process.env.NODE_ENV === "production";
  },
  get port() {
    return Number(process.env.PORT || "3000");
  },
  /** Secret used to sign session tokens. Required in production. */
  get sessionSecret() {
    const secret = process.env.SESSION_SECRET;
    if (secret && secret.length >= 16) return secret;
    if (this.isProduction)
      throw new Error(
        "SESSION_SECRET must be set to at least 16 characters in production"
      );
    return DEV_SESSION_SECRET;
  },
  /** Run pending database migrations on startup (default on; set RUN_MIGRATIONS=false to skip). */
  get runMigrations() {
    return process.env.RUN_MIGRATIONS !== "false";
  },
};
