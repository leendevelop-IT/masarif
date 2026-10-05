import { useLocale } from "@/contexts/LocaleContext";
import { cn } from "@/lib/utils";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type CashFlowPoint = {
  month: string;
  deposits: number;
  expenses: number;
};

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ dataKey: string; value: number }>;
  label?: string;
}) {
  const { t, f } = useLocale();
  if (!active || !payload?.length || !label) return null;
  const deposits =
    payload.find(item => item.dataKey === "deposits")?.value ?? 0;
  const expenses =
    payload.find(item => item.dataKey === "expenses")?.value ?? 0;
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 text-sm shadow-pop">
      <p className="font-medium text-ink">{f.monthLong(label)}</p>
      <dl className="tnum mt-1 space-y-0.5 text-ink-2">
        <div className="flex items-center justify-between gap-4">
          <dt className="flex items-center gap-1.5">
            <i className="size-2 rounded-full bg-deposit" />
            {t.overview.deposits}
          </dt>
          <dd>{f.money(deposits)}</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="flex items-center gap-1.5">
            <i className="size-2 rounded-full bg-expense" />
            {t.overview.expenses}
          </dt>
          <dd>{f.money(expenses)}</dd>
        </div>
      </dl>
    </div>
  );
}

/**
 * Grouped monthly bars, deposits beside expenses. One axis, thin marks, a
 * recessive grid, a legend for the two series and a hover tooltip.
 */
export function CashFlowChart({
  data,
  height = 240,
  className,
}: {
  data: CashFlowPoint[];
  height?: number;
  className?: string;
}) {
  const { t, f } = useLocale();
  const empty = data.every(point => !point.deposits && !point.expenses);

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div
        className="flex flex-wrap items-center gap-4 text-xs text-ink-2"
        role="list"
        aria-label={t.overview.cashFlow}
      >
        <span role="listitem" className="inline-flex items-center gap-1.5">
          <i className="size-2.5 rounded-[3px] bg-deposit" />{" "}
          {t.overview.deposits}
        </span>
        <span role="listitem" className="inline-flex items-center gap-1.5">
          <i className="size-2.5 rounded-[3px] bg-expense" />{" "}
          {t.overview.expenses}
        </span>
      </div>
      <div dir="ltr" style={{ height }} className="relative -ms-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            barGap={2}
            barCategoryGap="28%"
            margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
          >
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="month"
              tickFormatter={f.monthShort}
              axisLine={false}
              tickLine={false}
              dy={6}
              interval={0}
            />
            <YAxis
              tickFormatter={value => f.compact(Number(value))}
              axisLine={false}
              tickLine={false}
              width={52}
              tickCount={5}
            />
            <Tooltip
              content={<ChartTooltip />}
              cursor={{ fill: "var(--surface-2)", radius: 6 }}
            />
            <Bar
              dataKey="deposits"
              fill="var(--deposit)"
              radius={[4, 4, 0, 0]}
              maxBarSize={26}
              isAnimationActive={false}
            />
            <Bar
              dataKey="expenses"
              fill="var(--expense)"
              radius={[4, 4, 0, 0]}
              maxBarSize={26}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
        {empty && (
          <p
            className="pointer-events-none absolute inset-0 grid place-items-center text-sm text-ink-3"
            dir="auto"
          >
            {t.analytics.noData}
          </p>
        )}
      </div>
    </div>
  );
}

/** The same numbers as a table, for screen readers and for anyone who prefers rows. */
export function CashFlowTable({ data }: { data: CashFlowPoint[] }) {
  const { t, f } = useLocale();
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-start text-xs text-ink-3">
            <th className="py-2 pe-3 text-start font-medium">
              {t.analytics.month}
            </th>
            <th className="py-2 px-3 text-end font-medium">
              {t.overview.deposits}
            </th>
            <th className="py-2 px-3 text-end font-medium">
              {t.overview.expenses}
            </th>
            <th className="py-2 ps-3 text-end font-medium">{t.overview.net}</th>
          </tr>
        </thead>
        <tbody className="tnum">
          {data.map(point => (
            <tr key={point.month} className="border-t border-border">
              <td className="py-2 pe-3 text-ink">{f.month(point.month)}</td>
              <td className="py-2 px-3 text-end text-ink-2">
                {f.money(point.deposits)}
              </td>
              <td className="py-2 px-3 text-end text-ink-2">
                {f.money(point.expenses)}
              </td>
              <td
                className={cn(
                  "py-2 ps-3 text-end font-medium",
                  point.deposits - point.expenses < 0
                    ? "text-expense-text"
                    : "text-ink"
                )}
              >
                {f.money(point.deposits - point.expenses)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
