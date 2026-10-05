import type { TransactionType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react";

/** Small square icon that says deposit or expense at a glance. */
export function TypeChip({
  type,
  size = "md",
  className,
}: {
  type: TransactionType;
  size?: "sm" | "md";
  className?: string;
}) {
  const Icon = type === "deposit" ? ArrowDownToLine : ArrowUpFromLine;
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center rounded-lg",
        size === "sm" ? "size-8" : "size-10",
        type === "deposit"
          ? "bg-deposit-soft text-deposit-text"
          : "bg-expense-soft text-expense-text",
        className
      )}
    >
      <Icon className={size === "sm" ? "size-4" : "size-[18px]"} />
    </span>
  );
}
