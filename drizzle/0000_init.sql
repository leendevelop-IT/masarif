CREATE TYPE "public"."audit_action" AS ENUM('created', 'updated', 'archived', 'restored');--> statement-breakpoint
CREATE TYPE "public"."language" AS ENUM('ar', 'en');--> statement-breakpoint
CREATE TYPE "public"."numbering_mode" AS ENUM('auto', 'manual');--> statement-breakpoint
CREATE TYPE "public"."theme" AS ENUM('light', 'dark');--> statement-breakpoint
CREATE TYPE "public"."transaction_type" AS ENUM('deposit', 'expense');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TABLE "attachments" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"fileName" varchar(255) NOT NULL,
	"mimeType" varchar(120) NOT NULL,
	"size" integer NOT NULL,
	"data" "bytea" NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"name" varchar(120) NOT NULL,
	"type" "transaction_type" NOT NULL,
	"color" varchar(16) DEFAULT '#0F9D82' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reminders" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"title" varchar(200) NOT NULL,
	"reminderDate" varchar(16) NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transaction_audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"transactionId" integer NOT NULL,
	"action" "audit_action" NOT NULL,
	"details" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"categoryId" integer NOT NULL,
	"recordNumber" varchar(64) NOT NULL,
	"type" "transaction_type" NOT NULL,
	"transactionDate" varchar(10) NOT NULL,
	"invoiceNumber" varchar(80),
	"customerName" varchar(160),
	"taxNumber" varchar(80),
	"amountBeforeTax" double precision NOT NULL,
	"taxRate" double precision DEFAULT 0 NOT NULL,
	"taxAmount" double precision DEFAULT 0 NOT NULL,
	"totalAmount" double precision NOT NULL,
	"attachmentName" varchar(255),
	"attachmentMime" varchar(120),
	"attachmentUrl" varchar(512),
	"archived" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"language" "language" DEFAULT 'ar' NOT NULL,
	"theme" "theme" DEFAULT 'light' NOT NULL,
	"taxEnabled" boolean DEFAULT true NOT NULL,
	"taxRate" double precision DEFAULT 15 NOT NULL,
	"numberingMode" "numbering_mode" DEFAULT 'auto' NOT NULL,
	"depositPrefix" varchar(16) DEFAULT 'INC-' NOT NULL,
	"expensePrefix" varchar(16) DEFAULT 'EXP-' NOT NULL,
	"depositStart" integer DEFAULT 1 NOT NULL,
	"expenseStart" integer DEFAULT 1 NOT NULL,
	"pinEnabled" boolean DEFAULT false NOT NULL,
	"pinHash" varchar(128),
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_settings_userId_unique" UNIQUE("userId")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"passwordHash" varchar(255),
	"loginMethod" varchar(64),
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId")
);
--> statement-breakpoint
CREATE INDEX "attachment_user_idx" ON "attachments" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "category_user_type_idx" ON "categories" USING btree ("userId","type");--> statement-breakpoint
CREATE UNIQUE INDEX "category_user_name_type_unique" ON "categories" USING btree ("userId","name","type");--> statement-breakpoint
CREATE INDEX "reminder_user_date_idx" ON "reminders" USING btree ("userId","reminderDate");--> statement-breakpoint
CREATE INDEX "audit_user_date_idx" ON "transaction_audit_logs" USING btree ("userId","createdAt");--> statement-breakpoint
CREATE INDEX "audit_transaction_idx" ON "transaction_audit_logs" USING btree ("transactionId");--> statement-breakpoint
CREATE INDEX "transaction_user_date_idx" ON "transactions" USING btree ("userId","transactionDate");--> statement-breakpoint
CREATE INDEX "transaction_user_type_idx" ON "transactions" USING btree ("userId","type");--> statement-breakpoint
CREATE UNIQUE INDEX "transaction_user_number_unique" ON "transactions" USING btree ("userId","recordNumber");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email");