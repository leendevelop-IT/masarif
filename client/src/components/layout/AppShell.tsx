import { BrandMark } from "@/components/layout/BrandMark";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useDashboard } from "@/contexts/DashboardContext";
import { useLocale } from "@/contexts/LocaleContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  ArrowLeftRight,
  ChartNoAxesCombined,
  LayoutDashboard,
  LogOut,
  Moon,
  Plus,
  Settings2,
  Sun,
} from "lucide-react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  match: (path: string) => boolean;
};

function useNavItems(): NavItem[] {
  const { t } = useLocale();
  return [
    {
      href: "/",
      label: t.nav.overview,
      icon: LayoutDashboard,
      match: path => path === "/",
    },
    {
      href: "/transactions",
      label: t.nav.transactions,
      icon: ArrowLeftRight,
      match: path => path.startsWith("/transactions"),
    },
    {
      href: "/analytics",
      label: t.nav.analytics,
      icon: ChartNoAxesCombined,
      match: path => path.startsWith("/analytics"),
    },
    {
      href: "/settings",
      label: t.nav.settings,
      icon: Settings2,
      match: path => path.startsWith("/settings"),
    },
  ];
}

function ThemeToggle({ className }: { className?: string }) {
  const { t } = useLocale();
  const { theme, toggleTheme } = useTheme();
  const utils = trpc.useUtils();
  const persist = trpc.finance.updateSettings.useMutation({
    onSuccess: () => utils.finance.dashboard.invalidate(),
  });
  return (
    <button
      type="button"
      onClick={() => {
        const next = theme === "dark" ? "light" : "dark";
        toggleTheme();
        persist.mutate({ theme: next });
      }}
      aria-label={t.common.toggleTheme}
      className={cn(
        "grid size-10 place-items-center rounded-lg text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink focus-visible:ring-[3px] focus-visible:ring-primary/30 focus-visible:outline-none",
        className
      )}
    >
      {theme === "dark" ? (
        <Sun className="size-5" />
      ) : (
        <Moon className="size-5" />
      )}
    </button>
  );
}

function Sidebar() {
  const { t } = useLocale();
  const { user } = useDashboard();
  const { logout } = useAuth();
  const [location] = useLocation();
  const items = useNavItems();
  const initial = (user.name || user.email || "?")
    .trim()
    .charAt(0)
    .toUpperCase();

  const signOut = async () => {
    try {
      await logout();
      toast.success(t.auth.signedOut);
    } catch {
      // The local session is cleared regardless; the user lands on the sign-in screen.
    }
  };

  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-e border-border bg-surface lg:flex">
      <div className="flex items-center gap-3 px-5 pt-6 pb-4">
        <BrandMark />
        <div className="min-w-0">
          <p className="truncate text-base font-semibold leading-tight text-ink">
            {t.app.name}
          </p>
          <p className="truncate text-xs text-ink-3">{t.app.tagline}</p>
        </div>
      </div>
      <nav className="mt-2 flex flex-col gap-1 px-3" aria-label={t.common.menu}>
        {items.map(item => {
          const active = item.match(location);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors duration-150",
                active
                  ? "bg-primary-soft text-primary-strong dark:text-primary"
                  : "text-ink-2 hover:bg-surface-2 hover:text-ink"
              )}
            >
              {active && (
                <span
                  aria-hidden
                  className="absolute inset-y-2 start-0 w-1 rounded-e-full bg-primary"
                />
              )}
              <Icon className="size-5 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto flex flex-col gap-2 px-3 pb-5">
        <div className="flex items-center justify-between px-1">
          <ThemeToggle />
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-border bg-background p-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-net-soft text-sm font-semibold text-net-text">
            {initial}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-ink">
              {user.name || user.email}
            </p>
            {user.name && (
              <p className="truncate text-xs text-ink-3" dir="ltr">
                {user.email}
              </p>
            )}
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={signOut}
                aria-label={t.nav.signOut}
                className="grid size-9 shrink-0 place-items-center rounded-lg text-ink-3 transition-colors hover:bg-expense-soft hover:text-expense-text"
              >
                <LogOut className="size-4 rtl:-scale-x-100" />
              </button>
            </TooltipTrigger>
            <TooltipContent>{t.nav.signOut}</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </aside>
  );
}

function MobileTopBar() {
  const { t } = useLocale();
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/85 px-4 backdrop-blur-md lg:hidden">
      <Link href="/" className="flex items-center gap-2.5">
        <BrandMark size="sm" />
        <span className="text-base font-semibold text-ink">{t.app.name}</span>
      </Link>
      <ThemeToggle />
    </header>
  );
}

function BottomNav() {
  const { t } = useLocale();
  const { openNewTransaction } = useDashboard();
  const [location] = useLocation();
  const items = useNavItems();
  const [first, second, third, fourth] = items;

  const renderItem = (item: NavItem) => {
    const active = item.match(location);
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg py-1.5 text-[11px] font-medium transition-colors",
          active ? "text-primary-strong dark:text-primary" : "text-ink-3"
        )}
      >
        <Icon className="size-5" />
        <span className="truncate">{item.label}</span>
      </Link>
    );
  };

  return (
    <nav
      aria-label={t.common.menu}
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
    >
      <div className="mx-auto flex h-16 max-w-lg items-stretch px-2">
        {renderItem(first)}
        {renderItem(second)}
        <div className="flex flex-1 items-center justify-center">
          <button
            type="button"
            onClick={() => openNewTransaction()}
            aria-label={t.nav.add}
            className="grid size-14 -translate-y-4 place-items-center rounded-full bg-primary text-primary-foreground shadow-fab transition-transform active:scale-95"
          >
            <Plus className="size-7" strokeWidth={2.5} />
          </button>
        </div>
        {renderItem(third)}
        {renderItem(fourth)}
      </div>
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileTopBar />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-4 pb-28 sm:px-6 lg:px-10 lg:pt-8 lg:pb-12">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
