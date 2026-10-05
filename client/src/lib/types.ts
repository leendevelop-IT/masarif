import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../server/routers";

export type RouterOutputs = inferRouterOutputs<AppRouter>;
export type DashboardData = RouterOutputs["finance"]["dashboard"];
export type TransactionRecord = DashboardData["transactions"][number];
export type Category = DashboardData["categories"][number];
export type Reminder = DashboardData["reminders"][number];
export type Settings = DashboardData["settings"];
export type AuditLog = DashboardData["auditLogs"][number];
export type TransactionType = "deposit" | "expense";
