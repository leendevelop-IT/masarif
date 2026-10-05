import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import path from "node:path";
import { Pool } from "pg";
import { ENV } from "./env";

/**
 * Apply the checked-in migrations in ./drizzle on a dedicated connection,
 * so the app's pool never sees a half-applied migration.
 */
export async function runMigrations() {
  if (!ENV.databaseUrl) {
    console.warn("[Database] DATABASE_URL is not set; skipping migrations");
    return;
  }
  const pool = new Pool({
    connectionString: ENV.databaseUrl,
    max: 1,
    connectionTimeoutMillis: 30_000,
  });
  try {
    await migrate(drizzle(pool), {
      migrationsFolder: path.resolve(process.cwd(), "drizzle"),
    });
    console.log("[Database] Migrations are up to date");
  } finally {
    await pool.end();
  }
}
