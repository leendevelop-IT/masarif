import {
  boolean,
  customType,
  doublePrecision,
  index,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

/** Binary column for attachment bytes. */
const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return "bytea";
  },
});

export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);
export const transactionTypeEnum = pgEnum("transaction_type", [
  "deposit",
  "expense",
]);
export const languageEnum = pgEnum("language", ["ar", "en"]);
export const themeEnum = pgEnum("theme", ["light", "dark"]);
export const numberingModeEnum = pgEnum("numbering_mode", ["auto", "manual"]);
export const auditActionEnum = pgEnum("audit_action", [
  "created",
  "updated",
  "archived",
  "restored",
]);

const createdAt = () =>
  timestamp("createdAt", { withTimezone: true, mode: "date" })
    .defaultNow()
    .notNull();
const updatedAt = () =>
  timestamp("updatedAt", { withTimezone: true, mode: "date" })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull();

/** Application users. Accounts sign up with email and password. */
export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    openId: varchar("openId", { length: 64 }).notNull().unique(),
    name: text("name"),
    email: varchar("email", { length: 320 }),
    passwordHash: varchar("passwordHash", { length: 255 }),
    loginMethod: varchar("loginMethod", { length: 64 }),
    role: userRoleEnum("role").default("user").notNull(),
    /** Bumped on a password change so cookies issued before it stop working. */
    sessionVersion: integer("sessionVersion").default(1).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    lastSignedIn: timestamp("lastSignedIn", {
      withTimezone: true,
      mode: "date",
    })
      .defaultNow()
      .notNull(),
  },
  table => [uniqueIndex("users_email_unique").on(table.email)]
);

export const categories = pgTable(
  "categories",
  {
    id: serial("id").primaryKey(),
    userId: integer("userId").notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    type: transactionTypeEnum("type").notNull(),
    color: varchar("color", { length: 16 }).default("#0F9D82").notNull(),
    createdAt: createdAt(),
  },
  table => [
    index("category_user_type_idx").on(table.userId, table.type),
    uniqueIndex("category_user_name_type_unique").on(
      table.userId,
      table.name,
      table.type
    ),
  ]
);

export const transactions = pgTable(
  "transactions",
  {
    id: serial("id").primaryKey(),
    userId: integer("userId").notNull(),
    categoryId: integer("categoryId").notNull(),
    recordNumber: varchar("recordNumber", { length: 64 }).notNull(),
    type: transactionTypeEnum("type").notNull(),
    transactionDate: varchar("transactionDate", { length: 10 }).notNull(),
    invoiceNumber: varchar("invoiceNumber", { length: 80 }),
    customerName: varchar("customerName", { length: 160 }),
    taxNumber: varchar("taxNumber", { length: 80 }),
    amountBeforeTax: doublePrecision("amountBeforeTax").notNull(),
    taxRate: doublePrecision("taxRate").default(0).notNull(),
    taxAmount: doublePrecision("taxAmount").default(0).notNull(),
    totalAmount: doublePrecision("totalAmount").notNull(),
    attachmentName: varchar("attachmentName", { length: 255 }),
    attachmentMime: varchar("attachmentMime", { length: 120 }),
    attachmentUrl: varchar("attachmentUrl", { length: 512 }),
    archived: boolean("archived").default(false).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  table => [
    index("transaction_user_date_idx").on(table.userId, table.transactionDate),
    index("transaction_user_type_idx").on(table.userId, table.type),
    uniqueIndex("transaction_user_number_unique").on(
      table.userId,
      table.recordNumber
    ),
  ]
);

/** Uploaded receipts and documents, stored in the database and served from /api/attachments/:id. */
export const attachments = pgTable(
  "attachments",
  {
    id: serial("id").primaryKey(),
    userId: integer("userId").notNull(),
    fileName: varchar("fileName", { length: 255 }).notNull(),
    mimeType: varchar("mimeType", { length: 120 }).notNull(),
    size: integer("size").notNull(),
    data: bytea("data").notNull(),
    createdAt: createdAt(),
  },
  table => [index("attachment_user_idx").on(table.userId)]
);

export const userSettings = pgTable("user_settings", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().unique(),
  language: languageEnum("language").default("ar").notNull(),
  theme: themeEnum("theme").default("light").notNull(),
  taxEnabled: boolean("taxEnabled").default(true).notNull(),
  taxRate: doublePrecision("taxRate").default(15).notNull(),
  numberingMode: numberingModeEnum("numberingMode").default("auto").notNull(),
  depositPrefix: varchar("depositPrefix", { length: 16 })
    .default("INC-")
    .notNull(),
  expensePrefix: varchar("expensePrefix", { length: 16 })
    .default("EXP-")
    .notNull(),
  depositStart: integer("depositStart").default(1).notNull(),
  expenseStart: integer("expenseStart").default(1).notNull(),
  pinEnabled: boolean("pinEnabled").default(false).notNull(),
  pinHash: varchar("pinHash", { length: 128 }),
  updatedAt: updatedAt(),
});

export const reminders = pgTable(
  "reminders",
  {
    id: serial("id").primaryKey(),
    userId: integer("userId").notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    reminderDate: varchar("reminderDate", { length: 16 }).notNull(),
    enabled: boolean("enabled").default(true).notNull(),
    createdAt: createdAt(),
  },
  table => [
    index("reminder_user_date_idx").on(table.userId, table.reminderDate),
  ]
);

export const transactionAuditLogs = pgTable(
  "transaction_audit_logs",
  {
    id: serial("id").primaryKey(),
    userId: integer("userId").notNull(),
    transactionId: integer("transactionId").notNull(),
    action: auditActionEnum("action").notNull(),
    details: text("details"),
    createdAt: createdAt(),
  },
  table => [
    index("audit_user_date_idx").on(table.userId, table.createdAt),
    index("audit_transaction_idx").on(table.transactionId),
  ]
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Attachment = typeof attachments.$inferSelect;
export type Settings = typeof userSettings.$inferSelect;
export type Reminder = typeof reminders.$inferSelect;
