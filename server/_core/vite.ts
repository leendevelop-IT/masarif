import express, { type Express } from "express";
import fs from "node:fs";
import { type Server } from "node:http";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "../..");

/** Development only: serve the client through Vite with hot reload. Vite is loaded lazily so production never needs it. */
export async function setupVite(app: Express, server: Server) {
  const { createServer: createViteServer } = await import("vite");
  const vite = await createViteServer({
    configFile: path.join(projectRoot, "vite.config.ts"),
    server: {
      middlewareMode: true,
      hmr: { server },
      allowedHosts: true as const,
    },
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    try {
      const template = await fs.promises.readFile(
        path.join(projectRoot, "client", "index.html"),
        "utf-8"
      );
      const page = await vite.transformIndexHtml(req.originalUrl, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (error) {
      vite.ssrFixStacktrace(error as Error);
      next(error);
    }
  });
}

/** Production: serve the built client from dist/public with long-lived caching for hashed assets. */
export function serveStatic(app: Express) {
  const distPath = path.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  app.use(
    "/assets",
    express.static(path.join(distPath, "assets"), {
      immutable: true,
      maxAge: "1y",
      fallthrough: false,
    })
  );
  app.use(express.static(distPath, { index: false, maxAge: "1h" }));

  // Every other path is a client route: send the shell and let the router take over.
  app.use("*", (req, res) => {
    if (req.originalUrl.startsWith("/api/")) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res
      .set("Cache-Control", "no-cache")
      .sendFile(path.resolve(distPath, "index.html"));
  });
}
