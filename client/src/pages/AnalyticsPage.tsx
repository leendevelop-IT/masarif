import {
  CashFlowChart,
  CashFlowTable,
} from "@/components/charts/CashFlowChart";
import { CategoryBars } from "@/components/charts/CategoryBars";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { PeriodPicker } from "@/components/common/PeriodPicker";
import { StatTile } from "@/components/common/StatTile";
import { useDashboard } from "@/contexts/DashboardContext";
import { useLocale } from "@/contexts/LocaleContext";
import { usePeriod } from "@/hooks/usePeriod";
import { categorySlices, monthlyCashFlow, topParties } from "@/lib/analytics";
import {
  inRange,
  percentChange,
  previousRange,
  summarize,
} from "@/lib/periods";
import { cn } from "@/lib/utils";
import {
  ChartNoAxesCombined,
  Percent,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { useMemo, useState } from "react";

export default function AnalyticsPage() {
  const { t, f } = useLocale();
  const { data } = useDashboard();
  const { period, setPeriod, custom, setCustom, range } = usePeriod(
    "year",
    true
  );
  const [view, setView] = useState<"chart" | "table">("chart");

  const inPeriod = useMemo(
    () =>
      data.transactions.filter(record =>
        inRange(record.transactionDate, range)
      ),
    [data.transactions, range]
  );
  const current = useMemo(() => summarize(inPeriod), [inPeriod]);
  const previous = useMemo(() => {
    const prior = previousRange(period, range);
    return prior
      ? summarize(
          data.transactions.filter(record =>
            inRange(record.transactionDate, prior)
          )
        )
      : null;
  }, [data.transactions, period, range]);
  const chart = useMemo(
    () => monthlyCashFlow(data.transactions, 12),
    [data.transactions]
  );
  const depositSlices = useMemo(
    () =>
      categorySlices(
        inPeriod,
        data.categories,
        "deposit",
        t.analytics.uncategorized
      ),
    [inPeriod, data.categories, t]
  );
  const expenseSlices = useMemo(
    () =>
      categorySlices(
        inPeriod,
        data.categories,
        "expense",
        t.analytics.uncategorized
      ),
    [inPeriod, data.categories, t]
  );
  const parties = useMemo(() => topParties(inPeriod), [inPeriod]);

  return (
    <div>
      <PageHeader title={t.analytics.title} subtitle={t.analytics.subtitle} />
      <PeriodPicker
        value={period}
        onChange={setPeriod}
        custom={custom}
        onCustomChange={setCustom}
        allowCustom
        className="mb-5"
      />

      {!inPeriod.length ? (
        <div className="card mb-5">
          <EmptyState
            icon={ChartNoAxesCombined}
            title={t.analytics.noData}
            body={t.analytics.noDataBody}
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
          <StatTile
            label={t.overview.deposits}
            value={f.money(current.deposits)}
            icon={TrendingUp}
            tone="deposit"
            delta={
              previous
                ? percentChange(current.deposits, previous.deposits)
                : null
            }
          />
          <StatTile
            label={t.overview.expenses}
            value={f.money(current.expenses)}
            icon={TrendingDown}
            tone="expense"
            invertDelta
            delta={
              previous
                ? percentChange(current.expenses, previous.expenses)
                : null
            }
          />
          <StatTile
            label={t.overview.net}
            value={f.money(current.net)}
            icon={Wallet}
            tone="net"
            hint={t.overview.transactionsCount(current.count)}
          />
          <StatTile
            label={t.analytics.taxPaid}
            value={f.money(current.tax)}
            icon={Percent}
            tone="warning"
          />
        </div>
      )}

      <section className="card mt-5">
        <header className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5 pb-3">
          <div>
            <h2 className="font-semibold text-ink">{t.analytics.cashFlow}</h2>
            <p className="mt-0.5 text-xs text-ink-3">
              {t.analytics.cashFlowHint}
            </p>
          </div>
          <div
            className="segmented"
            role="group"
            aria-label={t.analytics.viewToggle}
          >
            <button
              type="button"
              aria-pressed={view === "chart"}
              onClick={() => setView("chart")}
            >
              {t.analytics.chartView}
            </button>
            <button
              type="button"
              aria-pressed={view === "table"}
              onClick={() => setView("table")}
            >
              {t.analytics.tableView}
            </button>
          </div>
        </header>
        <div className="px-5 pb-5">
          {view === "chart" ? (
            <CashFlowChart data={chart} height={280} />
          ) : (
            <CashFlowTable data={chart} />
          )}
        </div>
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="font-semibold text-ink">
            {t.analytics.depositCategories}
          </h2>
          <div className="mt-4">
            <CategoryBars
              slices={depositSlices}
              type="deposit"
              emptyText={t.analytics.noDataBody}
              limit={8}
            />
          </div>
        </section>
        <section className="card p-5">
          <h2 className="font-semibold text-ink">
            {t.analytics.expenseCategories}
          </h2>
          <div className="mt-4">
            <CategoryBars
              slices={expenseSlices}
              type="expense"
              emptyText={t.analytics.noDataBody}
              limit={8}
            />
          </div>
        </section>
      </div>

      <section className="card mt-5">
        <header className="px-5 pt-5 pb-3">
          <h2 className="font-semibold text-ink">{t.analytics.topParties}</h2>
        </header>
        {parties.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-border text-xs text-ink-3">
                  <th
                    scope="col"
                    className="px-5 py-2.5 text-start font-medium"
                  >
                    {t.transactions.columns.party}
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-end font-medium">
                    {t.overview.deposits}
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-end font-medium">
                    {t.overview.expenses}
                  </th>
                  <th scope="col" className="px-5 py-2.5 text-end font-medium">
                    {t.overview.net}
                  </th>
                </tr>
              </thead>
              <tbody className="tnum">
                {parties.map(row => (
                  <tr
                    key={row.name}
                    className="border-b border-border last:border-b-0"
                  >
                    <td className="px-5 py-3">
                      <p className="font-medium text-ink" dir="auto">
                        {row.name}
                      </p>
                      <p className="text-xs text-ink-3">
                        {t.overview.transactionsCount(row.count)}
                      </p>
                    </td>
                    <td className="px-3 py-3 text-end text-deposit-text">
                      {row.deposits ? (
                        f.money(row.deposits)
                      ) : (
                        <span className="text-ink-3">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-end text-expense-text">
                      {row.expenses ? (
                        f.money(row.expenses)
                      ) : (
                        <span className="text-ink-3">—</span>
                      )}
                    </td>
                    <td
                      className={cn(
                        "px-5 py-3 text-end font-medium",
                        row.deposits - row.expenses < 0
                          ? "text-expense-text"
                          : "text-ink"
                      )}
                    >
                      {f.money(row.deposits - row.expenses)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={Users}
            title={t.analytics.noData}
            body={t.analytics.noDataBody}
            compact
          />
        )}
      </section>
    </div>
  );
}
