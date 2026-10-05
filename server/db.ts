import { and, asc, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import {
  categories,
  InsertUser,
  reminders,
  transactions,
  transactionAuditLogs,
  users,
  userSettings,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

type TransactionType = "deposit" | "expense";
type Language = "ar" | "en";
type Theme = "light" | "dark";
type NumberingMode = "auto" | "manual";

let _db: ReturnType<typeof drizzle> | null = null;

const defaultCategories: Record<TransactionType, Array<{ name: string; color: string }>> = {
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
};

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) throw new Error("Database is not available");

  const values: InsertUser = { openId: user.openId, lastSignedIn: new Date() };
  const updateSet: Record<string, unknown> = { lastSignedIn: new Date() };
  for (const field of ["name", "email", "loginMethod"] as const) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة حالياً");
  return db;
}

const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const normalizeTaxRate = (value: number) => Math.min(100, Math.max(0, roundMoney(value)));
const hashPin = (pin: string) => {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(pin, salt, 32).toString("hex");
  return `${salt}:${hash}`;
};
const matchesPin = (pin: string, stored?: string | null) => {
  if (!stored) return false;
  const [salt, expected] = stored.split(":");
  if (!salt || !expected) return false;
  const actual = scryptSync(pin, salt, 32).toString("hex");
  return actual.length === expected.length && timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
};

async function ensureSettings(userId: number) {
  const db = await requireDb();
  const existing = await db.select().from(userSettings).where(eq(userSettings.userId, userId)).limit(1);
  if (existing[0]) return existing[0];

  await db.insert(userSettings).values({ userId });
  const created = await db.select().from(userSettings).where(eq(userSettings.userId, userId)).limit(1);
  if (!created[0]) throw new Error("تعذر إنشاء إعدادات المستخدم");
  return created[0];
}

async function ensureCategories(userId: number) {
  const db = await requireDb();
  const existing = await db.select().from(categories).where(eq(categories.userId, userId));
  const rowsToAdd = (["deposit", "expense"] as TransactionType[]).flatMap(type => {
    const hasType = existing.some(category => category.type === type);
    return hasType ? [] : defaultCategories[type].map(category => ({ userId, type, ...category }));
  });
  if (rowsToAdd.length) await db.insert(categories).values(rowsToAdd);
}

export async function getDashboard(userId: number) {
  const db = await requireDb();
  const [settings] = await Promise.all([ensureSettings(userId), ensureCategories(userId)]);
  const [categoryRows, allTransactionRows, reminderRows, auditRows] = await Promise.all([
    db.select().from(categories).where(eq(categories.userId, userId)).orderBy(asc(categories.type), asc(categories.name)),
    db.select().from(transactions).where(eq(transactions.userId, userId)).orderBy(desc(transactions.transactionDate), desc(transactions.id)),
    db.select().from(reminders).where(eq(reminders.userId, userId)).orderBy(asc(reminders.reminderDate)),
    db.select().from(transactionAuditLogs).where(eq(transactionAuditLogs.userId, userId)).orderBy(desc(transactionAuditLogs.createdAt)).limit(20),
  ]);

  const categoryMap = new Map(categoryRows.map(category => [category.id, category]));
  const mapRecord = (record: typeof allTransactionRows[number]) => ({
    id: record.id,
    recordNumber: record.recordNumber,
    type: record.type,
    transactionDate: record.transactionDate,
    invoiceNumber: record.invoiceNumber ?? "",
    categoryId: record.categoryId,
    categoryName: categoryMap.get(record.categoryId)?.name ?? "فئة محذوفة",
    customerName: record.customerName ?? "—",
    taxNumber: record.taxNumber ?? "",
    amountBeforeTax: Number(record.amountBeforeTax),
    taxRate: Number(record.taxRate),
    taxAmount: Number(record.taxAmount),
    totalAmount: Number(record.totalAmount),
    attachmentName: record.attachmentName,
    attachmentMime: record.attachmentMime,
    attachmentUrl: record.attachmentUrl,
    createdAt: record.createdAt,
  });
  const records = allTransactionRows.filter(record => !record.archived).map(mapRecord);
  const archivedTransactions = allTransactionRows.filter(record => record.archived).map(mapRecord);

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
    categories: categoryRows,
    transactions: records,
    archivedTransactions,
    auditLogs: auditRows.map(log => ({ id: log.id, transactionId: log.transactionId, action: log.action, details: log.details ?? "", createdAt: log.createdAt })),
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

export async function createTransaction(
  userId: number,
  input: {
    type: TransactionType;
    categoryId: number;
    amount: number;
    taxEnabled: boolean;
    taxRate: number;
    numberingMode: NumberingMode;
    recordNumber?: string;
    transactionDate: string;
    invoiceNumber?: string;
    customerName?: string;
    taxNumber?: string;
    amountIncludesTax?: boolean;
    attachmentName?: string;
    attachmentMime?: string;
    attachmentUrl?: string;
  }
) {
  const db = await requireDb();
  const category = await db
    .select()
    .from(categories)
    .where(and(eq(categories.id, input.categoryId), eq(categories.userId, userId), eq(categories.type, input.type)))
    .limit(1);
  if (!category[0]) throw new Error("الفئة المختارة غير صالحة");

  const taxRate = input.type === "expense" && input.taxEnabled ? normalizeTaxRate(input.taxRate) : 0;
  const enteredAmount = roundMoney(input.amount);
  const totalAmount = input.type === "expense" && input.amountIncludesTax
    ? enteredAmount
    : roundMoney(enteredAmount + (enteredAmount * taxRate) / 100);
  const taxAmount = input.type === "expense" ? roundMoney(totalAmount - (totalAmount / (1 + taxRate / 100))) : 0;
  const amountBeforeTax = roundMoney(totalAmount - taxAmount);
  const suppliedNumber = input.recordNumber?.trim();

  let recordNumber = suppliedNumber;
  if (input.numberingMode === "auto" || !recordNumber) {
    const settings = await ensureSettings(userId);
    const prefix = input.type === "deposit" ? settings.depositPrefix : settings.expensePrefix;
    const start = input.type === "deposit" ? settings.depositStart : settings.expenseStart;
    const existing = await db.select({ recordNumber: transactions.recordNumber }).from(transactions).where(and(eq(transactions.userId, userId), eq(transactions.type, input.type)));
    const used = new Set(existing.map(row => row.recordNumber));
    let next = start;
    while (used.has(`${prefix}${String(next).padStart(4, "0")}`)) next += 1;
    recordNumber = `${prefix}${String(next).padStart(4, "0")}`;
  } else {
    const existing = await db
      .select({ id: transactions.id })
      .from(transactions)
      .where(and(eq(transactions.userId, userId), eq(transactions.recordNumber, recordNumber)))
      .limit(1);
    if (existing[0]) throw new Error("رقم العملية مستخدم مسبقاً");
  }

  const inserted = await db.insert(transactions).values({
    userId,
    categoryId: input.categoryId,
    recordNumber,
    type: input.type,
    transactionDate: input.transactionDate,
    invoiceNumber: input.type === "expense" ? input.invoiceNumber?.trim() || null : null,
    customerName: input.customerName?.trim() || null,
    taxNumber: input.type === "expense" ? input.taxNumber?.trim() || null : null,
    amountBeforeTax,
    taxRate,
    taxAmount,
    totalAmount,
    attachmentName: input.attachmentName || null,
    attachmentMime: input.attachmentMime || null,
    attachmentUrl: input.attachmentUrl || null,
  });
  await db.insert(transactionAuditLogs).values({ userId, transactionId: Number(inserted[0].insertId), action: "created", details: "إنشاء العملية" });
}

export async function archiveTransaction(userId: number, transactionId: number) {
  const db = await requireDb();
  await db.update(transactions).set({ archived: true }).where(and(eq(transactions.id, transactionId), eq(transactions.userId, userId), eq(transactions.archived, false)));
  await db.insert(transactionAuditLogs).values({ userId, transactionId, action: "archived", details: "أرشفة العملية" });
}

export async function restoreTransaction(userId: number, transactionId: number) {
  const db = await requireDb();
  await db.update(transactions).set({ archived: false }).where(and(eq(transactions.id, transactionId), eq(transactions.userId, userId), eq(transactions.archived, true)));
  await db.insert(transactionAuditLogs).values({ userId, transactionId, action: "restored", details: "استعادة العملية" });
}

export async function updateTransaction(userId: number, transactionId: number, input: Parameters<typeof createTransaction>[1]) {
  const db = await requireDb();
  const category = await db.select().from(categories).where(and(eq(categories.id, input.categoryId), eq(categories.userId, userId), eq(categories.type, input.type))).limit(1);
  if (!category[0]) throw new Error("الفئة المختارة غير صالحة");
  const current = await db.select({ id: transactions.id }).from(transactions).where(and(eq(transactions.id, transactionId), eq(transactions.userId, userId))).limit(1);
  if (!current[0]) throw new Error("العملية غير موجودة");

  const taxRate = input.type === "expense" && input.taxEnabled ? normalizeTaxRate(input.taxRate) : 0;
  const enteredAmount = roundMoney(input.amount);
  const totalAmount = input.type === "expense" && input.amountIncludesTax ? enteredAmount : roundMoney(enteredAmount + (enteredAmount * taxRate) / 100);
  const taxAmount = input.type === "expense" ? roundMoney(totalAmount - (totalAmount / (1 + taxRate / 100))) : 0;
  const amountBeforeTax = roundMoney(totalAmount - taxAmount);
  const recordNumber = input.recordNumber?.trim() || `TRX-${Date.now().toString().slice(-8)}-${randomBytes(2).toString("hex").toUpperCase()}`;
  const duplicate = await db.select({ id: transactions.id }).from(transactions).where(and(eq(transactions.userId, userId), eq(transactions.recordNumber, recordNumber))).limit(1);
  if (duplicate[0] && duplicate[0].id !== transactionId) throw new Error("رقم العملية مستخدم مسبقاً");

  await db.update(transactions).set({
    categoryId: input.categoryId,
    recordNumber,
    type: input.type,
    transactionDate: input.transactionDate,
    invoiceNumber: input.type === "expense" ? input.invoiceNumber?.trim() || null : null,
    customerName: input.customerName?.trim() || null,
    taxNumber: input.type === "expense" ? input.taxNumber?.trim() || null : null,
    amountBeforeTax,
    taxRate,
    taxAmount,
    totalAmount,
    ...(input.attachmentName !== undefined ? { attachmentName: input.attachmentName || null, attachmentMime: input.attachmentMime || null, attachmentUrl: input.attachmentUrl || null } : {}),
  }).where(and(eq(transactions.id, transactionId), eq(transactions.userId, userId)));
  await db.insert(transactionAuditLogs).values({ userId, transactionId, action: "updated", details: "تعديل العملية" });
}

export async function addCategory(userId: number, input: { name: string; type: TransactionType; color?: string }) {
  const db = await requireDb();
  await db.insert(categories).values({
    userId,
    type: input.type,
    name: input.name.trim(),
    color: input.color || (input.type === "deposit" ? "#0F9D82" : "#E76F51"),
  });
}

export async function deleteCategory(userId: number, categoryId: number) {
  const db = await requireDb();
  const usedByTransaction = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(and(eq(transactions.categoryId, categoryId), eq(transactions.userId, userId)))
    .limit(1);
  if (usedByTransaction[0]) throw new Error("لا يمكن حذف فئة مرتبطة بعمليات مسجلة");
  await db.delete(categories).where(and(eq(categories.id, categoryId), eq(categories.userId, userId)));
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
  const db = await requireDb();
  await ensureSettings(userId);
  const update: Record<string, unknown> = {};
  if (input.language) update.language = input.language;
  if (input.theme) update.theme = input.theme;
  if (typeof input.taxEnabled === "boolean") update.taxEnabled = input.taxEnabled;
  if (typeof input.taxRate === "number") update.taxRate = normalizeTaxRate(input.taxRate);
  if (input.numberingMode) update.numberingMode = input.numberingMode;
  if (input.depositPrefix) update.depositPrefix = input.depositPrefix.trim();
  if (input.expensePrefix) update.expensePrefix = input.expensePrefix.trim();
  if (typeof input.depositStart === "number") update.depositStart = Math.max(1, Math.floor(input.depositStart));
  if (typeof input.expenseStart === "number") update.expenseStart = Math.max(1, Math.floor(input.expenseStart));
  if (typeof input.pinEnabled === "boolean") update.pinEnabled = input.pinEnabled;
  if (input.pin) update.pinHash = hashPin(input.pin);
  if (Object.keys(update).length) await db.update(userSettings).set(update).where(eq(userSettings.userId, userId));
}

export async function verifyPin(userId: number, pin: string) {
  const settings = await ensureSettings(userId);
  if (!settings.pinEnabled || !settings.pinHash) return true;
  return matchesPin(pin, settings.pinHash);
}

export async function createReminder(userId: number, input: { title: string; reminderDate: string }) {
  const db = await requireDb();
  await db.insert(reminders).values({ userId, title: input.title.trim(), reminderDate: input.reminderDate });
}

export async function toggleReminder(userId: number, reminderId: number, enabled: boolean) {
  const db = await requireDb();
  await db.update(reminders).set({ enabled }).where(and(eq(reminders.id, reminderId), eq(reminders.userId, userId)));
}

export async function deleteReminder(userId: number, reminderId: number) {
  const db = await requireDb();
  await db.delete(reminders).where(and(eq(reminders.id, reminderId), eq(reminders.userId, userId)));
}
