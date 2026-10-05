import type { Express } from "express";
import * as db from "../db";
import { resolveUser } from "./context";

/** Types browsers may render in place. Everything else downloads. */
const INLINE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "application/pdf",
]);

/** Allowed upload types; anything else is stored as a generic binary download. */
const ACCEPTED_TYPES = new Set([
  ...INLINE_TYPES,
  "image/heic",
  "image/heif",
  "text/plain",
  "text/csv",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

export function normalizeMimeType(value: string) {
  const mime = value.trim().toLowerCase().split(";")[0];
  return ACCEPTED_TYPES.has(mime) ? mime : "application/octet-stream";
}

export function registerAttachmentRoutes(app: Express) {
  app.get("/api/attachments/:id", async (req, res, next) => {
    try {
      const user = await resolveUser(req);
      if (!user) {
        res.status(401).json({ error: "Sign in to open attachments" });
        return;
      }
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        res.status(404).json({ error: "Attachment not found" });
        return;
      }
      const file = await db.getAttachment(user.id, id);
      if (!file) {
        res.status(404).json({ error: "Attachment not found" });
        return;
      }
      const inline =
        INLINE_TYPES.has(file.mimeType) && req.query.download === undefined;
      const encodedName = encodeURIComponent(file.fileName).replace(
        /['()]/g,
        escape
      );
      // Uploaded files never get to run anything. The PDF viewer counts as a
      // plugin, which `sandbox` would switch off, so PDFs keep only the no-source policy.
      const csp =
        file.mimeType === "application/pdf"
          ? "default-src 'none'"
          : "default-src 'none'; sandbox";
      res.set({
        "Content-Type": inline ? file.mimeType : "application/octet-stream",
        "Content-Length": String(file.data.byteLength),
        "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodedName}`,
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": csp,
        "Cache-Control": "private, no-store",
      });
      res.end(file.data);
    } catch (error) {
      next(error);
    }
  });
}
