import type { Language, Numerals } from "./prefs";

/** Parse a yyyy-mm-dd string as a local date (no timezone shift). */
export function parseISODate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

/** Format a local date as yyyy-mm-dd. */
export function toISODate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Format a local date and time as yyyy-mm-ddThh:mm, the value a datetime-local input uses. */
export function toLocalDateTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${toISODate(date)}T${hours}:${minutes}`;
}

export type Formatters = ReturnType<typeof makeFormatters>;

export function makeFormatters(language: Language, numerals: Numerals) {
  // Gregorian is forced: ar-SA otherwise defaults to the Umm al-Qura calendar.
  const locale =
    language === "ar" ? `ar-SA-u-ca-gregory-nu-${numerals}` : "en-US";
  const cache = new Map<string, Intl.NumberFormat | Intl.DateTimeFormat>();

  const numberFormat = (options: Intl.NumberFormatOptions) => {
    const key = `n${JSON.stringify(options)}`;
    let formatter = cache.get(key) as Intl.NumberFormat | undefined;
    if (!formatter) {
      formatter = new Intl.NumberFormat(locale, options);
      cache.set(key, formatter);
    }
    return formatter;
  };
  const dateFormat = (options: Intl.DateTimeFormatOptions) => {
    const key = `d${JSON.stringify(options)}`;
    let formatter = cache.get(key) as Intl.DateTimeFormat | undefined;
    if (!formatter) {
      formatter = new Intl.DateTimeFormat(locale, options);
      cache.set(key, formatter);
    }
    return formatter;
  };

  const currency = language === "ar" ? "ر.س" : "SAR";

  const number = (value: number, fractionDigits = 2) =>
    numberFormat({
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(value);
  const integer = (value: number) =>
    numberFormat({ maximumFractionDigits: 0 }).format(value);
  const compact = (value: number) => {
    const abs = Math.abs(value);
    if (abs >= 1_000_000)
      return numberFormat({
        notation: "compact",
        maximumFractionDigits: 1,
      }).format(value);
    if (abs >= 10_000) return integer(value);
    return number(value, abs % 1 === 0 ? 0 : 2);
  };
  const money = (value: number) =>
    language === "ar"
      ? `${number(value)} ${currency}`
      : `${currency} ${number(value)}`;
  const moneyCompact = (value: number) =>
    language === "ar"
      ? `${compact(value)} ${currency}`
      : `${currency} ${compact(value)}`;
  const percent = (value: number, fractionDigits = 0) =>
    numberFormat({
      style: "percent",
      maximumFractionDigits: fractionDigits,
    }).format(value / 100);

  const date = (iso: string) =>
    dateFormat({ day: "numeric", month: "short", year: "numeric" }).format(
      parseISODate(iso)
    );
  const dateLong = (iso: string) =>
    dateFormat({
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(parseISODate(iso));
  const dayMonth = (iso: string) =>
    dateFormat({ day: "numeric", month: "short" }).format(parseISODate(iso));
  const dateTime = (value: Date | string) => {
    const dateValue =
      value instanceof Date
        ? value
        : value.length <= 10
          ? parseISODate(value)
          : new Date(value);
    return dateFormat({
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(dateValue);
  };
  /** "2026-10" → "أكتوبر 2026" / "Oct 2026" */
  const month = (key: string) => {
    const [year, monthIndex] = key.split("-").map(Number);
    return dateFormat({ month: "short", year: "numeric" }).format(
      new Date(year, monthIndex - 1, 1)
    );
  };
  const monthShort = (key: string) => {
    const [year, monthIndex] = key.split("-").map(Number);
    return dateFormat({ month: "short" }).format(
      new Date(year, monthIndex - 1, 1)
    );
  };
  const monthLong = (key: string) => {
    const [year, monthIndex] = key.split("-").map(Number);
    return dateFormat({ month: "long", year: "numeric" }).format(
      new Date(year, monthIndex - 1, 1)
    );
  };

  return {
    locale,
    currency,
    number,
    integer,
    compact,
    money,
    moneyCompact,
    percent,
    date,
    dateLong,
    dayMonth,
    dateTime,
    month,
    monthShort,
    monthLong,
  };
}
