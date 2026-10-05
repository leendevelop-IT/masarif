import { makeFormatters, type Formatters } from "@/lib/format";
import { dictionaries, type Dictionary } from "@/lib/i18n";
import { prefs, type Language, type Numerals } from "@/lib/prefs";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type LocaleContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  numerals: Numerals;
  setNumerals: (numerals: Numerals) => void;
  t: Dictionary;
  dir: "rtl" | "ltr";
  isArabic: boolean;
  f: Formatters;
};

const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() =>
    prefs.getLanguage()
  );
  const [numerals, setNumeralsState] = useState<Numerals>(() =>
    prefs.getNumerals()
  );

  useEffect(() => {
    const t = dictionaries[language];
    document.documentElement.lang = language;
    document.documentElement.dir = t.dir;
    document.title = t.app.name;
    prefs.setLanguage(language);
  }, [language]);

  useEffect(() => prefs.setNumerals(numerals), [numerals]);

  const setLanguage = useCallback(
    (next: Language) => setLanguageState(next),
    []
  );
  const setNumerals = useCallback(
    (next: Numerals) => setNumeralsState(next),
    []
  );

  const value = useMemo<LocaleContextValue>(() => {
    const t = dictionaries[language];
    return {
      language,
      setLanguage,
      numerals,
      setNumerals,
      t,
      dir: t.dir as "rtl" | "ltr",
      isArabic: language === "ar",
      f: makeFormatters(language, numerals),
    };
  }, [language, numerals, setLanguage, setNumerals]);

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) throw new Error("useLocale must be used within LocaleProvider");
  return context;
}
