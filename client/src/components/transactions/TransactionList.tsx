import { EmptyState } from "@/components/common/EmptyState";
import { TypeChip } from "@/components/common/TypeChip";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useDashboard } from "@/contexts/DashboardContext";
import { useLocale } from "@/contexts/LocaleContext";
import { describeError } from "@/lib/errors";
import { monthKey } from "@/lib/periods";
import { trpc } from "@/lib/trpc";
import type { TransactionRecord } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  Archive,
  ExternalLink,
  MoreHorizontal,
  Paperclip,
  Pencil,
  ReceiptText,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";

type Props = {
  records: TransactionRecord[];
  /** Changes when the filters change; paging restarts from the first page then, and only then. */
  resetKey?: string;
  pageSize?: number;
  /** Fewer columns and no paging, for the overview. */
  compact?: boolean;
  emptyTitle?: string;
  emptyBody?: string;
  emptyAction?: ReactNode;
};

function useArchive() {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const restore = trpc.finance.restoreTransaction.useMutation({
    onSuccess: () => utils.finance.dashboard.invalidate(),
  });
  const archive = trpc.finance.archiveTransaction.useMutation({
    onError: error => toast.error(describeError(error, t)),
  });
  return (record: TransactionRecord) =>
    archive.mutate(
      { id: record.id },
      {
        onSuccess: async () => {
          await utils.finance.dashboard.invalidate();
          toast.success(t.transactions.archived(record.recordNumber), {
            description: t.transactions.archiveHint,
            action: {
              label: t.common.undo,
              onClick: () =>
                restore.mutate(
                  { id: record.id },
                  {
                    onSuccess: () =>
                      toast.success(
                        t.transactions.restored(record.recordNumber)
                      ),
                  }
                ),
            },
          });
        },
      }
    );
}

function Amount({
  record,
  className,
}: {
  record: TransactionRecord;
  className?: string;
}) {
  const { f } = useLocale();
  const deposit = record.type === "deposit";
  return (
    <span
      dir="ltr"
      className={cn(
        "tnum inline-block whitespace-nowrap font-semibold",
        deposit ? "text-deposit-text" : "text-expense-text",
        className
      )}
    >
      {deposit ? "+" : "−"}
      {f.money(record.totalAmount)}
    </span>
  );
}

function RowMenu({
  record,
  onArchive,
}: {
  record: TransactionRecord;
  onArchive: (record: TransactionRecord) => void;
}) {
  const { t, dir } = useLocale();
  const { openEditTransaction } = useDashboard();
  return (
    <DropdownMenu dir={dir}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={t.common.more}
          onClick={event => event.stopPropagation()}
          className="grid size-9 place-items-center rounded-lg text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink data-[state=open]:bg-surface-2 data-[state=open]:text-ink"
        >
          <MoreHorizontal className="size-5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="min-w-44 border-border bg-surface"
        onClick={event => event.stopPropagation()}
      >
        <DropdownMenuItem onSelect={() => openEditTransaction(record)}>
          <Pencil />
          {t.common.edit}
        </DropdownMenuItem>
        {record.attachmentUrl && (
          <DropdownMenuItem
            onSelect={() =>
              window.open(record.attachmentUrl!, "_blank", "noopener")
            }
          >
            <ExternalLink />
            {t.transactions.openAttachment}
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onSelect={() => onArchive(record)}
        >
          <Archive />
          {t.transactions.archive}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AttachmentIcon({ record }: { record: TransactionRecord }) {
  const { t } = useLocale();
  if (!record.attachmentName) return null;
  if (!record.attachmentUrl) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className="grid size-8 place-items-center text-ink-3/60"
            tabIndex={0}
          >
            <Paperclip className="size-4" />
            <span className="sr-only">
              {t.transactions.attachmentUnavailable}
            </span>
          </span>
        </TooltipTrigger>
        <TooltipContent>{t.transactions.attachmentUnavailable}</TooltipContent>
      </Tooltip>
    );
  }
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <a
          href={record.attachmentUrl}
          target="_blank"
          rel="noreferrer"
          onClick={event => event.stopPropagation()}
          aria-label={t.transactions.openAttachment}
          className="grid size-8 place-items-center rounded-lg text-ink-2 hover:bg-surface-2 hover:text-ink"
        >
          <Paperclip className="size-4" />
        </a>
      </TooltipTrigger>
      <TooltipContent dir="auto">{record.attachmentName}</TooltipContent>
    </Tooltip>
  );
}

export function TransactionList({
  records,
  resetKey = "",
  pageSize = 40,
  compact = false,
  emptyTitle,
  emptyBody,
  emptyAction,
}: Props) {
  const { t, f } = useLocale();
  const { openEditTransaction } = useDashboard();
  const archive = useArchive();
  const [visibleCount, setVisibleCount] = useState(pageSize);

  useEffect(() => setVisibleCount(pageSize), [resetKey, pageSize]);

  const visible = compact ? records : records.slice(0, visibleCount);
  const groups = useMemo(() => {
    const result: Array<{ key: string; records: TransactionRecord[] }> = [];
    for (const record of visible) {
      const key = monthKey(record.transactionDate);
      const last = result[result.length - 1];
      if (last && last.key === key) last.records.push(record);
      else result.push({ key, records: [record] });
    }
    return result;
  }, [visible]);

  if (!records.length) {
    return (
      <EmptyState
        icon={ReceiptText}
        title={emptyTitle ?? t.transactions.emptyTitle}
        body={emptyBody ?? t.transactions.emptyBody}
        action={emptyAction}
        compact={compact}
      />
    );
  }

  const remaining = records.length - visible.length;

  return (
    <div>
      {/* Desktop: a table with month separators */}
      <div className="hidden md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-ink-3">
              <th scope="col" className="px-5 py-3 text-start font-medium">
                {t.transactions.columns.record}
              </th>
              <th scope="col" className="px-3 py-3 text-start font-medium">
                {t.transactions.columns.date}
              </th>
              <th scope="col" className="px-3 py-3 text-start font-medium">
                {t.transactions.columns.category}
              </th>
              {!compact && (
                <th scope="col" className="px-3 py-3 text-start font-medium">
                  {t.transactions.columns.party}
                </th>
              )}
              <th scope="col" className="px-3 py-3 text-end font-medium">
                {t.transactions.columns.total}
              </th>
              <th scope="col" className="w-24 px-3 py-3">
                <span className="sr-only">
                  {t.transactions.columns.actions}
                </span>
              </th>
            </tr>
          </thead>
          {groups.map(group => (
            <tbody key={group.key}>
              {!compact && (
                <tr>
                  <th
                    scope="rowgroup"
                    colSpan={6}
                    className="bg-background px-5 py-2 text-start text-xs font-semibold text-ink-3"
                  >
                    {f.monthLong(group.key)}
                  </th>
                </tr>
              )}
              {group.records.map(record => (
                <tr
                  key={record.id}
                  onClick={() => openEditTransaction(record)}
                  className="group cursor-pointer border-b border-border transition-colors last:border-b-0 hover:bg-surface-2/60"
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <TypeChip type={record.type} size="sm" />
                      <div className="min-w-0">
                        <button
                          type="button"
                          className="tnum font-semibold text-ink outline-none focus-visible:underline"
                          dir="ltr"
                          onClick={() => openEditTransaction(record)}
                        >
                          {record.recordNumber}
                        </button>
                        {record.invoiceNumber && (
                          <p
                            className="tnum mt-0.5 text-xs text-ink-3"
                            dir="auto"
                          >
                            {t.transactions.invoiceShort(record.invoiceNumber)}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="tnum whitespace-nowrap px-3 py-3 text-ink-2">
                    {f.date(record.transactionDate)}
                  </td>
                  <td className="px-3 py-3 text-ink-2">
                    <span className="inline-flex items-center gap-2">
                      <i
                        className="size-2 shrink-0 rounded-full"
                        style={{ background: record.categoryColor }}
                        aria-hidden
                      />
                      {record.categoryName || t.analytics.uncategorized}
                    </span>
                  </td>
                  {!compact && (
                    <td
                      className="max-w-48 truncate px-3 py-3 text-ink-2"
                      dir="auto"
                    >
                      {record.customerName || (
                        <span className="text-ink-3">—</span>
                      )}
                    </td>
                  )}
                  <td className="px-3 py-3 text-end">
                    <Amount record={record} />
                    {record.taxAmount > 0 && (
                      <p className="tnum mt-0.5 text-xs text-ink-3">
                        {t.transactions.columns.net}{" "}
                        {f.number(record.amountBeforeTax)} ·{" "}
                        {t.transactions.columns.tax}{" "}
                        {f.number(record.taxAmount)}
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <div
                      className="flex items-center justify-end gap-1"
                      onClick={event => event.stopPropagation()}
                    >
                      <AttachmentIcon record={record} />
                      <RowMenu record={record} onArchive={archive} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>

      {/* Mobile: stacked cards */}
      <div className="md:hidden">
        {groups.map(group => (
          <div key={group.key}>
            {!compact && (
              <p className="bg-background px-4 py-2 text-xs font-semibold text-ink-3">
                {f.monthLong(group.key)}
              </p>
            )}
            <ul>
              {group.records.map(record => (
                <li
                  key={record.id}
                  className="border-b border-border last:border-b-0"
                >
                  <div
                    className="flex items-center gap-3 px-4 py-3 active:bg-surface-2/60"
                    onClick={() => openEditTransaction(record)}
                  >
                    <TypeChip type={record.type} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          className="tnum truncate font-semibold text-ink outline-none focus-visible:underline"
                          dir="ltr"
                          onClick={event => {
                            event.stopPropagation();
                            openEditTransaction(record);
                          }}
                        >
                          {record.recordNumber}
                        </button>
                        <Amount record={record} />
                      </div>
                      <div className="mt-0.5 flex items-center justify-between gap-2 text-xs text-ink-3">
                        <p className="flex min-w-0 items-center gap-1">
                          {record.attachmentUrl && (
                            <>
                              <Paperclip className="size-3 shrink-0" />
                              <span className="sr-only">
                                {t.transactions.columns.attachment}
                              </span>
                            </>
                          )}
                          <span className="truncate" dir="auto">
                            {record.categoryName || t.analytics.uncategorized}
                            {record.customerName
                              ? ` · ${record.customerName}`
                              : ""}
                          </span>
                        </p>
                        <span className="tnum shrink-0">
                          {f.dayMonth(record.transactionDate)}
                        </span>
                      </div>
                    </div>
                    <div
                      className="flex shrink-0 items-center"
                      onClick={event => event.stopPropagation()}
                    >
                      <RowMenu record={record} onArchive={archive} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {!compact && remaining > 0 && (
        <div className="flex justify-center border-t border-border p-3">
          <Button
            variant="ghost"
            onClick={() => setVisibleCount(count => count + pageSize)}
          >
            {t.transactions.loadMore(Math.min(remaining, pageSize))}
          </Button>
        </div>
      )}
    </div>
  );
}
