import { prefs } from "@/lib/prefs";
import {
  PERIOD_KEYS,
  periodRange,
  type DateRange,
  type PeriodKey,
} from "@/lib/periods";
import { useMemo, useState } from "react";

/** Period selection remembered on the device, with the resolved date range. */
export function usePeriod(
  defaultKey: PeriodKey = "month",
  allowCustom = false
) {
  const [period, setPeriodState] = useState<PeriodKey>(() => {
    const stored = prefs.getPeriod() as PeriodKey | null;
    return stored &&
      (PERIOD_KEYS.includes(stored) || (allowCustom && stored === "custom"))
      ? stored
      : defaultKey;
  });
  const [custom, setCustom] = useState<DateRange>({ from: null, to: null });

  const setPeriod = (key: PeriodKey) => {
    setPeriodState(key);
    prefs.setPeriod(key);
  };

  const range = useMemo(
    () => periodRange(period, new Date(), custom),
    [period, custom]
  );
  return { period, setPeriod, custom, setCustom, range };
}
