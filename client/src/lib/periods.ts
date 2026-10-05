import { toISODate } from "./format";

export type PeriodKey =
  | "month"
  | "last30"
  | "quarter"
  | "year"
  | "all"
  | "custom";
export type DateRange = { from: string | null; to: string | null };

export const PERIOD_KEYS: PeriodKey[] = [
  "month",
  "last30",
  "quarter",
  "year",
  "all",
];

const shiftDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

/** Inclusive yyyy-mm-dd bounds for a preset, relative to `now`. */
export function periodRange(
  key: PeriodKey,
  now = new Date(),
  custom?: DateRange
): DateRange {
  const today = toISODate(now);
  switch (key) {
    case "month":
      return {
        from: toISODate(new Date(now.getFullYear(), now.getMonth(), 1)),
        to: today,
      };
    case "last30":
      return { from: toISODate(shiftDays(now, -29)), to: today };
    case "quarter":
      return {
        from: toISODate(new Date(now.getFullYear(), now.getMonth() - 2, 1)),
        to: today,
      };
    case "year":
      return { from: toISODate(new Date(now.getFullYear(), 0, 1)), to: today };
    case "custom":
      return { from: custom?.from ?? null, to: custom?.to ?? null };
    default:
      return { from: null, to: null };
  }
}

/**
 * The comparable range before `range`: the previous calendar month, quarter or
 * year for those presets, otherwise the same number of days immediately before.
 * Null when the range is open-ended.
 */
export function previousRange(
  key: PeriodKey,
  range: DateRange,
  now = new Date()
): DateRange | null {
  if (!range.from || !range.to) return null;
  if (key === "month") {
    return {
      from: toISODate(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
      to: toISODate(new Date(now.getFullYear(), now.getMonth(), 0)),
    };
  }
  if (key === "quarter") {
    return {
      from: toISODate(new Date(now.getFullYear(), now.getMonth() - 5, 1)),
      to: toISODate(new Date(now.getFullYear(), now.getMonth() - 2, 0)),
    };
  }
  if (key === "year") {
    return {
      from: toISODate(new Date(now.getFullYear() - 1, 0, 1)),
      to: toISODate(new Date(now.getFullYear() - 1, 11, 31)),
    };
  }
  const from = new Date(range.from);
  const to = new Date(range.to);
  const days = Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1;
  return {
    from: toISODate(shiftDays(from, -days)),
    to: toISODate(shiftDays(from, -1)),
  };
}

export const inRange = (date: string, range: DateRange) =>
  (!range.from || date >= range.from) && (!range.to || date <= range.to);

export const monthKey = (date: string) => date.slice(0, 7);

/** The last `count` month keys ending with the current month, oldest first. */
export function lastMonthKeys(count: number, now = new Date()): string[] {
  const keys: string[] = [];
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    keys.push(
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
    );
  }
  return keys;
}

type Summable = {
  type: "deposit" | "expense";
  totalAmount: number;
  taxAmount: number;
};

export function summarize<T extends Summable>(records: T[]) {
  let deposits = 0;
  let expenses = 0;
  let tax = 0;
  for (const record of records) {
    if (record.type === "deposit") deposits += record.totalAmount;
    else {
      expenses += record.totalAmount;
      tax += record.taxAmount;
    }
  }
  const round = (value: number) =>
    Math.round((value + Number.EPSILON) * 100) / 100;
  return {
    deposits: round(deposits),
    expenses: round(expenses),
    net: round(deposits - expenses),
    tax: round(tax),
    count: records.length,
  };
}

/** Percentage change from `previous` to `current`, or null when there is nothing to compare against. */
export function percentChange(
  current: number,
  previous: number
): number | null {
  if (!previous) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}
