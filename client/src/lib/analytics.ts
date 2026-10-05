import type { CashFlowPoint } from "@/components/charts/CashFlowChart";
import type { CategorySlice } from "@/components/charts/CategoryBars";
import { lastMonthKeys, monthKey } from "./periods";
import type { Category, TransactionRecord, TransactionType } from "./types";

/** Deposits and expenses per month for the last `count` months, zero-filled. */
export function monthlyCashFlow(
  records: TransactionRecord[],
  count: number,
  now = new Date()
): CashFlowPoint[] {
  const points = new Map<string, CashFlowPoint>(
    lastMonthKeys(count, now).map(month => [
      month,
      { month, deposits: 0, expenses: 0 },
    ])
  );
  for (const record of records) {
    const point = points.get(monthKey(record.transactionDate));
    if (!point) continue;
    if (record.type === "deposit") point.deposits += record.totalAmount;
    else point.expenses += record.totalAmount;
  }
  return [...points.values()].map(point => ({
    ...point,
    deposits: round(point.deposits),
    expenses: round(point.expenses),
  }));
}

/** Totals per category for one transaction type, largest first. */
export function categorySlices(
  records: TransactionRecord[],
  categories: Category[],
  type: TransactionType,
  fallbackName: string
): CategorySlice[] {
  const byId = new Map(categories.map(category => [category.id, category]));
  const totals = new Map<number, CategorySlice>();
  for (const record of records) {
    if (record.type !== type) continue;
    const category = byId.get(record.categoryId);
    const slice = totals.get(record.categoryId) ?? {
      key: String(record.categoryId),
      name: category?.name ?? record.categoryName ?? fallbackName,
      color: category?.color ?? record.categoryColor ?? "#94A3B8",
      value: 0,
      count: 0,
    };
    slice.value += record.totalAmount;
    slice.count += 1;
    totals.set(record.categoryId, slice);
  }
  return [...totals.values()]
    .map(slice => ({ ...slice, value: round(slice.value) }))
    .sort((a, b) => b.value - a.value);
}

export type PartyRow = {
  name: string;
  count: number;
  deposits: number;
  expenses: number;
};

/** Customers and depositors ranked by total money moved. */
export function topParties(
  records: TransactionRecord[],
  limit = 6
): PartyRow[] {
  const rows = new Map<string, PartyRow>();
  for (const record of records) {
    const name = record.customerName.trim();
    if (!name) continue;
    const row = rows.get(name) ?? { name, count: 0, deposits: 0, expenses: 0 };
    row.count += 1;
    if (record.type === "deposit") row.deposits += record.totalAmount;
    else row.expenses += record.totalAmount;
    rows.set(name, row);
  }
  return [...rows.values()]
    .map(row => ({
      ...row,
      deposits: round(row.deposits),
      expenses: round(row.expenses),
    }))
    .sort((a, b) => b.deposits + b.expenses - (a.deposits + a.expenses))
    .slice(0, limit);
}

const round = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100;
