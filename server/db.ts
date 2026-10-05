import {
  ATTACHMENT_URL_PREFIX,
  ERR,
  MAX_ATTACHMENT_TOTAL_BYTES,
} from "@shared/const";
import {
  clampTaxRate,
  computeAmounts,
  roundMoney,
  type TransactionType,
} from "@shared/money";
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, lt, notExists, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { randomBytes } from "node:crypto";
import { Pool } from "pg";
import {
  attachments,
  categories,
  reminders,
  transactionAuditLogs,
  transactions,
  users,
  userSettings,
  type User,
} from "../drizzle/schema";
import { hashPin, verifyPin as verifyPinHash } from "./_core/auth";
import { ENV } from "./_core/env";

type Language = "ar" | "en";
type Theme = "light" | "dark";
type NumberingMode = "auto" | "manual";
type Db = ReturnType<typeof drizzle>;

let _db: Db | null = null;

export function getDb(): Db | null {
  if (!_db && ENV.databaseUrl) {
    const pool = new Pool({
      connectionString: ENV.databaseUrl,
      max: 5,
      // Close idle clients early so a serverless database can suspend between visits.
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 15_000,
    });
    pool.on("error", error =>
      console.error("[Database] Idle client error:", error.message)
    );
    _db = drizzle(pool);
  }
  return _db;
}

function requireDb(): Db {
  const db = getDb();
  if (!db)
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: ERR.DB_UNAVAILABLE,
    });
  return db;
}

const isUniqueViolation = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  (error as { code?: string }).code === "23505";

const defaultCategories: Record<
  Language,
  Record<TransactionType, Array<{ name: string; color: string }>>
> = {
  ar: {
    deposit: [
      { name: "مبيعات", color: "#0F9D82" },
      { name: "خدمات", color: "#29B59B" },
      { name: "أخرى", color: "#5B8DEF" },
    ],
    expense: [
      { name: "تشغيل", color: "#E76F51" },
      { name: "موردون", color: "#E9A23B" },
      { name: "أخرى", color: "#A78BFA" },
    ],
  },
  en: {
    deposit: [
      { name: "Sales", color: "#0F9D82" },
      { name: "Services", color: "#29B59B" },
      { name: "Other", color: "#5B8DEF" },
    ],
    expense: [
      { name: "Operations", color: "#E76F51" },
      { name: "Suppliers", color: "#E9A23B" },
      { name: "Other", color: "#A78BFA" },
    ],
  },
};

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export type UserRow = User;

export async function getUserById(id: number) {
  const db = requireDb();
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return rows[0];
}

export async function getUserByEmail(email: string) {
  const db = requireDb();
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.email, email.trim().toLowerCase()))
    .limit(1);
  return rows[0];
}

export async function createUser(input: {
  name: string;
  email: string;
  passwordHash: string;
  language: Language;
}) {
  const db = requireDb();
  const openId = `local_${randomBytes(12).toString("hex")}`;
  try {
    const [user] = await db
      .insert(users)
      .values({
        openId,
        name: input.name.trim(),
        email: input.email.trim().toLowerCase(),
        passwordHash: input.passwordHash,
        loginMethod: "password",
      })
      .returning();
    await db
      .insert(userSettings)
      .values({ userId: user.id, language: input.language });
    await db.insert(categories).values(
      (["deposit", "expense"] as TransactionType[]).flatMap(type =>
        defaultCategories[input.language][type].map(category => ({
          userId: user.id,
          type,
          ...category,
        }))
      )
    );
    return user;
  } catch (error) {
    if (isUniqueViolation(error))
      throw new TRPCError({ code: "CONFLICT", message: ERR.EMAIL_TAKEN });
    throw error;
  }
}

export async function updateUserName(userId: number, name: string) {
  const db = requireDb();
  await db.update(users).set({ name: name.trim() }).where(eq(users.id, userId));
}

/** Store a new password hash and invalidate every session issued before it. */
export async function updateUserPassword(userId: number, passwordHash: string) {
  const db = requireDb();
  const [updated] = await db
    .update(users)
    .set({ passwordHash, sessionVersion: sql`${users.sessionVersion} + 1` })
    .where(eq(users.id, userId))
    .returning();
  return updated;
}

export async function touchLastSignedIn(userId: number) {
  const db = requireDb();
  await db
    .update(users)
    .set({ lastSignedIn: new Date() })
    .where(eq(users.id, userId));
}

// ---------------------------------------------------------------------------
// Settings and categories
// ---------------------------------------------------------------------------

async function ensureSettings(userId: number) {
  const db = requireDb();
  const existing = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);
  if (existing[0]) return existing[0];
  const [created] = await db
    .insert(userSettings)
    .values({ userId })
    .returning();
  return created;
}

async function ensureCategories(userId: number, language: Language) {
  const db = requireDb();
  const existing = await db
    .select()
    .from(categories)
    .where(eq(categories.userId, userId));
  const rowsToAdd = (["deposit", "expense"] as TransactionType[]).flatMap(
    type => {
      const hasType = existing.some(category => category.type === type);
      return hasType
        ? []
        : defaultCategories[language][type].map(category => ({
            userId,
            type,
            ...category,
          }));
    }
  );
  if (rowsToAdd.length) await db.insert(categories).values(rowsToAdd);
}

export async function addCategory(
  userId: number,
  input: { name: string; type: TransactionType; color?: string }
) {
  const db = requireDb();
  try {
    const [created] = await db
      .insert(categories)
      .values({
        userId,
        type: input.type,
        name: input.name.trim(),
        color:
          input.color || (input.type === "deposit" ? "#0F9D82" : "#E76F51"),
      })
      .returning({ id: categories.id });
    return { id: created.id };
  } catch (error) {
    if (isUniqueViolation(error))
      throw new TRPCError({ code: "CONFLICT", message: ERR.CATEGORY_EXISTS });
    throw error;
  }
}

export async function renameCategory(
  userId: number,
  categoryId: number,
  input: { name: string; color?: string }
) {
  const db = requireDb();
  try {
    await db
      .update(categories)
      .set({
        name: input.name.trim(),
        ...(input.color ? { color: input.color } : {}),
      })
      .where(and(eq(categories.id, categoryId), eq(categories.userId, userId)));
  } catch (error) {
    if (isUniqueViolation(error))
      throw new TRPCError({ code: "CONFLICT", message: ERR.CATEGORY_EXISTS });
    throw error;
  }
}

export async function deleteCategory(userId: number, categoryId: number) {
  const db = requireDb();
  const usedByTransaction = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(
      and(
        eq(transactions.categoryId, categoryId),
        eq(transactions.userId, userId)
      )
    )
    .limit(1);
  if (usedByTransaction[0])
    throw new TRPCError({ code: "CONFLICT", message: ERR.CATEGORY_IN_USE });
  await db
    .delete(categories)
    .where(and(eq(categories.id, categoryId), eq(categories.userId, userId)));
}

export async function updateSettings(
  userId: number,
  input: {
    language?: Language;
    theme?: Theme;
    taxEnabled?: boolean;
    taxRate?: number;
    numberingMode?: NumberingMode;
    depositPrefix?: string;
    expensePrefix?: string;
    depositStart?: number;
    expenseStart?: number;
    pinEnabled?: boolean;
    pin?: string;
  }
) {
  const db = requireDb();
  await ensureSettings(userId);
  const update: Partial<typeof userSettings.$inferInsert> = {};
  if (input.language) update.language = input.language;
  if (input.theme) update.theme = input.theme;
  if (typeof input.taxEnabled === "boolean")
    update.taxEnabled = input.taxEnabled;
  if (typeof input.taxRate === "number")
    update.taxRate = clampTaxRate(input.taxRate);
  if (input.numberingMode) update.numberingMode = input.numberingMode;
  if (input.depositPrefix) update.depositPrefix = input.depositPrefix.trim();
  if (input.expensePrefix) update.expensePrefix = input.expensePrefix.trim();
  if (typeof input.depositStart === "number")
    update.depositStart = Math.max(1, Math.floor(input.depositStart));
  if (typeof input.expenseStart === "number")
    update.expenseStart = Math.max(1, Math.floor(input.expenseStart));
  if (typeof input.pinEnabled === "boolean")
    update.pinEnabled = input.pinEnabled;
  if (input.pin) update.pinHash = await hashPin(input.pin);
  if (input.pinEnabled === false) update.pinHash = null;
  if (Object.keys(update).length)
    await db
      .update(userSettings)
      .set(update)
      .where(eq(userSettings.userId, userId));
}

export async function verifyPin(userId: number, pin: string) {
  const settings = await ensureSettings(userId);
  if (!settings.pinEnabled || !settings.pinHash) return true;
  return verifyPinHash(pin, settings.pinHash);
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export async function getDashboard(userId: number) {
  const db = requireDb();
  const settings = await ensureSettings(userId);
  await ensureCategories(userId, settings.language);
  const [categoryRows, allTransactionRows, reminderRows, auditRows] =
    await Promise.all([
      db
        .select()
        .from(categories)
        .where(eq(categories.userId, userId))
        .orderBy(asc(categories.type), asc(categories.name)),
      db
        .select()
        .from(transactions)
        .where(eq(transactions.userId, userId))
        .orderBy(desc(transactions.transactionDate), desc(transactions.id)),
      db
        .select()
        .from(reminders)
        .where(eq(reminders.userId, userId))
        .orderBy(asc(reminders.reminderDate)),
      db
        .select()
        .from(transactionAuditLogs)
        .where(eq(transactionAuditLogs.userId, userId))
        .orderBy(
          desc(transactionAuditLogs.createdAt),
          desc(transactionAuditLogs.id)
        )
        .limit(30),
    ]);

  const categoryMap = new Map(
    categoryRows.map(category => [category.id, category])
  );
  const mapRecord = (record: (typeof allTransactionRows)[number]) => ({
    id: record.id,
    recordNumber: record.recordNumber,
    type: record.type,
    transactionDate: record.transactionDate,
    invoiceNumber: record.invoiceNumber ?? "",
    categoryId: record.categoryId,
    categoryName: categoryMap.get(record.categoryId)?.name ?? "",
    categoryColor: categoryMap.get(record.categoryId)?.color ?? "#94A3B8",
    customerName: record.customerName ?? "",
    taxNumber: record.taxNumber ?? "",
    amountBeforeTax: Number(record.amountBeforeTax),
    taxRate: Number(record.taxRate),
    taxAmount: Number(record.taxAmount),
    totalAmount: Number(record.totalAmount),
    attachmentName: record.attachmentName,
    attachmentMime: record.attachmentMime,
    // Only attachments stored by this server can be opened; older platform links are kept as names only.
    attachmentUrl: record.attachmentUrl?.startsWith(ATTACHMENT_URL_PREFIX)
      ? record.attachmentUrl
      : null,
    archived: record.archived,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });
  const records = allTransactionRows
    .filter(record => !record.archived)
    .map(mapRecord);
  const archivedTransactions = allTransactionRows
    .filter(record => record.archived)
    .map(mapRecord);

  const totals = records.reduce(
    (summary, record) => {
      if (record.type === "deposit") summary.deposits += record.totalAmount;
      else summary.expenses += record.totalAmount;
      return summary;
    },
    { deposits: 0, expenses: 0 }
  );

  return {
    settings: {
      language: settings.language,
      theme: settings.theme,
      taxEnabled: settings.taxEnabled,
      taxRate: Number(settings.taxRate),
      numberingMode: settings.numberingMode,
      pinEnabled: settings.pinEnabled,
      depositPrefix: settings.depositPrefix,
      expensePrefix: settings.expensePrefix,
      depositStart: settings.depositStart,
      expenseStart: settings.expenseStart,
    },
    categories: categoryRows.map(category => ({
      id: category.id,
      name: category.name,
      type: category.type,
      color: category.color,
    })),
    transactions: records,
    archivedTransactions,
    auditLogs: auditRows.map(log => ({
      id: log.id,
      transactionId: log.transactionId,
      action: log.action,
      details: log.details ?? "",
      createdAt: log.createdAt,
    })),
    reminders: reminderRows.map(reminder => ({
      id: reminder.id,
      title: reminder.title,
      reminderDate: reminder.reminderDate,
      enabled: reminder.enabled,
    })),
    summary: {
      deposits: roundMoney(totals.deposits),
      expenses: roundMoney(totals.expenses),
      balance: roundMoney(totals.deposits - totals.expenses),
    },
  };
}

export type DashboardData = Awaited<ReturnType<typeof getDashboard>>;

// ---------------------------------------------------------------------------
// Transactions
// ---------------------------------------------------------------------------

export type AttachmentLink = { name: string; mimeType: string; url: string };

export type TransactionInput = {
  type: TransactionType;
  categoryId: number;
  amount: number;
  amountIncludesTax: boolean;
  taxEnabled: boolean;
  taxRate: number;
  numberingMode: NumberingMode;
  recordNumber?: string;
  transactionDate: string;
  invoiceNumber?: string;
  customerName?: string;
  taxNumber?: string;
  /** undefined keeps the current attachment, null removes it, an object replaces it. */
  attachment?: AttachmentLink | null;
};

export function attachmentIdFromUrl(
  url: string | null | undefined
): number | null {
  if (!url || !url.startsWith(ATTACHMENT_URL_PREFIX)) return null;
  const id = Number(url.slice(ATTACHMENT_URL_PREFIX.length));
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function requireCategory(
  db: Db,
  userId: number,
  categoryId: number,
  type: TransactionType
) {
  const rows = await db
    .select({ id: categories.id })
    .from(categories)
    .where(
      and(
        eq(categories.id, categoryId),
        eq(categories.userId, userId),
        eq(categories.type, type)
      )
    )
    .limit(1);
  if (!rows[0])
    throw new TRPCError({ code: "BAD_REQUEST", message: ERR.INVALID_CATEGORY });
}

async function requireOwnedAttachment(
  db: Db,
  userId: number,
  link: AttachmentLink
) {
  const id = attachmentIdFromUrl(link.url);
  if (!id)
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: ERR.ATTACHMENT_NOT_FOUND,
    });
  const rows = await db
    .select({
      id: attachments.id,
      fileName: attachments.fileName,
      mimeType: attachments.mimeType,
    })
    .from(attachments)
    .where(and(eq(attachments.id, id), eq(attachments.userId, userId)))
    .limit(1);
  if (!rows[0])
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: ERR.ATTACHMENT_NOT_FOUND,
    });
  // The stored name and type are what the file really is; the link only names it.
  return { name: rows[0].fileName, mimeType: rows[0].mimeType, url: link.url };
}

async function nextRecordNumber(db: Db, userId: number, type: TransactionType) {
  const settings = await ensureSettings(userId);
  const prefix =
    type === "deposit" ? settings.depositPrefix : settings.expensePrefix;
  const start =
    type === "deposit" ? settings.depositStart : settings.expenseStart;
  const existing = await db
    .select({ recordNumber: transactions.recordNumber })
    .from(transactions)
    .where(and(eq(transactions.userId, userId), eq(transactions.type, type)));
  const used = new Set(existing.map(row => row.recordNumber));
  let next = start;
  while (used.has(`${prefix}${String(next).padStart(4, "0")}`)) next += 1;
  return `${prefix}${String(next).padStart(4, "0")}`;
}

const auditDetails = (record: {
  recordNumber: string;
  type: TransactionType;
  totalAmount: number;
}) =>
  JSON.stringify({
    recordNumber: record.recordNumber,
    type: record.type,
    totalAmount: record.totalAmount,
  });

export async function createTransaction(
  userId: number,
  input: TransactionInput
) {
  const db = requireDb();
  await requireCategory(db, userId, input.categoryId, input.type);
  const attachment = input.attachment
    ? await requireOwnedAttachment(db, userId, input.attachment)
    : null;

  const amounts = computeAmounts(input);
  const supplied = input.recordNumber?.trim();
  const recordNumber =
    input.numberingMode === "manual" && supplied
      ? supplied
      : await nextRecordNumber(db, userId, input.type);

  try {
    const [inserted] = await db
      .insert(transactions)
      .values({
        userId,
        categoryId: input.categoryId,
        recordNumber,
        type: input.type,
        transactionDate: input.transactionDate,
        invoiceNumber:
          input.type === "expense" ? input.invoiceNumber?.trim() || null : null,
        customerName: input.customerName?.trim() || null,
        taxNumber:
          input.type === "expense" ? input.taxNumber?.trim() || null : null,
        ...amounts,
        attachmentName: attachment?.name ?? null,
        attachmentMime: attachment?.mimeType ?? null,
        attachmentUrl: attachment?.url ?? null,
      })
      .returning({ id: transactions.id });
    await db.insert(transactionAuditLogs).values({
      userId,
      transactionId: inserted.id,
      action: "created",
      details: auditDetails({
        recordNumber,
        type: input.type,
        totalAmount: amounts.totalAmount,
      }),
    });
    return { id: inserted.id, recordNumber };
  } catch (error) {
    if (isUniqueViolation(error))
      throw new TRPCError({
        code: "CONFLICT",
        message: ERR.RECORD_NUMBER_TAKEN,
      });
    throw error;
  }
}

export async function updateTransaction(
  userId: number,
  transactionId: number,
  input: TransactionInput
) {
  const db = requireDb();
  await requireCategory(db, userId, input.categoryId, input.type);
  const [current] = await db
    .select()
    .from(transactions)
    .where(
      and(eq(transactions.id, transactionId), eq(transactions.userId, userId))
    )
    .limit(1);
  if (!current)
    throw new TRPCError({
      code: "NOT_FOUND",
      message: ERR.TRANSACTION_NOT_FOUND,
    });
  const attachment = input.attachment
    ? await requireOwnedAttachment(db, userId, input.attachment)
    : input.attachment;

  const amounts = computeAmounts(input);
  const recordNumber = input.recordNumber?.trim() || current.recordNumber;
  const attachmentChanged =
    input.attachment !== undefined &&
    (input.attachment?.url ?? null) !== current.attachmentUrl;

  try {
    await db
      .update(transactions)
      .set({
        categoryId: input.categoryId,
        recordNumber,
        type: input.type,
        transactionDate: input.transactionDate,
        invoiceNumber:
          input.type === "expense" ? input.invoiceNumber?.trim() || null : null,
        customerName: input.customerName?.trim() || null,
        taxNumber:
          input.type === "expense" ? input.taxNumber?.trim() || null : null,
        ...amounts,
        ...(attachment !== undefined
          ? {
              attachmentName: attachment?.name ?? null,
              attachmentMime: attachment?.mimeType ?? null,
              attachmentUrl: attachment?.url ?? null,
            }
          : {}),
      })
      .where(
        and(eq(transactions.id, transactionId), eq(transactions.userId, userId))
      );
  } catch (error) {
    if (isUniqueViolation(error))
      throw new TRPCError({
        code: "CONFLICT",
        message: ERR.RECORD_NUMBER_TAKEN,
      });
    throw error;
  }

  // The previous file is no longer referenced by anything; free its bytes.
  if (attachmentChanged) {
    const previousId = attachmentIdFromUrl(current.attachmentUrl);
    if (previousId) await deleteAttachment(userId, previousId);
  }

  await db.insert(transactionAuditLogs).values({
    userId,
    transactionId,
    action: "updated",
    details: auditDetails({
      recordNumber,
      type: input.type,
      totalAmount: amounts.totalAmount,
    }),
  });
}

async function setArchived(
  userId: number,
  transactionId: number,
  archived: boolean
) {
  const db = requireDb();
  const [updated] = await db
    .update(transactions)
    .set({ archived })
    .where(
      and(
        eq(transactions.id, transactionId),
        eq(transactions.userId, userId),
        eq(transactions.archived, !archived)
      )
    )
    .returning({
      recordNumber: transactions.recordNumber,
      type: transactions.type,
      totalAmount: transactions.totalAmount,
    });
  if (!updated)
    throw new TRPCError({
      code: "NOT_FOUND",
      message: ERR.TRANSACTION_NOT_FOUND,
    });
  await db.insert(transactionAuditLogs).values({
    userId,
    transactionId,
    action: archived ? "archived" : "restored",
    details: auditDetails(updated),
  });
}

export const archiveTransaction = (userId: number, transactionId: number) =>
  setArchived(userId, transactionId, true);
export const restoreTransaction = (userId: number, transactionId: number) =>
  setArchived(userId, transactionId, false);

// ---------------------------------------------------------------------------
// Attachments
// ---------------------------------------------------------------------------

/** Uploads that never made it onto a transaction are kept this long for the dialog to finish. */
const ORPHAN_GRACE_MS = 60 * 60 * 1000;

/** The link a transaction stores for an attachment row: the URL prefix followed by its id. */
const attachmentLink = sql`${ATTACHMENT_URL_PREFIX}::text || ${attachments.id}::text`;

/** Rows of this user that no transaction (archived ones included) points at. */
const unlinkedAttachments = (db: Db, userId: number) =>
  and(
    eq(attachments.userId, userId),
    notExists(
      db
        .select({ one: sql`1` })
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, userId),
            eq(transactions.attachmentUrl, attachmentLink)
          )
        )
    )
  );

/** Free uploads that were abandoned before their transaction was saved. */
async function deleteOrphanAttachments(db: Db, userId: number, now: Date) {
  await db
    .delete(attachments)
    .where(
      and(
        unlinkedAttachments(db, userId),
        lt(attachments.createdAt, new Date(now.getTime() - ORPHAN_GRACE_MS))
      )
    );
}

export async function deleteUnlinkedAttachment(userId: number, id: number) {
  const db = requireDb();
  await db
    .delete(attachments)
    .where(and(eq(attachments.id, id), unlinkedAttachments(db, userId)));
}

export async function createAttachment(
  userId: number,
  input: { fileName: string; mimeType: string; data: Buffer }
) {
  const db = requireDb();
  await deleteOrphanAttachments(db, userId, new Date());
  const [usage] = await db
    .select({
      total: sql<number>`coalesce(sum(${attachments.size}), 0)::bigint`,
    })
    .from(attachments)
    .where(eq(attachments.userId, userId));
  if (
    Number(usage?.total ?? 0) + input.data.byteLength >
    MAX_ATTACHMENT_TOTAL_BYTES
  )
    throw new TRPCError({
      code: "PAYLOAD_TOO_LARGE",
      message: ERR.ATTACHMENT_QUOTA_EXCEEDED,
    });
  const [row] = await db
    .insert(attachments)
    .values({
      userId,
      fileName: input.fileName,
      mimeType: input.mimeType,
      size: input.data.byteLength,
      data: input.data,
    })
    .returning({ id: attachments.id });
  return row.id;
}

export async function getAttachment(userId: number, id: number) {
  const db = requireDb();
  const rows = await db
    .select()
    .from(attachments)
    .where(and(eq(attachments.id, id), eq(attachments.userId, userId)))
    .limit(1);
  return rows[0];
}

export async function deleteAttachment(userId: number, id: number) {
  const db = requireDb();
  await db
    .delete(attachments)
    .where(and(eq(attachments.id, id), eq(attachments.userId, userId)));
}

// ---------------------------------------------------------------------------
// Reminders
// ---------------------------------------------------------------------------

export async function createReminder(
  userId: number,
  input: { title: string; reminderDate: string }
) {
  const db = requireDb();
  await db.insert(reminders).values({
    userId,
    title: input.title.trim(),
    reminderDate: input.reminderDate,
  });
}

export async function updateReminder(
  userId: number,
  reminderId: number,
  input: { title?: string; reminderDate?: string; enabled?: boolean }
) {
  const db = requireDb();
  const update: Partial<typeof reminders.$inferInsert> = {};
  if (input.title !== undefined) update.title = input.title.trim();
  if (input.reminderDate !== undefined)
    update.reminderDate = input.reminderDate;
  if (typeof input.enabled === "boolean") update.enabled = input.enabled;
  if (Object.keys(update).length)
    await db
      .update(reminders)
      .set(update)
      .where(and(eq(reminders.id, reminderId), eq(reminders.userId, userId)));
}

export async function deleteReminder(userId: number, reminderId: number) {
  const db = requireDb();
  await db
    .delete(reminders)
    .where(and(eq(reminders.id, reminderId), eq(reminders.userId, userId)));
}
