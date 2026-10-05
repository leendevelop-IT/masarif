import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
  className,
  compact = false,
}: {
  icon: LucideIcon;
  title: string;
  body?: string;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "px-4 py-8" : "px-6 py-14",
        className
      )}
    >
      <span
        className={cn(
          "grid place-items-center rounded-2xl bg-surface-2 text-ink-3",
          compact ? "size-11" : "size-14"
        )}
      >
        <Icon className={compact ? "size-5" : "size-7"} aria-hidden />
      </span>
      <h3
        className={cn(
          "mt-4 font-semibold text-ink",
          compact ? "text-sm" : "text-base"
        )}
      >
        {title}
      </h3>
      {body && (
        <p className="mt-1 max-w-sm text-sm leading-6 text-ink-2">{body}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
