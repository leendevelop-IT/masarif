import {
  boolean,
  double,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

/** Application users created through the platform OAuth flow. */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const categories = mysqlTable(
  "categories",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    type: mysqlEnum("type", ["deposit", "expense"]).notNull(),
    color: varchar("color", { length: 16 }).default("#0F9D82").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    index("category_user_type_idx").on(table.userId, table.type),
    uniqueIndex("category_user_name_type_unique").on(table.userId, table.name, table.type),
  ]
);

export const transactions = mysqlTable(
  "transactions",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    categoryId: int("categoryId").notNull(),
    recordNumber: varchar("recordNumber", { length: 64 }).notNull(),
    type: mysqlEnum("type", ["deposit", "expense"]).notNull(),
    transactionDate: varchar("transactionDate", { length: 10 }).notNull(),
    invoiceNumber: varchar("invoiceNumber", { length: 80 }),
    customerName: varchar("customerName", { length: 160 }),
    taxNumber: varchar("taxNumber", { length: 80 }),
    amountBeforeTax: double("amountBeforeTax").notNull(),
    taxRate: double("taxRate").default(0).notNull(),
    taxAmount: double("taxAmount").default(0).notNull(),
    totalAmount: double("totalAmount").notNull(),
    attachmentName: varchar("attachmentName", { length: 255 }),
    attachmentMime: varchar("attachmentMime", { length: 120 }),
    attachmentUrl: varchar("attachmentUrl", { length: 512 }),
    archived: boolean("archived").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("transaction_user_date_idx").on(table.userId, table.transactionDate),
    index("transaction_user_type_idx").on(table.userId, table.type),
    uniqueIndex("transaction_user_number_unique").on(table.userId, table.recordNumber),
  ]
);

export const userSettings = mysqlTable("user_settings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  language: mysqlEnum("language", ["ar", "en"]).default("ar").notNull(),
  theme: mysqlEnum("theme", ["light", "dark"]).default("light").notNull(),
  taxEnabled: boolean("taxEnabled").default(true).notNull(),
  taxRate: double("taxRate").default(15).notNull(),
  numberingMode: mysqlEnum("numberingMode", ["auto", "manual"]).default("auto").notNull(),
  depositPrefix: varchar("depositPrefix", { length: 16 }).default("INC-").notNull(),
  expensePrefix: varchar("expensePrefix", { length: 16 }).default("EXP-").notNull(),
  depositStart: int("depositStart").default(1).notNull(),
  expenseStart: int("expenseStart").default(1).notNull(),
  pinEnabled: boolean("pinEnabled").default(false).notNull(),
  pinHash: varchar("pinHash", { length: 128 }),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const reminders = mysqlTable(
  "reminders",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    reminderDate: varchar("reminderDate", { length: 16 }).notNull(),
    enabled: boolean("enabled").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("reminder_user_date_idx").on(table.userId, table.reminderDate)]
);

export const transactionAuditLogs = mysqlTable(
  "transaction_audit_logs",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    transactionId: int("transactionId").notNull(),
    action: mysqlEnum("action", ["created", "updated", "archived", "restored"]).notNull(),
    details: text("details"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("audit_user_date_idx").on(table.userId, table.createdAt), index("audit_transaction_idx").on(table.transactionId)]
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Settings = typeof userSettings.$inferSelect;
export type Reminder = typeof reminders.$inferSelect;
