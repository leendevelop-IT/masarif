import ErrorBoundary from "@/components/ErrorBoundary";
import { AppShell } from "@/components/layout/AppShell";
import {
  TransactionDialog,
  type DialogMode,
} from "@/components/transactions/TransactionDialog";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DashboardProvider } from "@/contexts/DashboardContext";
import { LocaleProvider, useLocale } from "@/contexts/LocaleContext";
import { ThemeProvider, useTheme } from "@/contexts/ThemeContext";
import { useAuth, type AuthUser } from "@/hooks/useAuth";
import { describeError } from "@/lib/errors";
import { prefs } from "@/lib/prefs";
import { trpc } from "@/lib/trpc";
import type { TransactionRecord, TransactionType } from "@/lib/types";
import AnalyticsPage from "@/pages/AnalyticsPage";
import LoginPage from "@/pages/LoginPage";
import NotFound from "@/pages/NotFound";
import OverviewPage from "@/pages/OverviewPage";
import PinGate from "@/pages/PinGate";
import SettingsPage from "@/pages/SettingsPage";
import TransactionsPage from "@/pages/TransactionsPage";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Route, Switch } from "wouter";
import { BrandMark } from "./components/layout/BrandMark";

function SplashScreen({ message }: { message?: string }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-background">
      <div className="flex flex-col items-center gap-4 text-ink-3">
        <BrandMark size="lg" />
        <Loader2 className="size-5 animate-spin text-primary" aria-hidden />
        {message && <p className="text-sm">{message}</p>}
      </div>
    </div>
  );
}

function AuthenticatedApp({ user }: { user: AuthUser }) {
  const { t, language, setLanguage } = useLocale();
  const { theme, setTheme } = useTheme();
  const dashboard = trpc.finance.dashboard.useQuery(undefined, {
    retry: 1,
    staleTime: 30_000,
  });
  const [pinUnlocked, setPinUnlocked] = useState(() => prefs.isPinUnlocked());
  const [dialog, setDialog] = useState<{ open: boolean; mode: DialogMode }>({
    open: false,
    mode: { type: "deposit" },
  });
  const syncedForUser = useRef<number | null>(null);

  // Account preferences win over device preferences, once per sign-in.
  const settings = dashboard.data?.settings;
  useEffect(() => {
    if (!settings || syncedForUser.current === user.id) return;
    syncedForUser.current = user.id;
    if (settings.language !== language) setLanguage(settings.language);
    if (settings.theme !== theme) setTheme(settings.theme);
  }, [settings, user.id, language, theme, setLanguage, setTheme]);

  const openNewTransaction = useCallback(
    (type: TransactionType = "deposit") =>
      setDialog({ open: true, mode: { type } }),
    []
  );
  const openEditTransaction = useCallback(
    (record: TransactionRecord) => setDialog({ open: true, mode: { record } }),
    []
  );
  const closeDialog = useCallback(
    (open: boolean) => setDialog(current => ({ ...current, open })),
    []
  );

  if (dashboard.isLoading) return <SplashScreen message={t.common.preparing} />;
  if (dashboard.error || !dashboard.data) {
    return (
      <div className="grid min-h-dvh place-items-center bg-background p-6 text-center">
        <div className="card max-w-md p-8">
          <h1 className="text-lg font-semibold text-ink">
            {t.common.somethingWrong}
          </h1>
          <p className="mt-2 text-sm text-ink-2">
            {dashboard.error
              ? describeError(dashboard.error, t)
              : t.common.tryAgainBody}
          </p>
          <button
            type="button"
            onClick={() => dashboard.refetch()}
            className="mt-6 inline-flex h-10 items-center rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary-strong"
          >
            {t.common.retry}
          </button>
        </div>
      </div>
    );
  }

  if (
    dashboard.data.settings.pinEnabled &&
    !pinUnlocked &&
    !prefs.isPinUnlocked()
  ) {
    return (
      <PinGate
        onUnlocked={() => {
          prefs.setPinUnlocked(true);
          setPinUnlocked(true);
        }}
      />
    );
  }

  return (
    <DashboardProvider
      value={{
        data: dashboard.data,
        user,
        refresh: dashboard.refetch,
        openNewTransaction,
        openEditTransaction,
      }}
    >
      <AppShell>
        <Switch>
          <Route path="/" component={OverviewPage} />
          <Route path="/transactions/:tab?" component={TransactionsPage} />
          <Route path="/analytics" component={AnalyticsPage} />
          <Route path="/settings/:section?" component={SettingsPage} />
          <Route component={NotFound} />
        </Switch>
      </AppShell>
      <TransactionDialog
        open={dialog.open}
        mode={dialog.mode}
        onOpenChange={closeDialog}
      />
    </DashboardProvider>
  );
}

function Root() {
  const { user, loading } = useAuth();
  if (loading) return <SplashScreen />;
  if (!user) return <LoginPage />;
  return <AuthenticatedApp user={user} />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <LocaleProvider>
          <TooltipProvider delayDuration={300}>
            <Toaster />
            <Root />
          </TooltipProvider>
        </LocaleProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
