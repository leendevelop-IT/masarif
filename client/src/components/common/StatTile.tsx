import { useLocale } from "@/contexts/LocaleContext";
import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";

type Tone = "deposit" | "expense" | "net" | "warning";

const toneClasses: Record<Tone, string> = {
  deposit: "bg-deposit-soft text-deposit-text",
  expense: "bg-expense-soft text-expense-text",
  net: "bg-net-soft text-net-text",
  warning: "bg-warning-soft text-warning-text",
};

type Props = {
  label: string;
  value: string;
  icon: LucideIcon;
  tone: Tone;
  hint?: string;
  /** Percentage change against the previous period; null hides the badge. */
  delta?: number | null;
  /** For expenses, growth is the unwelcome direction. */
  invertDelta?: boolean;
};

/** A headline number: label, big tabular value, and an optional change badge against the previous period. */
export function StatTile({
  label,
  value,
  icon: Icon,
  tone,
  hint,
  delta,
  invertDelta = false,
}: Props) {
  const { f, t } = useLocale();
  const hasDelta = typeof delta === "number" && Number.isFinite(delta);
  const favourable = hasDelta ? (invertDelta ? delta < 0 : delta > 0) : false;
  const neutral = hasDelta && Math.abs(delta) < 0.5;

  return (
    <article className="card flex flex-col gap-3 p-5">
      <div className="flex items-center gap-2.5">
        <span
          className={cn(
            "grid size-9 place-items-center rounded-lg",
            toneClasses[tone]
          )}
        >
          <Icon className="size-[18px]" aria-hidden />
        </span>
        <p className="text-sm font-medium text-ink-2">{label}</p>
      </div>
      <p
        className="tnum text-[26px] font-semibold leading-none tracking-tight whitespace-nowrap text-ink sm:text-[28px]"
        dir="auto"
      >
        {value}
      </p>
      <div className="flex min-h-5 flex-wrap items-center gap-2 text-xs text-ink-3">
        {hasDelta && (
          <span
            className={cn(
              "tnum inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 font-medium",
              neutral
                ? "bg-surface-2 text-ink-2"
                : favourable
                  ? "bg-deposit-soft text-deposit-text"
                  : "bg-expense-soft text-expense-text"
            )}
            title={t.overview.vsPrevious}
          >
            {!neutral &&
              (delta > 0 ? (
                <ArrowUpRight className="size-3.5" aria-hidden />
              ) : (
                <ArrowDownRight className="size-3.5" aria-hidden />
              ))}
            {f.percent(Math.abs(delta))}
            <span className="sr-only"> {t.overview.vsPrevious}</span>
          </span>
        )}
        {hint && <span>{hint}</span>}
      </div>
    </article>
  );
}
