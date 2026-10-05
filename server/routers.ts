import { z } from "zod";
import * as db from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { COOKIE_NAME } from "@shared/const";
import { storagePut } from "./storage";

const transactionInput = z.object({
  type: z.enum(["deposit", "expense"]),
  categoryId: z.number().int().positive(),
  amount: z.number().positive().max(100_000_000),
  taxEnabled: z.boolean(),
  taxRate: z.number().min(0).max(100),
  numberingMode: z.enum(["auto", "manual"]),
  recordNumber: z.string().trim().max(64).optional(),
  transactionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  invoiceNumber: z.string().trim().max(80).optional(),
  customerName: z.string().trim().max(160).optional(),
  taxNumber: z.string().trim().max(80).optional(),
  amountIncludesTax: z.boolean().default(false),
  attachmentName: z.string().max(255).optional(),
  attachmentMime: z.string().max(120).optional(),
  attachmentUrl: z.string().startsWith("/manus-storage/").max(512).optional(),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  finance: router({
    dashboard: protectedProcedure.query(({ ctx }) => db.getDashboard(ctx.user.id)),
    uploadAttachment: protectedProcedure
      .input(z.object({ fileName: z.string().trim().min(1).max(255), mimeType: z.string().max(120), fileData: z.string().max(14_000_000) }))
      .mutation(async ({ ctx, input }) => {
        const data = Buffer.from(input.fileData, "base64");
        if (data.byteLength > 10 * 1024 * 1024) throw new Error("حجم المرفق يجب ألا يتجاوز 10 ميغابايت");
        const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
        const uploaded = await storagePut(`users/${ctx.user.id}/attachments/${safeName}`, data, input.mimeType || "application/octet-stream");
        return { ...uploaded, fileName: input.fileName, mimeType: input.mimeType };
      }),
    createTransaction: protectedProcedure.input(transactionInput).mutation(({ ctx, input }) => db.createTransaction(ctx.user.id, input)),
    updateTransaction: protectedProcedure.input(transactionInput.extend({ id: z.number().int().positive() })).mutation(({ ctx, input }) => db.updateTransaction(ctx.user.id, input.id, input)),
    archiveTransaction: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ ctx, input }) => db.archiveTransaction(ctx.user.id, input.id)),
    restoreTransaction: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ ctx, input }) => db.restoreTransaction(ctx.user.id, input.id)),
    createCategory: protectedProcedure
      .input(z.object({ name: z.string().trim().min(1).max(120), type: z.enum(["deposit", "expense"]), color: z.string().max(16).optional() }))
      .mutation(({ ctx, input }) => db.addCategory(ctx.user.id, input)),
    deleteCategory: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ ctx, input }) => db.deleteCategory(ctx.user.id, input.id)),
    updateSettings: protectedProcedure
      .input(z.object({
        language: z.enum(["ar", "en"]).optional(),
        theme: z.enum(["light", "dark"]).optional(),
        taxEnabled: z.boolean().optional(),
        taxRate: z.number().min(0).max(100).optional(),
        numberingMode: z.enum(["auto", "manual"]).optional(),
        depositPrefix: z.string().trim().min(1).max(16).optional(),
        expensePrefix: z.string().trim().min(1).max(16).optional(),
        depositStart: z.number().int().min(1).max(1_000_000_000).optional(),
        expenseStart: z.number().int().min(1).max(1_000_000_000).optional(),
        pinEnabled: z.boolean().optional(),
        pin: z.string().regex(/^\d{4,8}$/).optional(),
      }))
      .mutation(({ ctx, input }) => db.updateSettings(ctx.user.id, input)),
    verifyPin: protectedProcedure
      .input(z.object({ pin: z.string().regex(/^\d{4,8}$/) }))
      .mutation(async ({ ctx, input }) => {
        const valid = await db.verifyPin(ctx.user.id, input.pin);
        if (!valid) throw new Error("الرقم السري غير صحيح");
        return { valid: true };
      }),
    createReminder: protectedProcedure
      .input(z.object({ title: z.string().trim().min(1).max(200), reminderDate: z.string().min(10).max(16) }))
      .mutation(({ ctx, input }) => db.createReminder(ctx.user.id, input)),
    toggleReminder: protectedProcedure
      .input(z.object({ id: z.number().int().positive(), enabled: z.boolean() }))
      .mutation(({ ctx, input }) => db.toggleReminder(ctx.user.id, input.id, input.enabled)),
    deleteReminder: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ ctx, input }) => db.deleteReminder(ctx.user.id, input.id)),
  }),
});

export type AppRouter = typeof appRouter;
