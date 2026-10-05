import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLocale } from "@/contexts/LocaleContext";
import type { Category } from "@/lib/types";
import { cn } from "@/lib/utils";
import { SlidersHorizontal, Search, X } from "lucide-react";
import { useState } from "react";

export type Filters = {
  search: string;
  from: string;
  to: string;
  categoryId: string;
};
export const EMPTY_FILTERS: Filters = {
  search: "",
  from: "",
  to: "",
  categoryId: "all",
};

export function countActiveFilters(filters: Filters) {
  return [
    filters.search.trim(),
    filters.from,
    filters.to,
    filters.categoryId !== "all" ? filters.categoryId : "",
  ].filter(Boolean).length;
}

type Props = {
  filters: Filters;
  onChange: (filters: Filters) => void;
  categories: Category[];
};

/** Search is always visible; dates and category sit inline on wide screens and behind a toggle on phones. */
export function TransactionFilters({ filters, onChange, categories }: Props) {
  const { t, dir } = useLocale();
  const [expanded, setExpanded] = useState(false);
  const active = countActiveFilters(filters);
  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-ink-3"
            aria-hidden
          />
          <input
            type="search"
            value={filters.search}
            onChange={event => set({ search: event.target.value })}
            placeholder={t.transactions.searchPlaceholder}
            aria-label={t.common.search}
            className="field h-11 ps-10 pe-9"
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => set({ search: "" })}
              aria-label={t.common.reset}
              className="absolute inset-y-0 end-2 my-auto grid size-7 place-items-center rounded-md text-ink-3 hover:bg-surface-2 hover:text-ink"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => setExpanded(value => !value)}
          aria-expanded={expanded}
          className={cn(
            "h-11 gap-2 md:hidden",
            active > 0 && "border-primary text-primary-strong"
          )}
        >
          <SlidersHorizontal className="size-4" />
          {t.transactions.filters}
          {active > 0 && (
            <span className="tnum rounded-full bg-primary px-1.5 text-xs text-primary-foreground">
              {active}
            </span>
          )}
        </Button>
      </div>

      <div
        className={cn(
          "grid gap-2 sm:grid-cols-2 md:grid-cols-[1fr_1fr_1.2fr_auto]",
          expanded ? "grid" : "hidden md:grid"
        )}
      >
        <label className="flex flex-col gap-1 text-xs text-ink-3">
          {t.periods.from}
          <input
            type="date"
            value={filters.from}
            max={filters.to || undefined}
            onChange={event => set({ from: event.target.value })}
            className="field h-10"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-ink-3">
          {t.periods.to}
          <input
            type="date"
            value={filters.to}
            min={filters.from || undefined}
            onChange={event => set({ to: event.target.value })}
            className="field h-10"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-ink-3">
          {t.transactions.category}
          <Select
            value={filters.categoryId}
            onValueChange={value => set({ categoryId: value })}
          >
            <SelectTrigger
              className="h-10 w-full rounded-lg border-border-strong bg-surface text-[15px] dark:bg-surface-2"
              aria-label={t.transactions.category}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent dir={dir}>
              <SelectItem value="all">
                {t.transactions.allCategories}
              </SelectItem>
              {categories.map(category => (
                <SelectItem key={category.id} value={String(category.id)}>
                  <i
                    className="size-2 rounded-full"
                    style={{ background: category.color }}
                    aria-hidden
                  />
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <div className="flex items-end">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onChange(EMPTY_FILTERS)}
            disabled={active === 0}
            className="h-10 w-full text-ink-2 md:w-auto"
          >
            {t.transactions.clearFilters}
          </Button>
        </div>
      </div>
    </div>
  );
}
