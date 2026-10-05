import { useLocale } from "@/contexts/LocaleContext";
import { PERIOD_KEYS, type DateRange, type PeriodKey } from "@/lib/periods";
import { cn } from "@/lib/utils";

type Props = {
  value: PeriodKey;
  onChange: (key: PeriodKey) => void;
  custom?: DateRange;
  onCustomChange?: (range: DateRange) => void;
  allowCustom?: boolean;
  className?: string;
};

/** Preset chips, plus an optional custom range with two date inputs. */
export function PeriodPicker({
  value,
  onChange,
  custom,
  onCustomChange,
  allowCustom = false,
  className,
}: Props) {
  const { t } = useLocale();
  const keys: PeriodKey[] = allowCustom
    ? [...PERIOD_KEYS, "custom"]
    : PERIOD_KEYS;

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div
        className="scroll-thin -mx-4 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0"
        role="group"
        aria-label={t.periods.label}
      >
        {keys.map(key => (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            aria-pressed={value === key}
            className={cn(
              "h-9 shrink-0 rounded-full border px-3.5 text-sm font-medium transition-colors",
              value === key
                ? "border-primary bg-primary-soft text-primary-strong dark:text-primary"
                : "border-border bg-surface text-ink-2 hover:border-border-strong hover:text-ink"
            )}
          >
            {t.periods[key]}
          </button>
        ))}
      </div>
      {allowCustom && value === "custom" && onCustomChange && (
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-ink-2">
            {t.periods.from}
            <input
              type="date"
              className="field h-9 w-40"
              value={custom?.from ?? ""}
              onChange={event =>
                onCustomChange({
                  from: event.target.value || null,
                  to: custom?.to ?? null,
                })
              }
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-ink-2">
            {t.periods.to}
            <input
              type="date"
              className="field h-9 w-40"
              value={custom?.to ?? ""}
              onChange={event =>
                onCustomChange({
                  from: custom?.from ?? null,
                  to: event.target.value || null,
                })
              }
            />
          </label>
        </div>
      )}
    </div>
  );
}
