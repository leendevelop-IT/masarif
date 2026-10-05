import "dotenv/config";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import express from "express";
import { createServer } from "node:http";
import { appRouter } from "../routers";
import { registerAttachmentRoutes } from "./attachments";
import { createContext } from "./context";
import { ENV } from "./env";
import { runMigrations } from "./migrate";
import { serveStatic, setupVite } from "./vite";

const PRODUCTION_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "img-src 'self' data: blob:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

async function startServer() {
  if (ENV.runMigrations) await runMigrations();

  const app = express();
  const server = createServer(app);

  app.disable("x-powered-by");
  // Railway (and most hosts) terminate TLS at a proxy; trust it for req.ip and secure cookies.
  app.set("trust proxy", 1);

  app.use((_req, res, next) => {
    res.set("X-Content-Type-Options", "nosniff");
    res.set("Referrer-Policy", "same-origin");
    res.set("X-Frame-Options", "DENY");
    if (ENV.isProduction) res.set("Content-Security-Policy", PRODUCTION_CSP);
    next();
  });

  // Attachments arrive base64-encoded inside a JSON mutation (10 MB file ≈ 14 MB JSON).
  app.use(express.json({ limit: "15mb" }));

  app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
  registerAttachmentRoutes(app);
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
      onError({ error, path }) {
        if (error.code === "INTERNAL_SERVER_ERROR")
          console.error(`[tRPC] ${path ?? "?"}:`, error.cause ?? error);
      },
    })
  );

  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = ENV.port;
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error("Invalid PORT");
  server.on("error", error => {
    console.error("Server failed:", error.message);
    process.exit(1);
  });
  server.listen(port, "0.0.0.0", () =>
    console.log(`Server listening on port ${port}`)
  );
}

startServer().catch(error => {
  console.error(error);
  process.exit(1);
});
