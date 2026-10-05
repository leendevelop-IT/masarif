import { PageHeader } from "@/components/common/PageHeader";
import {
  countActiveFilters,
  EMPTY_FILTERS,
  TransactionFilters,
  type Filters,
} from "@/components/transactions/TransactionFilters";
import { TransactionList } from "@/components/transactions/TransactionList";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/contexts/DashboardContext";
import { useLocale } from "@/contexts/LocaleContext";
import { summarize } from "@/lib/periods";
import { cn } from "@/lib/utils";
import { Download, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useLocation, useParams } from "wouter";

type Tab = "all" | "deposits" | "expenses";
const TABS: Tab[] = ["all", "deposits", "expenses"];

export default function TransactionsPage() {
  const { t, f } = useLocale();
  const { data, openNewTransaction } = useDashboard();
  const params = useParams<{ tab?: string }>();
  const [, navigate] = useLocation();
  const tab: Tab =
    params.tab === "deposits" || params.tab === "expenses" ? params.tab : "all";
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);

  const typeFilter =
    tab === "deposits" ? "deposit" : tab === "expenses" ? "expense" : null;
  const categories = useMemo(
    () =>
      typeFilter
        ? data.categories.filter(category => category.type === typeFilter)
        : data.categories,
    [data.categories, typeFilter]
  );

  // A category from the other tab can't match anything, so drop it when switching.
  useEffect(() => {
    if (
      filters.categoryId !== "all" &&
      !categories.some(category => String(category.id) === filters.categoryId)
    ) {
      setFilters(current => ({ ...current, categoryId: "all" }));
    }
  }, [categories, filters.categoryId]);

  const filtered = useMemo(() => {
    const query = filters.search.trim().toLowerCase();
    return data.transactions.filter(record => {
      if (typeFilter && record.type !== typeFilter) return false;
      if (filters.from && record.transactionDate < filters.from) return false;
      if (filters.to && record.transactionDate > filters.to) return false;
      if (
        filters.categoryId !== "all" &&
        String(record.categoryId) !== filters.categoryId
      )
        return false;
      if (
        query &&
        ![
          record.recordNumber,
          record.invoiceNumber,
          record.customerName,
          record.taxNumber,
          record.categoryName,
        ].some(value => value.toLowerCase().includes(query))
      )
        return false;
      return true;
    });
  }, [data.transactions, typeFilter, filters]);

  const totals = useMemo(() => summarize(filtered), [filtered]);
  const activeFilters = countActiveFilters(filters);

  const exportExcel = async () => {
    if (!filtered.length) {
      toast.error(t.transactions.nothingToExport);
      return;
    }
    // The spreadsheet library is only fetched the first time someone exports.
    const { exportTransactionsToExcel } = await import("@/lib/export-excel");
    exportTransactionsToExcel(filtered, t);
    toast.success(t.transactions.exported(filtered.length));
  };

  return (
    <div>
      <PageHeader
        title={t.transactions.title}
        subtitle={t.transactions.subtitle}
        actions={
          <>
            <Button
              variant="outline"
              onClick={exportExcel}
              className="h-11 gap-2"
            >
              <Download className="size-4" />
              {t.transactions.exportExcel}
            </Button>
            <Button
              onClick={() => openNewTransaction(typeFilter ?? "deposit")}
              className="hidden h-11 gap-2 bg-primary px-5 text-primary-foreground hover:bg-primary-strong lg:inline-flex"
            >
              <Plus className="size-4" />
              {t.nav.add}
            </Button>
          </>
        }
      />

      <div
        className="segmented mb-4 grid w-full max-w-md grid-cols-3"
        role="tablist"
      >
        {TABS.map(key => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            aria-pressed={tab === key}
            onClick={() =>
              navigate(key === "all" ? "/transactions" : `/transactions/${key}`)
            }
            className="h-9"
          >
            {t.transactions.tabs[key]}
          </button>
        ))}
      </div>

      <div className="card">
        <div className="border-b border-border p-4">
          <TransactionFilters
            filters={filters}
            onChange={setFilters}
            categories={categories}
          />
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-b border-border bg-background/60 px-4 py-2.5 text-sm">
          <span className="font-medium text-ink">
            {activeFilters
              ? `${t.transactions.filtered}: ${t.transactions.count(filtered.length)}`
              : t.transactions.count(filtered.length)}
          </span>
          {filtered.length > 0 && (
            <span className="tnum flex flex-wrap gap-x-4 text-ink-2">
              {tab !== "expenses" && (
                <span>
                  {t.overview.deposits}{" "}
                  <span className="font-medium text-deposit-text">
                    {f.money(totals.deposits)}
                  </span>
                </span>
              )}
              {tab !== "deposits" && (
                <span>
                  {t.overview.expenses}{" "}
                  <span className="font-medium text-expense-text">
                    {f.money(totals.expenses)}
                  </span>
                </span>
              )}
              {tab === "all" && (
                <span>
                  {t.overview.net}{" "}
                  <span
                    className={cn(
                      "font-medium",
                      totals.net < 0 ? "text-expense-text" : "text-ink"
                    )}
                  >
                    {f.money(totals.net)}
                  </span>
                </span>
              )}
            </span>
          )}
        </div>

        <TransactionList
          records={filtered}
          emptyTitle={
            activeFilters || typeFilter
              ? t.transactions.noMatchesTitle
              : undefined
          }
          emptyBody={
            activeFilters || typeFilter
              ? t.transactions.noMatchesBody
              : undefined
          }
          emptyAction={
            activeFilters ? (
              <Button
                variant="outline"
                onClick={() => setFilters(EMPTY_FILTERS)}
              >
                {t.transactions.clearFilters}
              </Button>
            ) : (
              <Button
                onClick={() => openNewTransaction(typeFilter ?? "deposit")}
                className="gap-2 bg-primary text-primary-foreground hover:bg-primary-strong"
              >
                <Plus className="size-4" />
                {t.nav.add}
              </Button>
            )
          }
        />
      </div>
    </div>
  );
}
