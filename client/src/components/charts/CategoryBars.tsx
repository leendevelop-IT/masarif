import { EmptyState } from "@/components/common/EmptyState";
import { useLocale } from "@/contexts/LocaleContext";
import type { TransactionType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Tag } from "lucide-react";

export type CategorySlice = {
  key: string;
  name: string;
  color: string;
  value: number;
  count: number;
};

/** One series of horizontal bars, longest first. The user's category colour marks identity; the bar is the series hue. */
export function CategoryBars({
  slices,
  type,
  emptyText,
  limit = 6,
}: {
  slices: CategorySlice[];
  type: TransactionType;
  emptyText: string;
  limit?: number;
}) {
  const { t, f } = useLocale();
  const visible = slices.slice(0, limit);
  const max = visible[0]?.value ?? 0;
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);

  if (!visible.length)
    return (
      <EmptyState
        icon={Tag}
        title={t.analytics.noData}
        body={emptyText}
        compact
      />
    );

  return (
    <ul className="flex flex-col gap-3.5">
      {visible.map(slice => {
        const share = total ? (slice.value / total) * 100 : 0;
        return (
          <li key={slice.key} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="flex min-w-0 items-center gap-2 text-ink">
                <i
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ background: slice.color }}
                  aria-hidden
                />
                <span className="truncate">{slice.name}</span>
                <span className="tnum shrink-0 text-xs text-ink-3">
                  {t.overview.transactionsCount(slice.count)}
                </span>
              </span>
              <span className="tnum shrink-0 text-ink-2">
                <span className="font-medium text-ink">
                  {f.money(slice.value)}
                </span>
                <span className="ms-2 text-xs text-ink-3">
                  {f.percent(share)}
                </span>
              </span>
            </div>
            <div
              className="h-2 overflow-hidden rounded-full bg-surface-2"
              role="img"
              aria-label={`${slice.name}: ${f.money(slice.value)}, ${f.percent(share)}`}
            >
              <div
                className={cn(
                  "h-full rounded-full transition-[width] duration-300",
                  type === "deposit" ? "bg-deposit" : "bg-expense"
                )}
                style={{
                  width: `${max ? Math.max(2, (slice.value / max) * 100) : 0}%`,
                }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
