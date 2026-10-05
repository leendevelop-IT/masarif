import "dotenv/config";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
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
  "object-src 'none'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

/** Calls the client may bundle into one request. */
const MAX_BATCH_CALLS = 25;

async function startServer() {
  // Fail at boot on a missing SESSION_SECRET rather than on the first sign-in.
  if (ENV.usesDevSessionSecret)
    console.warn(
      "[Auth] SESSION_SECRET is not set; using the built-in development secret"
    );

  if (ENV.runMigrations) await runMigrations();

  const app = express();
  const server = createServer(app);

  app.disable("x-powered-by");
  // The host terminates TLS at a proxy; trust that one hop for req.ip and secure cookies.
  app.set("trust proxy", 1);

  let clientAddressLogged = false;
  app.use((req, res, next) => {
    res.set("X-Content-Type-Options", "nosniff");
    res.set("Referrer-Policy", "same-origin");
    res.set("X-Frame-Options", "DENY");
    if (ENV.isProduction) {
      res.set("Content-Security-Policy", PRODUCTION_CSP);
      res.set(
        "Strict-Transport-Security",
        "max-age=31536000; includeSubDomains"
      );
      if (!clientAddressLogged) {
        // Logged once so the proxy hop count can be checked against the host's logs.
        clientAddressLogged = true;
        console.log(
          `[Proxy] First request: client address ${req.ip} (x-forwarded-for: ${req.headers["x-forwarded-for"] ?? "none"})`
        );
      }
    }
    next();
  });

  // Attachments arrive base64-encoded inside a JSON mutation (10 MB file ≈ 14 MB JSON);
  // every other call is small.
  app.use(
    "/api/trpc/finance.uploadAttachment",
    express.json({ limit: "15mb" })
  );
  app.use(express.json({ limit: "256kb" }));

  app.use("/api/trpc", (req, res, next) => {
    if (
      req.query.batch !== undefined &&
      req.path.split(",").length > MAX_BATCH_CALLS
    ) {
      res.status(413).json({ error: "Too many calls in one batch" });
      return;
    }
    next();
  });

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

  // Anything that escaped a route (a body too large, a failed query) ends as a
  // short JSON error instead of a stack trace or a crashed process.
  app.use(
    (error: unknown, _req: Request, res: Response, _next: NextFunction) => {
      const status =
        typeof error === "object" &&
        error !== null &&
        "status" in error &&
        typeof error.status === "number"
          ? error.status
          : 500;
      if (status >= 500) console.error("[HTTP]", error);
      if (res.headersSent) return;
      res.status(status).json({
        error:
          status === 413
            ? "Request too large"
            : status >= 500
              ? "Internal error"
              : "Bad request",
      });
    }
  );

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
