import {
  ATTACHMENT_URL_PREFIX,
  ERR,
  MAX_ATTACHMENT_BYTES,
  MIN_PASSWORD_LENGTH,
} from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { normalizeMimeType } from "./_core/attachments";
import {
  clearLoginFailures,
  clearSession,
  hashPassword,
  issueSession,
  loginThrottle,
  recordLoginFailure,
  verifyPassword,
} from "./_core/auth";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import * as db from "./db";

const emailInput = z.string().trim().toLowerCase().email().max(320);
const passwordInput = z.string().min(MIN_PASSWORD_LENGTH).max(200);
const nameInput = z.string().trim().min(1).max(120);
const languageInput = z.enum(["ar", "en"]);
const idInput = z.object({ id: z.number().int().positive() });
const transactionType = z.enum(["deposit", "expense"]);
const dateInput = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const attachmentInput = z.object({
  name: z.string().trim().min(1).max(255),
  mimeType: z.string().max(120),
  url: z.string().startsWith(ATTACHMENT_URL_PREFIX).max(512),
});

const transactionInput = z.object({
  type: transactionType,
  categoryId: z.number().int().positive(),
  amount: z.number().positive().max(100_000_000),
  amountIncludesTax: z.boolean().default(false),
  taxEnabled: z.boolean(),
  taxRate: z.number().min(0).max(100),
  numberingMode: z.enum(["auto", "manual"]),
  recordNumber: z.string().trim().max(64).optional(),
  transactionDate: dateInput,
  invoiceNumber: z.string().trim().max(80).optional(),
  customerName: z.string().trim().max(160).optional(),
  taxNumber: z.string().trim().max(80).optional(),
  attachment: attachmentInput.nullish(),
});

const publicUser = (user: db.UserRow) => ({
  id: user.id,
  name: user.name ?? "",
  email: user.email ?? "",
});

// Verified against when the email is unknown, so a failed sign-in takes the same time either way.
const dummyHash = hashPassword("not-a-real-password");

export const appRouter = router({
  auth: router({
    me: publicProcedure.query(({ ctx }) =>
      ctx.user ? publicUser(ctx.user) : null
    ),

    register: publicProcedure
      .input(
        z.object({
          name: nameInput,
          email: emailInput,
          password: passwordInput,
          language: languageInput.default("ar"),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const passwordHash = await hashPassword(input.password);
        const user = await db.createUser({
          name: input.name,
          email: input.email,
          passwordHash,
          language: input.language,
        });
        await issueSession(ctx.res, user.id);
        return publicUser(user);
      }),

    login: publicProcedure
      .input(z.object({ email: emailInput, password: passwordInput }))
      .mutation(async ({ ctx, input }) => {
        const throttleKey = `${ctx.req.ip ?? "unknown"}|${input.email}`;
        const gate = loginThrottle(throttleKey);
        if (!gate.allowed)
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: ERR.TOO_MANY_ATTEMPTS,
          });

        const user = await db.getUserByEmail(input.email);
        const valid = user
          ? await verifyPassword(input.password, user.passwordHash)
          : (await verifyPassword(input.password, await dummyHash), false);
        if (!user || !valid) {
          recordLoginFailure(throttleKey);
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: ERR.INVALID_CREDENTIALS,
          });
        }

        clearLoginFailures(throttleKey);
        await db.touchLastSignedIn(user.id);
        await issueSession(ctx.res, user.id);
        return publicUser(user);
      }),

    logout: publicProcedure.mutation(({ ctx }) => {
      clearSession(ctx.res);
      return { success: true } as const;
    }),

    updateProfile: protectedProcedure
      .input(z.object({ name: nameInput }))
      .mutation(async ({ ctx, input }) => {
        await db.updateUserName(ctx.user.id, input.name);
        return { success: true } as const;
      }),

    changePassword: protectedProcedure
      .input(
        z.object({
          currentPassword: z.string().max(200),
          newPassword: passwordInput,
        })
      )
      .mutation(async ({ ctx, input }) => {
        const valid = await verifyPassword(
          input.currentPassword,
          ctx.user.passwordHash
        );
        if (!valid)
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: ERR.WRONG_PASSWORD,
          });
        await db.updateUserPassword(
          ctx.user.id,
          await hashPassword(input.newPassword)
        );
        return { success: true } as const;
      }),
  }),

  finance: router({
    dashboard: protectedProcedure.query(({ ctx }) =>
      db.getDashboard(ctx.user.id)
    ),

    uploadAttachment: protectedProcedure
      .input(
        z.object({
          fileName: z.string().trim().min(1).max(255),
          mimeType: z.string().max(120),
          fileData: z.string().max(14_500_000),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const data = Buffer.from(input.fileData, "base64");
        if (!data.byteLength)
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: ERR.ATTACHMENT_EMPTY,
          });
        if (data.byteLength > MAX_ATTACHMENT_BYTES)
          throw new TRPCError({
            code: "PAYLOAD_TOO_LARGE",
            message: ERR.ATTACHMENT_TOO_LARGE,
          });
        const mimeType = normalizeMimeType(input.mimeType);
        const id = await db.createAttachment(ctx.user.id, {
          fileName: input.fileName,
          mimeType,
          data,
        });
        return {
          id,
          url: `${ATTACHMENT_URL_PREFIX}${id}`,
          name: input.fileName,
          mimeType,
          size: data.byteLength,
        };
      }),

    createTransaction: protectedProcedure
      .input(transactionInput)
      .mutation(({ ctx, input }) => db.createTransaction(ctx.user.id, input)),
    updateTransaction: protectedProcedure
      .input(transactionInput.extend({ id: z.number().int().positive() }))
      .mutation(({ ctx, input }) =>
        db.updateTransaction(ctx.user.id, input.id, input)
      ),
    archiveTransaction: protectedProcedure
      .input(idInput)
      .mutation(({ ctx, input }) =>
        db.archiveTransaction(ctx.user.id, input.id)
      ),
    restoreTransaction: protectedProcedure
      .input(idInput)
      .mutation(({ ctx, input }) =>
        db.restoreTransaction(ctx.user.id, input.id)
      ),

    createCategory: protectedProcedure
      .input(
        z.object({
          name: z.string().trim().min(1).max(120),
          type: transactionType,
          color: z
            .string()
            .regex(/^#[0-9a-fA-F]{6}$/)
            .optional(),
        })
      )
      .mutation(({ ctx, input }) => db.addCategory(ctx.user.id, input)),
    updateCategory: protectedProcedure
      .input(
        idInput.extend({
          name: z.string().trim().min(1).max(120),
          color: z
            .string()
            .regex(/^#[0-9a-fA-F]{6}$/)
            .optional(),
        })
      )
      .mutation(({ ctx, input }) =>
        db.renameCategory(ctx.user.id, input.id, input)
      ),
    deleteCategory: protectedProcedure
      .input(idInput)
      .mutation(({ ctx, input }) => db.deleteCategory(ctx.user.id, input.id)),

    updateSettings: protectedProcedure
      .input(
        z.object({
          language: languageInput.optional(),
          theme: z.enum(["light", "dark"]).optional(),
          taxEnabled: z.boolean().optional(),
          taxRate: z.number().min(0).max(100).optional(),
          numberingMode: z.enum(["auto", "manual"]).optional(),
          depositPrefix: z.string().trim().min(1).max(16).optional(),
          expensePrefix: z.string().trim().min(1).max(16).optional(),
          depositStart: z.number().int().min(1).max(1_000_000_000).optional(),
          expenseStart: z.number().int().min(1).max(1_000_000_000).optional(),
          pinEnabled: z.boolean().optional(),
          pin: z
            .string()
            .regex(/^\d{4,8}$/)
            .optional(),
        })
      )
      .mutation(({ ctx, input }) => db.updateSettings(ctx.user.id, input)),

    verifyPin: protectedProcedure
      .input(z.object({ pin: z.string().regex(/^\d{4,8}$/) }))
      .mutation(async ({ ctx, input }) => {
        const valid = await db.verifyPin(ctx.user.id, input.pin);
        if (!valid)
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: ERR.INVALID_PIN,
          });
        return { valid: true } as const;
      }),

    createReminder: protectedProcedure
      .input(
        z.object({
          title: z.string().trim().min(1).max(200),
          reminderDate: z.string().min(10).max(16),
        })
      )
      .mutation(({ ctx, input }) => db.createReminder(ctx.user.id, input)),
    updateReminder: protectedProcedure
      .input(
        idInput.extend({
          title: z.string().trim().min(1).max(200).optional(),
          reminderDate: z.string().min(10).max(16).optional(),
          enabled: z.boolean().optional(),
        })
      )
      .mutation(({ ctx, input }) =>
        db.updateReminder(ctx.user.id, input.id, input)
      ),
    deleteReminder: protectedProcedure
      .input(idInput)
      .mutation(({ ctx, input }) => db.deleteReminder(ctx.user.id, input.id)),
  }),
});

export type AppRouter = typeof appRouter;
