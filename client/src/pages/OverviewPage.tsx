import { CashFlowChart } from "@/components/charts/CashFlowChart";
import { CategoryBars } from "@/components/charts/CategoryBars";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { PeriodPicker } from "@/components/common/PeriodPicker";
import { StatTile } from "@/components/common/StatTile";
import { TransactionList } from "@/components/transactions/TransactionList";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/contexts/DashboardContext";
import { useLocale } from "@/contexts/LocaleContext";
import { usePeriod } from "@/hooks/usePeriod";
import { categorySlices, monthlyCashFlow } from "@/lib/analytics";
import { toISODate, toLocalDateTime } from "@/lib/format";
import {
  inRange,
  percentChange,
  previousRange,
  summarize,
} from "@/lib/periods";
import { cn } from "@/lib/utils";
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  Plus,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useMemo } from "react";
import { Link } from "wouter";

function SectionCard({
  title,
  hint,
  action,
  children,
  className,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("card flex flex-col", className)}>
      <header className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
        <div>
          <h2 className="font-semibold text-ink">{title}</h2>
          {hint && <p className="mt-0.5 text-xs text-ink-3">{hint}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

export default function OverviewPage() {
  const { t, f, dir } = useLocale();
  const { data, user, openNewTransaction } = useDashboard();
  const { period, setPeriod, range } = usePeriod("month");
  const Chevron = dir === "rtl" ? ChevronLeft : ChevronRight;

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
    () => monthlyCashFlow(data.transactions, 6),
    [data.transactions]
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
  const recent = useMemo(
    () => data.transactions.slice(0, 6),
    [data.transactions]
  );
  const upcoming = useMemo(() => {
    const now = toLocalDateTime(new Date());
    return data.reminders
      .filter(reminder => reminder.enabled && reminder.reminderDate >= now)
      .slice(0, 4);
  }, [data.reminders]);

  const today = toISODate(new Date());
  const hasAny = data.transactions.length > 0;
  const netHint =
    current.net > 0
      ? t.overview.netPositive
      : current.net < 0
        ? t.overview.netNegative
        : t.overview.netZero;

  return (
    <div>
      <PageHeader
        title={t.overview.greeting(user.name.split(" ")[0] ?? "")}
        subtitle={f.dateLong(today)}
        actions={
          <Button
            onClick={() => openNewTransaction()}
            className="hidden h-11 gap-2 bg-primary px-5 text-primary-foreground hover:bg-primary-strong lg:inline-flex"
          >
            <Plus className="size-4" />
            {t.nav.add}
          </Button>
        }
      />

      {!hasAny ? (
        <div className="card">
          <EmptyState
            icon={Sparkles}
            title={t.overview.emptyTitle}
            body={t.overview.emptyBody}
            action={
              <Button
                onClick={() => openNewTransaction()}
                className="h-11 gap-2 bg-primary px-5 text-primary-foreground hover:bg-primary-strong"
              >
                <Plus className="size-4" />
                {t.overview.addFirst}
              </Button>
            }
          />
        </div>
      ) : (
        <>
          <PeriodPicker value={period} onChange={setPeriod} className="mb-5" />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
              hint={t.overview.transactionsCount(
                inPeriod.filter(record => record.type === "deposit").length
              )}
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
              hint={t.overview.transactionsCount(
                inPeriod.filter(record => record.type === "expense").length
              )}
            />
            <StatTile
              label={t.overview.net}
              value={f.money(current.net)}
              icon={Wallet}
              tone="net"
              hint={netHint}
            />
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-[3fr_2fr]">
            <SectionCard
              title={t.overview.cashFlow}
              hint={t.overview.cashFlowHint}
            >
              <div className="px-5 pb-5">
                <CashFlowChart data={chart} />
              </div>
            </SectionCard>

            <div className="flex flex-col gap-5">
              <SectionCard
                title={t.overview.upcoming}
                action={
                  <Link
                    href="/settings/reminders"
                    className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-xs font-medium text-primary-strong hover:underline dark:text-primary"
                  >
                    {t.overview.manageReminders}
                    <Chevron className="size-3.5" />
                  </Link>
                }
              >
                {upcoming.length ? (
                  <ul className="px-5 pb-5">
                    {upcoming.map(reminder => (
                      <li
                        key={reminder.id}
                        className="flex items-center gap-3 border-t border-border py-2.5 first:border-t-0"
                      >
                        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-warning-soft text-warning-text">
                          <Bell className="size-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p
                            className="truncate text-sm font-medium text-ink"
                            dir="auto"
                          >
                            {reminder.title}
                          </p>
                          <p className="tnum text-xs text-ink-3">
                            {f.dateTime(reminder.reminderDate)}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="px-5 pb-5 text-sm text-ink-3">
                    {t.overview.noUpcoming}
                  </p>
                )}
              </SectionCard>

              <SectionCard
                title={t.overview.topExpenseCategories}
                className="flex-1"
              >
                <div className="px-5 pb-5">
                  <CategoryBars
                    slices={expenseSlices}
                    type="expense"
                    emptyText={t.overview.noCategoryData}
                    limit={5}
                  />
                </div>
              </SectionCard>
            </div>
          </div>

          <SectionCard
            title={t.overview.recent}
            className="mt-5"
            action={
              <Link
                href="/transactions"
                className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-xs font-medium text-primary-strong hover:underline dark:text-primary"
              >
                {t.common.viewAll}
                <Chevron className="size-3.5" />
              </Link>
            }
          >
            <div className="border-t border-border">
              <TransactionList records={recent} compact />
            </div>
          </SectionCard>
        </>
      )}
    </div>
  );
}
