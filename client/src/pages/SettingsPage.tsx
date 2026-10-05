import { EmptyState } from "@/components/common/EmptyState";
import { Field } from "@/components/common/Field";
import { PageHeader } from "@/components/common/PageHeader";
import { TypeChip } from "@/components/common/TypeChip";
import { BrandMark } from "@/components/layout/BrandMark";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useDashboard } from "@/contexts/DashboardContext";
import { useLocale } from "@/contexts/LocaleContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/hooks/useAuth";
import { describeError } from "@/lib/errors";
import { toAsciiDigits, toLocalDateTime } from "@/lib/format";
import { prefs, type Language, type Numerals, type Theme } from "@/lib/prefs";
import { trpc } from "@/lib/trpc";
import type {
  AuditLog,
  Category,
  Reminder,
  TransactionRecord,
  TransactionType,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { MIN_PASSWORD_LENGTH } from "@shared/const";
import { clampTaxRate } from "@shared/money";
import {
  Archive,
  ArchiveRestore,
  Bell,
  Check,
  ChevronLeft,
  ChevronRight,
  History,
  Info,
  Loader2,
  LockKeyhole,
  LogOut,
  Moon,
  Pencil,
  Percent,
  Plus,
  SlidersHorizontal,
  Sun,
  Tags,
  Trash2,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { Link, useLocation, useParams } from "wouter";

const SECTIONS = [
  "account",
  "preferences",
  "tax",
  "categories",
  "reminders",
  "archive",
  "security",
  "about",
] as const;
type SectionKey = (typeof SECTIONS)[number];

const SECTION_ICONS: Record<SectionKey, LucideIcon> = {
  account: UserRound,
  preferences: SlidersHorizontal,
  tax: Percent,
  categories: Tags,
  reminders: Bell,
  archive: Archive,
  security: LockKeyhole,
  about: Info,
};

const isSection = (value: string | undefined): value is SectionKey =>
  SECTIONS.includes(value as SectionKey);

const PRIMARY_BUTTON =
  "h-11 gap-2 bg-primary px-5 text-primary-foreground hover:bg-primary-strong";
const PIN_PATTERN = /^\d{4,8}$/;
const CATEGORY_COLORS = [
  "#0F9D82",
  "#2563EB",
  "#7C3AED",
  "#DB2777",
  "#DE5A4E",
  "#EA580C",
  "#CA8A04",
  "#65A30D",
  "#0891B2",
  "#64748B",
];

/** Mirrors the server: prefix + four-digit counter. */
const formatRecordNumber = (prefix: string, start: number) =>
  `${prefix}${String(Math.max(1, Math.floor(start) || 1)).padStart(4, "0")}`;

export default function SettingsPage() {
  const { t, dir } = useLocale();
  const params = useParams<{ section?: string }>();
  const [, navigate] = useLocation();
  const section = isSection(params.section) ? params.section : null;
  const active: SectionKey = section ?? "account";
  const Chevron = dir === "rtl" ? ChevronLeft : ChevronRight;
  const BackChevron = dir === "rtl" ? ChevronRight : ChevronLeft;

  // An unknown section in the URL falls back to the list rather than a blank page.
  useEffect(() => {
    if (params.section && !section) navigate("/settings", { replace: true });
  }, [params.section, section, navigate]);

  return (
    <div>
      <div className={cn(section && "hidden lg:block")}>
        <PageHeader title={t.settings.title} subtitle={t.settings.subtitle} />
      </div>

      <div className="lg:grid lg:grid-cols-[232px_minmax(0,1fr)] lg:gap-10">
        <nav
          aria-label={t.settings.title}
          className={cn(
            "lg:sticky lg:top-8 lg:self-start",
            section && "hidden lg:block"
          )}
        >
          <ul className="card divide-y divide-border lg:space-y-1 lg:divide-y-0 lg:border-0 lg:bg-transparent lg:shadow-none">
            {SECTIONS.map(key => {
              const Icon = SECTION_ICONS[key];
              const current = key === active;
              return (
                <li key={key}>
                  <Link
                    href={`/settings/${key}`}
                    aria-current={current ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3.5 transition-colors first:rounded-t-xl last:rounded-b-xl hover:bg-surface-2 lg:h-11 lg:rounded-lg lg:px-3 lg:py-0",
                      current
                        ? "text-ink lg:bg-primary-soft lg:text-primary-strong lg:hover:bg-primary-soft dark:lg:text-primary"
                        : "text-ink lg:text-ink-2 lg:hover:text-ink"
                    )}
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-surface-2 text-ink-2 lg:size-auto lg:bg-transparent lg:text-inherit">
                      <Icon className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">
                        {t.settings.sections[key]}
                      </span>
                      <span className="block truncate text-xs text-ink-3 lg:hidden">
                        {t.settings.descriptions[key]}
                      </span>
                    </span>
                    <Chevron className="size-4 shrink-0 text-ink-3 lg:hidden" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className={cn("min-w-0", !section && "hidden lg:block")}>
          <div className="mb-5">
            <Link
              href="/settings"
              className="mb-3 inline-flex h-9 items-center gap-1 rounded-lg pe-3 text-sm text-ink-2 hover:text-ink lg:hidden"
            >
              <BackChevron className="size-4" />
              {t.settings.title}
            </Link>
            <h2 className="text-xl font-semibold text-ink">
              {t.settings.sections[active]}
            </h2>
            <p className="mt-1 text-sm text-ink-2">
              {t.settings.descriptions[active]}
            </p>
          </div>
          <SectionView key={active} section={active} />
        </div>
      </div>
    </div>
  );
}

function SectionView({ section }: { section: SectionKey }) {
  switch (section) {
    case "account":
      return <AccountSection />;
    case "preferences":
      return <PreferencesSection />;
    case "tax":
      return <TaxSection />;
    case "categories":
      return <CategoriesSection />;
    case "reminders":
      return <RemindersSection />;
    case "archive":
      return <ArchiveSection />;
    case "security":
      return <SecuritySection />;
    case "about":
      return <AboutSection />;
  }
}

// ---------------------------------------------------------------------------
// Shared pieces
// ---------------------------------------------------------------------------

function SectionCard({
  title,
  description,
  children,
  className,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("card p-5 sm:p-6", className)}>
      {(title || description) && (
        <header className="mb-5">
          {title && <h3 className="font-semibold text-ink">{title}</h3>}
          {description && (
            <p className="mt-1 text-sm leading-6 text-ink-2">{description}</p>
          )}
        </header>
      )}
      {children}
    </section>
  );
}

function PreferenceRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-border py-4 first:pt-0 last:border-b-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink">{label}</p>
        {hint && <p className="mt-0.5 text-xs text-ink-3">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: ReactNode }[];
  label: string;
}) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map(option => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className="inline-flex h-9 items-center gap-1.5"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function SubmitButton({
  pending,
  children,
  className,
}: {
  pending: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Button
      type="submit"
      disabled={pending}
      className={cn(PRIMARY_BUTTON, className)}
    >
      {pending && <Loader2 className="size-4 animate-spin" />}
      {children}
    </Button>
  );
}

function useDashboardMutations() {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  return {
    invalidate: () => utils.finance.dashboard.invalidate(),
    onError: (error: unknown) => toast.error(describeError(error, t)),
  };
}

// ---------------------------------------------------------------------------
// Account
// ---------------------------------------------------------------------------

function AccountSection() {
  const { t } = useLocale();
  const { user } = useDashboard();
  const utils = trpc.useUtils();

  const [name, setName] = useState(user.name);
  const [nameError, setNameError] = useState<string | null>(null);
  const updateProfile = trpc.auth.updateProfile.useMutation({
    onSuccess: (_, variables) => {
      utils.auth.me.setData(undefined, { ...user, name: variables.name });
      toast.success(t.settings.account.profileSaved);
    },
    onError: error => toast.error(describeError(error, t)),
  });

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const changePassword = trpc.auth.changePassword.useMutation({
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success(t.settings.account.passwordChanged);
    },
    onError: error => setPasswordError(describeError(error, t)),
  });

  const saveProfile = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError(t.auth.errors.nameRequired);
      return;
    }
    setNameError(null);
    if (trimmed === user.name) return;
    updateProfile.mutate({ name: trimmed });
  };

  const savePassword = (event: FormEvent) => {
    event.preventDefault();
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setPasswordError(t.auth.errors.passwordShort(MIN_PASSWORD_LENGTH));
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(t.auth.errors.passwordMismatch);
      return;
    }
    setPasswordError(null);
    changePassword.mutate({ currentPassword, newPassword });
  };

  return (
    <div className="flex flex-col gap-5">
      <SectionCard>
        <form onSubmit={saveProfile} className="flex flex-col gap-4">
          <Field
            label={t.settings.account.name}
            htmlFor="account-name"
            error={nameError ?? undefined}
          >
            <input
              id="account-name"
              className="field"
              value={name}
              onChange={event => setName(event.target.value)}
              autoComplete="name"
              maxLength={120}
              aria-invalid={Boolean(nameError)}
            />
          </Field>
          <Field
            label={t.settings.account.email}
            htmlFor="account-email"
            hint={t.settings.account.emailHint}
          >
            <input
              id="account-email"
              className="field bg-surface-2 text-ink-2 dark:bg-surface-3"
              value={user.email}
              readOnly
              dir="ltr"
            />
          </Field>
          <div>
            <SubmitButton pending={updateProfile.isPending}>
              {t.settings.account.saveProfile}
            </SubmitButton>
          </div>
        </form>
      </SectionCard>

      <SectionCard title={t.settings.account.changePassword}>
        <form onSubmit={savePassword} className="flex flex-col gap-4">
          <Field
            label={t.settings.account.currentPassword}
            htmlFor="current-password"
          >
            <input
              id="current-password"
              type="password"
              className="field"
              value={currentPassword}
              onChange={event => setCurrentPassword(event.target.value)}
              autoComplete="current-password"
              dir="ltr"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label={t.settings.account.newPassword}
              htmlFor="new-password"
              hint={t.auth.passwordHint(MIN_PASSWORD_LENGTH)}
            >
              <input
                id="new-password"
                type="password"
                className="field"
                value={newPassword}
                onChange={event => setNewPassword(event.target.value)}
                autoComplete="new-password"
                dir="ltr"
              />
            </Field>
            <Field
              label={t.settings.account.confirmNewPassword}
              htmlFor="confirm-password"
            >
              <input
                id="confirm-password"
                type="password"
                className="field"
                value={confirmPassword}
                onChange={event => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                dir="ltr"
              />
            </Field>
          </div>
          {passwordError && (
            <p role="alert" className="text-sm text-danger">
              {passwordError}
            </p>
          )}
          <div>
            <SubmitButton pending={changePassword.isPending}>
              {t.settings.account.updatePassword}
            </SubmitButton>
          </div>
        </form>
      </SectionCard>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Preferences
// ---------------------------------------------------------------------------

function PreferencesSection() {
  const { t, language, setLanguage, numerals, setNumerals } = useLocale();
  const { theme, setTheme } = useTheme();
  const { invalidate, onError } = useDashboardMutations();
  const update = trpc.finance.updateSettings.useMutation({
    onSuccess: invalidate,
    onError,
  });

  const changeLanguage = (next: Language) => {
    setLanguage(next);
    update.mutate({ language: next });
  };
  const changeTheme = (next: Theme) => {
    setTheme(next);
    update.mutate({ theme: next });
  };

  return (
    <SectionCard>
      <PreferenceRow
        label={t.settings.preferences.language}
        hint={t.settings.preferences.languageHint}
      >
        <Segmented<Language>
          label={t.settings.preferences.language}
          value={language}
          onChange={changeLanguage}
          options={[
            { value: "ar", label: "العربية" },
            { value: "en", label: "English" },
          ]}
        />
      </PreferenceRow>
      <PreferenceRow label={t.settings.preferences.theme}>
        <Segmented<Theme>
          label={t.settings.preferences.theme}
          value={theme}
          onChange={changeTheme}
          options={[
            {
              value: "light",
              label: (
                <>
                  <Sun className="size-4" />
                  {t.settings.preferences.light}
                </>
              ),
            },
            {
              value: "dark",
              label: (
                <>
                  <Moon className="size-4" />
                  {t.settings.preferences.dark}
                </>
              ),
            },
          ]}
        />
      </PreferenceRow>
      <PreferenceRow
        label={t.settings.preferences.numerals}
        hint={t.settings.preferences.numeralsHint}
      >
        <Segmented<Numerals>
          label={t.settings.preferences.numerals}
          value={numerals}
          onChange={setNumerals}
          options={[
            {
              value: "latn",
              label: (
                <span className="tnum">{t.settings.preferences.latn}</span>
              ),
            },
            {
              value: "arab",
              label: (
                <span className="tnum">{t.settings.preferences.arab}</span>
              ),
            },
          ]}
        />
      </PreferenceRow>
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// Tax and numbering
// ---------------------------------------------------------------------------

function TaxSection() {
  const { t, f } = useLocale();
  const { data } = useDashboard();
  const { settings } = data;
  const { invalidate, onError } = useDashboardMutations();

  const toggleTax = trpc.finance.updateSettings.useMutation({
    onSuccess: invalidate,
    onError,
  });
  const saveRate = trpc.finance.updateSettings.useMutation({
    onSuccess: () => {
      invalidate();
      toast.success(t.settings.tax.taxSaved);
    },
    onError,
  });
  const saveMode = trpc.finance.updateSettings.useMutation({
    onSuccess: invalidate,
    onError,
  });
  const saveFormat = trpc.finance.updateSettings.useMutation({
    onSuccess: () => {
      invalidate();
      toast.success(t.settings.tax.saved);
    },
    onError,
  });

  const [rate, setRate] = useState(String(settings.taxRate));
  const [format, setFormat] = useState({
    depositPrefix: settings.depositPrefix,
    depositStart: String(settings.depositStart),
    expensePrefix: settings.expensePrefix,
    expenseStart: String(settings.expenseStart),
  });
  const [formatErrors, setFormatErrors] = useState<
    Partial<Record<keyof typeof format, string>>
  >({});
  const setFormatField =
    (key: keyof typeof format) =>
    (event: React.ChangeEvent<HTMLInputElement>) =>
      setFormat(current => ({ ...current, [key]: event.target.value }));

  const submitRate = (event: FormEvent) => {
    event.preventDefault();
    const parsed = clampTaxRate(
      Number(toAsciiDigits(rate).replace(/[^\d.]/g, "")) || 0
    );
    setRate(String(parsed));
    saveRate.mutate({ taxRate: parsed });
  };

  const submitFormat = (event: FormEvent) => {
    event.preventDefault();
    const errors: typeof formatErrors = {};
    const depositPrefix = format.depositPrefix.trim();
    const expensePrefix = format.expensePrefix.trim();
    const depositStart = Number(format.depositStart);
    const expenseStart = Number(format.expenseStart);
    if (!depositPrefix) errors.depositPrefix = t.settings.tax.prefixRequired;
    if (!expensePrefix) errors.expensePrefix = t.settings.tax.prefixRequired;
    if (!Number.isInteger(depositStart) || depositStart < 1)
      errors.depositStart = t.settings.tax.startInvalid;
    if (!Number.isInteger(expenseStart) || expenseStart < 1)
      errors.expenseStart = t.settings.tax.startInvalid;
    setFormatErrors(errors);
    if (Object.keys(errors).length) return;
    saveFormat.mutate({
      depositPrefix,
      expensePrefix,
      depositStart,
      expenseStart,
    });
  };

  const depositPreview = formatRecordNumber(
    format.depositPrefix.trim() || settings.depositPrefix,
    Number(format.depositStart)
  );
  const expensePreview = formatRecordNumber(
    format.expensePrefix.trim() || settings.expensePrefix,
    Number(format.expenseStart)
  );

  return (
    <div className="flex flex-col gap-5">
      <SectionCard>
        <PreferenceRow
          label={t.settings.tax.enabled}
          hint={t.settings.tax.enabledHint}
        >
          <Switch
            checked={settings.taxEnabled}
            disabled={toggleTax.isPending}
            onCheckedChange={checked =>
              toggleTax.mutate({ taxEnabled: checked })
            }
            aria-label={t.settings.tax.enabled}
          />
        </PreferenceRow>
        <form
          onSubmit={submitRate}
          className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-end"
        >
          <Field
            label={t.settings.tax.rate}
            htmlFor="tax-rate"
            className="sm:w-40"
          >
            <div className="relative" dir="ltr">
              <input
                id="tax-rate"
                inputMode="decimal"
                className="field tnum pr-9"
                value={rate}
                onChange={event => setRate(event.target.value)}
                disabled={!settings.taxEnabled}
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 grid place-items-center text-sm text-ink-3">
                %
              </span>
            </div>
          </Field>
          <Button
            type="submit"
            variant="outline"
            disabled={!settings.taxEnabled || saveRate.isPending}
            className="h-11 gap-2"
          >
            {saveRate.isPending && <Loader2 className="size-4 animate-spin" />}
            {t.common.save}
          </Button>
          {settings.taxEnabled && (
            <p className="text-xs text-ink-3 sm:pb-3">
              {f.percent(settings.taxRate, 2)}
            </p>
          )}
        </form>
      </SectionCard>

      <SectionCard>
        <PreferenceRow
          label={t.settings.tax.numberingDefault}
          hint={t.settings.tax.numberingHint}
        >
          <Segmented<"auto" | "manual">
            label={t.settings.tax.numberingDefault}
            value={settings.numberingMode}
            onChange={mode => saveMode.mutate({ numberingMode: mode })}
            options={[
              { value: "auto", label: t.settings.tax.auto },
              { value: "manual", label: t.settings.tax.manual },
            ]}
          />
        </PreferenceRow>
      </SectionCard>

      <SectionCard
        title={t.settings.tax.formatTitle}
        description={t.settings.tax.formatHint}
      >
        <form onSubmit={submitFormat} className="flex flex-col gap-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label={t.settings.tax.depositPrefix}
              htmlFor="deposit-prefix"
              error={formatErrors.depositPrefix}
            >
              <input
                id="deposit-prefix"
                className="field tnum"
                value={format.depositPrefix}
                onChange={setFormatField("depositPrefix")}
                maxLength={16}
                dir="ltr"
                aria-invalid={Boolean(formatErrors.depositPrefix)}
              />
            </Field>
            <Field
              label={t.settings.tax.depositStart}
              htmlFor="deposit-start"
              error={formatErrors.depositStart}
            >
              <input
                id="deposit-start"
                type="number"
                min={1}
                step={1}
                className="field tnum"
                value={format.depositStart}
                onChange={setFormatField("depositStart")}
                aria-invalid={Boolean(formatErrors.depositStart)}
              />
            </Field>
            <Field
              label={t.settings.tax.expensePrefix}
              htmlFor="expense-prefix"
              error={formatErrors.expensePrefix}
            >
              <input
                id="expense-prefix"
                className="field tnum"
                value={format.expensePrefix}
                onChange={setFormatField("expensePrefix")}
                maxLength={16}
                dir="ltr"
                aria-invalid={Boolean(formatErrors.expensePrefix)}
              />
            </Field>
            <Field
              label={t.settings.tax.expenseStart}
              htmlFor="expense-start"
              error={formatErrors.expenseStart}
            >
              <input
                id="expense-start"
                type="number"
                min={1}
                step={1}
                className="field tnum"
                value={format.expenseStart}
                onChange={setFormatField("expenseStart")}
                aria-invalid={Boolean(formatErrors.expenseStart)}
              />
            </Field>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg bg-surface-2 px-4 py-3 text-sm">
            <span className="text-ink-3">{t.settings.tax.preview}</span>
            <span className="inline-flex items-center gap-2">
              <TypeChip
                type="deposit"
                size="sm"
                className="size-6 rounded-md [&_svg]:size-3.5"
              />
              <code className="tnum font-medium text-ink" dir="ltr">
                {depositPreview}
              </code>
            </span>
            <span className="inline-flex items-center gap-2">
              <TypeChip
                type="expense"
                size="sm"
                className="size-6 rounded-md [&_svg]:size-3.5"
              />
              <code className="tnum font-medium text-ink" dir="ltr">
                {expensePreview}
              </code>
            </span>
          </div>
          <div>
            <SubmitButton pending={saveFormat.isPending}>
              {t.settings.tax.save}
            </SubmitButton>
          </div>
        </form>
      </SectionCard>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

function CategoriesSection() {
  const { t } = useLocale();
  const { data } = useDashboard();
  const usage = useMemo(() => {
    const counts = new Map<number, number>();
    for (const record of [...data.transactions, ...data.archivedTransactions])
      counts.set(record.categoryId, (counts.get(record.categoryId) ?? 0) + 1);
    return counts;
  }, [data.transactions, data.archivedTransactions]);

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <CategoryGroup
        type="deposit"
        title={t.settings.categories.deposit}
        categories={data.categories.filter(
          category => category.type === "deposit"
        )}
        usage={usage}
      />
      <CategoryGroup
        type="expense"
        title={t.settings.categories.expense}
        categories={data.categories.filter(
          category => category.type === "expense"
        )}
        usage={usage}
      />
    </div>
  );
}

function CategoryGroup({
  type,
  title,
  categories,
  usage,
}: {
  type: TransactionType;
  title: string;
  categories: Category[];
  usage: Map<number, number>;
}) {
  const { t } = useLocale();
  const { invalidate, onError } = useDashboardMutations();
  const [name, setName] = useState("");
  const [color, setColor] = useState(
    CATEGORY_COLORS[type === "deposit" ? 0 : 4]
  );
  const create = trpc.finance.createCategory.useMutation({
    onSuccess: () => {
      invalidate();
      setName("");
      toast.success(t.settings.categories.added);
    },
    onError,
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    create.mutate({ name: trimmed, type, color });
  };

  return (
    <SectionCard className="p-4 sm:p-5">
      <div className="mb-3 flex items-center gap-3">
        <TypeChip type={type} size="sm" />
        <h3 className="font-semibold text-ink">{title}</h3>
      </div>
      {categories.length ? (
        <ul className="divide-y divide-border">
          {categories.map(category => (
            <CategoryRow
              key={category.id}
              category={category}
              used={usage.get(category.id) ?? 0}
            />
          ))}
        </ul>
      ) : (
        <p className="py-4 text-sm text-ink-3">{t.settings.categories.empty}</p>
      )}
      <form
        onSubmit={submit}
        className="mt-3 flex items-center gap-2 border-t border-border pt-4"
      >
        <ColorPicker
          value={color}
          onChange={setColor}
          label={t.settings.categories.color}
        />
        <input
          className="field h-10 min-w-0 flex-1"
          value={name}
          onChange={event => setName(event.target.value)}
          placeholder={t.settings.categories.newPlaceholder}
          aria-label={t.settings.categories.newPlaceholder}
          maxLength={120}
        />
        <Button
          type="submit"
          disabled={!name.trim() || create.isPending}
          className="h-10 gap-1.5 bg-primary text-primary-foreground hover:bg-primary-strong"
        >
          {create.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Plus className="size-4" />
          )}
          {t.settings.categories.add}
        </Button>
      </form>
    </SectionCard>
  );
}

function CategoryRow({ category, used }: { category: Category; used: number }) {
  const { t } = useLocale();
  const { invalidate, onError } = useDashboardMutations();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(category.name);
  const update = trpc.finance.updateCategory.useMutation({
    onSuccess: (_, variables) => {
      invalidate();
      setEditing(false);
      if (variables.name !== category.name)
        toast.success(t.settings.categories.renamed);
    },
    onError,
  });
  const remove = trpc.finance.deleteCategory.useMutation({
    onSuccess: () => {
      invalidate();
      toast.success(t.settings.categories.deleted);
    },
    onError,
  });

  const cancel = () => {
    setName(category.name);
    setEditing(false);
  };
  const rename = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    if (trimmed === category.name) {
      setEditing(false);
      return;
    }
    update.mutate({ id: category.id, name: trimmed });
  };

  return (
    <li className="flex items-center gap-3 py-2.5">
      <ColorPicker
        value={category.color}
        onChange={color =>
          update.mutate({ id: category.id, name: category.name, color })
        }
        label={t.settings.categories.color}
      />
      {editing ? (
        <form
          onSubmit={rename}
          className="flex min-w-0 flex-1 items-center gap-1.5"
        >
          <input
            autoFocus
            className="field h-10 min-w-0 flex-1"
            value={name}
            onChange={event => setName(event.target.value)}
            onKeyDown={event => event.key === "Escape" && cancel()}
            maxLength={120}
            aria-label={t.settings.categories.rename}
          />
          <Button
            type="submit"
            size="icon"
            variant="ghost"
            aria-label={t.common.save}
            disabled={update.isPending}
            className="text-primary-strong hover:bg-primary-soft dark:text-primary"
          >
            {update.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Check className="size-4" />
            )}
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label={t.common.cancel}
            onClick={cancel}
            className="text-ink-3 hover:text-ink"
          >
            <X className="size-4" />
          </Button>
        </form>
      ) : (
        <>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-ink" dir="auto">
              {category.name}
            </p>
            <p className="text-xs text-ink-3">
              {used
                ? t.settings.categories.inUse(used)
                : t.settings.categories.unused}
            </p>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label={t.settings.categories.rename}
                onClick={() => setEditing(true)}
                className="text-ink-3 hover:bg-surface-2 hover:text-ink"
              >
                <Pencil className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t.settings.categories.rename}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label={t.common.delete}
                  disabled={used > 0 || remove.isPending}
                  onClick={() => remove.mutate({ id: category.id })}
                  className="text-ink-3 hover:bg-expense-soft hover:text-expense-text"
                >
                  {remove.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Trash2 className="size-4" />
                  )}
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              {used > 0 ? t.settings.categories.cannotDelete : t.common.delete}
            </TooltipContent>
          </Tooltip>
        </>
      )}
    </li>
  );
}

function ColorPicker({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (color: string) => void;
  label: string;
}) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className="grid size-10 shrink-0 place-items-center rounded-lg border border-border transition-colors hover:bg-surface-2 focus-visible:ring-[3px] focus-visible:ring-primary/30 focus-visible:outline-none"
        >
          <span
            className="size-5 rounded-full"
            style={{ backgroundColor: value }}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-auto border-border bg-surface p-2"
      >
        <div className="grid grid-cols-5 gap-1.5">
          {CATEGORY_COLORS.map((color, index) => (
            <button
              key={color}
              type="button"
              aria-label={t.settings.categories.colorNames[index] ?? color}
              aria-pressed={color === value}
              onClick={() => {
                onChange(color);
                setOpen(false);
              }}
              className="grid size-8 place-items-center rounded-full ring-offset-2 ring-offset-surface transition-transform hover:scale-110 aria-pressed:ring-2 aria-pressed:ring-ink"
              style={{ backgroundColor: color }}
            >
              {color === value && <Check className="size-4 text-white" />}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ---------------------------------------------------------------------------
// Reminders
// ---------------------------------------------------------------------------

function RemindersSection() {
  const { t } = useLocale();
  const { data } = useDashboard();
  const { invalidate, onError } = useDashboardMutations();
  const [title, setTitle] = useState("");
  const [when, setWhen] = useState("");
  const [error, setError] = useState<string | null>(null);
  const create = trpc.finance.createReminder.useMutation({
    onSuccess: () => {
      invalidate();
      setTitle("");
      setWhen("");
      toast.success(t.settings.reminders.added);
    },
    onError,
  });

  const now = useMemo(() => toLocalDateTime(new Date()), []);
  const upcoming = data.reminders.filter(
    reminder => reminder.reminderDate >= now
  );
  const past = data.reminders
    .filter(reminder => reminder.reminderDate < now)
    .reverse();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || !when) {
      setError(t.settings.reminders.missing);
      return;
    }
    setError(null);
    create.mutate({ title: trimmed, reminderDate: when });
  };

  return (
    <div className="flex flex-col gap-5">
      <SectionCard description={t.settings.reminders.hint}>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
            <Field
              label={t.settings.reminders.titleLabel}
              htmlFor="reminder-title"
            >
              <input
                id="reminder-title"
                className="field"
                value={title}
                onChange={event => setTitle(event.target.value)}
                placeholder={t.settings.reminders.titlePlaceholder}
                maxLength={200}
              />
            </Field>
            <Field
              label={t.settings.reminders.dateLabel}
              htmlFor="reminder-date"
            >
              <input
                id="reminder-date"
                type="datetime-local"
                className="field tnum sm:w-56"
                value={when}
                onChange={event => setWhen(event.target.value)}
              />
            </Field>
          </div>
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <SubmitButton pending={create.isPending}>
              <Plus className="size-4" />
              {t.settings.reminders.add}
            </SubmitButton>
            <p className="text-xs text-ink-3">
              {t.settings.reminders.noNotifications}
            </p>
          </div>
        </form>
      </SectionCard>

      {!data.reminders.length ? (
        <div className="card">
          <EmptyState icon={Bell} title={t.settings.reminders.empty} compact />
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <ReminderGroup
              title={t.settings.reminders.upcoming}
              reminders={upcoming}
            />
          )}
          {past.length > 0 && (
            <ReminderGroup
              title={t.settings.reminders.past}
              reminders={past}
              muted
            />
          )}
        </>
      )}
    </div>
  );
}

function ReminderGroup({
  title,
  reminders,
  muted = false,
}: {
  title: string;
  reminders: Reminder[];
  muted?: boolean;
}) {
  return (
    <section className="card">
      <h3 className="px-5 pt-4 pb-2 text-sm font-semibold text-ink">{title}</h3>
      <ul className="divide-y divide-border">
        {reminders.map(reminder => (
          <ReminderRow key={reminder.id} reminder={reminder} muted={muted} />
        ))}
      </ul>
    </section>
  );
}

function ReminderRow({
  reminder,
  muted,
}: {
  reminder: Reminder;
  muted: boolean;
}) {
  const { t, f } = useLocale();
  const { invalidate, onError } = useDashboardMutations();
  const update = trpc.finance.updateReminder.useMutation({
    onSuccess: invalidate,
    onError,
  });
  const remove = trpc.finance.deleteReminder.useMutation({
    onSuccess: () => {
      invalidate();
      toast.success(t.settings.reminders.deleted);
    },
    onError,
  });

  return (
    <li className="flex items-center gap-3 px-5 py-3">
      <span
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-lg",
          muted || !reminder.enabled
            ? "bg-surface-2 text-ink-3"
            : "bg-warning-soft text-warning-text"
        )}
      >
        <Bell className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate text-sm font-medium",
            reminder.enabled ? "text-ink" : "text-ink-3 line-through"
          )}
          dir="auto"
        >
          {reminder.title}
        </p>
        <p className="tnum text-xs text-ink-3">
          {f.dateTime(reminder.reminderDate)}
        </p>
      </div>
      <Switch
        checked={reminder.enabled}
        disabled={update.isPending}
        onCheckedChange={enabled => update.mutate({ id: reminder.id, enabled })}
        aria-label={
          reminder.enabled
            ? t.settings.reminders.enabled
            : t.settings.reminders.disabled
        }
      />
      <Button
        type="button"
        size="icon"
        variant="ghost"
        aria-label={t.common.delete}
        disabled={remove.isPending}
        onClick={() => remove.mutate({ id: reminder.id })}
        className="text-ink-3 hover:bg-expense-soft hover:text-expense-text"
      >
        {remove.isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Trash2 className="size-4" />
        )}
      </Button>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Archive and history
// ---------------------------------------------------------------------------

type AuditDetails = {
  recordNumber?: string;
  type?: TransactionType;
  totalAmount?: number;
};

function parseDetails(details: string): AuditDetails {
  try {
    const parsed: unknown = JSON.parse(details);
    return parsed && typeof parsed === "object" ? (parsed as AuditDetails) : {};
  } catch {
    return {};
  }
}

const ACTION_STYLES: Record<string, string> = {
  created: "bg-deposit-soft text-deposit-text",
  updated: "bg-warning-soft text-warning-text",
  archived: "bg-surface-2 text-ink-2",
  restored: "bg-net-soft text-net-text",
};

function ArchiveSection() {
  const { t } = useLocale();
  const { data } = useDashboard();
  const { invalidate, onError } = useDashboardMutations();
  const restore = trpc.finance.restoreTransaction.useMutation({
    onSuccess: (_, variables) => {
      invalidate();
      const record = data.archivedTransactions.find(
        item => item.id === variables.id
      );
      toast.success(t.transactions.restored(record?.recordNumber ?? ""));
    },
    onError,
  });

  return (
    <div className="flex flex-col gap-5">
      <SectionCard
        description={t.settings.archive.hint}
        className="p-0 sm:p-0 [&>header]:px-5 [&>header]:pt-5 [&>header]:mb-0 [&>header]:pb-3"
      >
        {data.archivedTransactions.length ? (
          <ul className="divide-y divide-border border-t border-border">
            {data.archivedTransactions.map(record => (
              <ArchivedRow
                key={record.id}
                record={record}
                restoring={
                  restore.isPending && restore.variables?.id === record.id
                }
                onRestore={() => restore.mutate({ id: record.id })}
              />
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={Archive}
            title={t.settings.archive.empty}
            compact
            className="border-t border-border"
          />
        )}
      </SectionCard>

      <SectionCard
        title={t.settings.archive.history}
        description={t.settings.archive.historyHint}
        className="p-0 sm:p-0 [&>header]:px-5 [&>header]:pt-5 [&>header]:mb-0 [&>header]:pb-3"
      >
        {data.auditLogs.length ? (
          <ul className="divide-y divide-border border-t border-border">
            {data.auditLogs.map(log => (
              <AuditRow key={log.id} log={log} />
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={History}
            title={t.settings.archive.historyEmpty}
            compact
            className="border-t border-border"
          />
        )}
      </SectionCard>
    </div>
  );
}

function ArchivedRow({
  record,
  restoring,
  onRestore,
}: {
  record: TransactionRecord;
  restoring: boolean;
  onRestore: () => void;
}) {
  const { t, f } = useLocale();
  return (
    <li className="flex items-center gap-3 px-5 py-3">
      <TypeChip type={record.type} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink">
          <span className="tnum" dir="ltr">
            {record.recordNumber}
          </span>
          {(record.customerName || record.categoryName) && (
            <span className="text-ink-2" dir="auto">
              {" · "}
              {record.customerName || record.categoryName}
            </span>
          )}
        </p>
        <p className="tnum text-xs text-ink-3">
          {f.date(record.transactionDate)}
        </p>
      </div>
      <span
        className={cn(
          "tnum hidden text-sm font-medium sm:block",
          record.type === "deposit" ? "text-deposit-text" : "text-expense-text"
        )}
      >
        {f.money(record.totalAmount)}
      </span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={restoring}
        onClick={onRestore}
        className="h-9 gap-1.5"
      >
        {restoring ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <ArchiveRestore className="size-4" />
        )}
        {t.settings.archive.restore}
      </Button>
    </li>
  );
}

function AuditRow({ log }: { log: AuditLog }) {
  const { t, f } = useLocale();
  const details = parseDetails(log.details);
  const actions = t.settings.archive.actions as Record<string, string>;
  return (
    <li className="flex items-center gap-3 px-5 py-3">
      <span
        className={cn(
          "shrink-0 rounded-md px-2 py-0.5 text-xs font-medium",
          ACTION_STYLES[log.action] ?? "bg-surface-2 text-ink-2"
        )}
      >
        {actions[log.action] ?? log.action}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-ink">
          {details.recordNumber ? (
            <span className="tnum font-medium" dir="ltr">
              {details.recordNumber}
            </span>
          ) : (
            <span className="text-ink-3">#{log.transactionId}</span>
          )}
          {details.type && (
            <span className="text-ink-2">{` · ${details.type === "deposit" ? t.transactions.deposit : t.transactions.expense}`}</span>
          )}
          {typeof details.totalAmount === "number" && (
            <span className="tnum text-ink-2">{` · ${f.money(details.totalAmount)}`}</span>
          )}
        </p>
      </div>
      <time
        className="tnum shrink-0 text-xs text-ink-3"
        dateTime={new Date(log.createdAt).toISOString()}
      >
        {f.dateTime(new Date(log.createdAt))}
      </time>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Security
// ---------------------------------------------------------------------------

function SecuritySection() {
  const { t } = useLocale();
  const { data } = useDashboard();
  const { invalidate, onError } = useDashboardMutations();
  const enabled = data.settings.pinEnabled;
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);

  const save = trpc.finance.updateSettings.useMutation({
    onSuccess: (_, variables) => {
      // The person who just set the PIN shouldn't be locked out of the session they're in.
      prefs.setPinUnlocked(variables.pinEnabled !== false);
      invalidate();
      setPin("");
      setConfirm("");
      toast.success(
        variables.pinEnabled === false
          ? t.settings.security.disabled
          : enabled
            ? t.settings.security.changed
            : t.settings.security.saved
      );
    },
    onError,
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!PIN_PATTERN.test(pin)) {
      setError(t.settings.security.pinFormat);
      return;
    }
    if (pin !== confirm) {
      setError(t.settings.security.pinMismatch);
      return;
    }
    setError(null);
    save.mutate({ pinEnabled: true, pin });
  };

  const digitsOnly = (value: string) =>
    toAsciiDigits(value).replace(/\D/g, "").slice(0, 8);

  return (
    <SectionCard
      title={t.settings.security.pinTitle}
      description={t.settings.security.pinHint}
    >
      <div className="mb-5 flex items-center gap-2">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
            enabled
              ? "bg-deposit-soft text-deposit-text"
              : "bg-surface-2 text-ink-2"
          )}
        >
          <LockKeyhole className="size-3.5" />
          {enabled
            ? t.settings.security.pinEnabled
            : t.settings.security.pinDisabled}
        </span>
      </div>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={t.settings.security.newPin}
            htmlFor="pin"
            hint={t.settings.security.pinFormat}
          >
            <input
              id="pin"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              className="field tnum tracking-[0.3em]"
              value={pin}
              onChange={event => setPin(digitsOnly(event.target.value))}
              dir="ltr"
            />
          </Field>
          <Field label={t.settings.security.confirmPin} htmlFor="pin-confirm">
            <input
              id="pin-confirm"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              className="field tnum tracking-[0.3em]"
              value={confirm}
              onChange={event => setConfirm(digitsOnly(event.target.value))}
              dir="ltr"
            />
          </Field>
        </div>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <SubmitButton
            pending={save.isPending && save.variables?.pinEnabled !== false}
          >
            {enabled ? t.settings.security.change : t.settings.security.enable}
          </SubmitButton>
          {enabled && (
            <Button
              type="button"
              variant="outline"
              disabled={save.isPending}
              onClick={() => save.mutate({ pinEnabled: false })}
              className="h-11 gap-2 text-expense-text hover:bg-expense-soft hover:text-expense-text"
            >
              {t.settings.security.disable}
            </Button>
          )}
        </div>
      </form>
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// About
// ---------------------------------------------------------------------------

function AboutSection() {
  const { t } = useLocale();
  const { logout, loggingOut } = useAuth();

  const signOut = async () => {
    try {
      await logout();
      toast.success(t.auth.signedOut);
    } catch {
      // The local session is cleared regardless.
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <SectionCard>
        <div className="flex items-start gap-4">
          <BrandMark size="lg" />
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-ink">{t.app.name}</h3>
            <p className="text-sm text-ink-3">{t.app.tagline}</p>
            <p className="mt-3 text-sm leading-6 text-ink-2">
              {t.settings.about.body}
            </p>
          </div>
        </div>
        <dl className="mt-5 flex items-center justify-between border-t border-border pt-4 text-sm">
          <dt className="text-ink-2">{t.settings.about.version}</dt>
          <dd className="tnum font-medium text-ink" dir="ltr">
            {__APP_VERSION__}
          </dd>
        </dl>
      </SectionCard>

      <SectionCard>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-ink">
              {t.settings.about.signOut}
            </p>
            <p className="mt-0.5 text-xs text-ink-3">
              {t.settings.about.signOutHint}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={loggingOut}
            onClick={signOut}
            className="h-11 gap-2 text-expense-text hover:bg-expense-soft hover:text-expense-text"
          >
            {loggingOut ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <LogOut className="size-4 rtl:-scale-x-100" />
            )}
            {t.settings.about.signOut}
          </Button>
        </div>
      </SectionCard>
    </div>
  );
}
