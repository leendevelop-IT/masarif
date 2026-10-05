import { cn } from "@/lib/utils";

const sizes = {
  sm: "size-8 rounded-lg",
  md: "size-10 rounded-xl",
  lg: "size-14 rounded-2xl",
} as const;

/** The product mark: a rounded emerald tile with a wallet stroke and a small upward arrow. */
export function BrandMark({
  size = "md",
  className,
  inverse = false,
}: {
  size?: keyof typeof sizes;
  className?: string;
  inverse?: boolean;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center shadow-card",
        sizes[size],
        inverse ? "bg-white text-primary" : "bg-primary text-white",
        className
      )}
    >
      <svg
        viewBox="0 0 64 64"
        className="size-[62%]"
        fill="none"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M19 42V30a9 9 0 0 1 18 0v12" />
        <path d="M37 36h8" />
        <path
          d="M46 20l-7 7M46 20v6M46 20h-6"
          strokeWidth="3.5"
          className={inverse ? "stroke-warning" : "stroke-[#FFD58A]"}
        />
      </svg>
    </span>
  );
}
