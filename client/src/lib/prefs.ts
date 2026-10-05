/** Per-device preferences that must work before sign-in (language, theme) or stay local (numerals). */

export type Language = "ar" | "en";
export type Theme = "light" | "dark";
export type Numerals = "latn" | "arab";

const KEYS = {
  language: "masarif.language",
  theme: "masarif.theme",
  numerals: "masarif.numerals",
  period: "masarif.period",
  pinUnlocked: "masarif.pinUnlocked",
} as const;

function read(key: string, storage: Storage = localStorage): string | null {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function write(
  key: string,
  value: string | null,
  storage: Storage = localStorage
) {
  try {
    if (value === null) storage.removeItem(key);
    else storage.setItem(key, value);
  } catch {
    // Private mode or blocked storage: the app keeps working with in-memory state.
  }
}

export const prefs = {
  getLanguage(): Language {
    return read(KEYS.language) === "en" ? "en" : "ar";
  },
  setLanguage(language: Language) {
    write(KEYS.language, language);
  },
  getTheme(): Theme {
    const stored = read(KEYS.theme);
    if (stored === "dark" || stored === "light") return stored;
    return typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  },
  setTheme(theme: Theme) {
    write(KEYS.theme, theme);
  },
  getNumerals(): Numerals {
    return read(KEYS.numerals) === "arab" ? "arab" : "latn";
  },
  setNumerals(numerals: Numerals) {
    write(KEYS.numerals, numerals);
  },
  getPeriod(): string | null {
    return read(KEYS.period);
  },
  setPeriod(period: string) {
    write(KEYS.period, period);
  },
  isPinUnlocked(): boolean {
    return read(KEYS.pinUnlocked, sessionStorage) === "1";
  },
  setPinUnlocked(unlocked: boolean) {
    write(KEYS.pinUnlocked, unlocked ? "1" : null, sessionStorage);
  },
};
