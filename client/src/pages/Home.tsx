import { useAuth } from "@/_core/hooks/useAuth";
import { TransactionDialog } from "@/components/TransactionDialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/contexts/ThemeContext";
import { exportTransactionsToExcel } from "@/lib/export-excel";
import { trpc } from "@/lib/trpc";
import { startLogin } from "@/const";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  BellRing,
  Camera,
  ChartNoAxesCombined,
  CheckCircle2,
  ChevronLeft,
  CircleHelp,
  Download,
  FileText,
  LayoutDashboard,
  Loader2,
  LockKeyhole,
  LogOut,
  Menu,
  Moon,
  MoreHorizontal,
  Pencil,
  Plus,
  ReceiptText,
  Settings2,
  ShieldCheck,
  Sparkles,
  Sun,
  Trash2,
  TrendingDown,
  TrendingUp,
  WalletCards,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type TransactionType = "deposit" | "expense";
type Section = "overview" | "deposit" | "expense" | "analytics" | "settings";

type DashboardData = {
  settings: { language: "ar" | "en"; theme: "light" | "dark"; taxEnabled: boolean; taxRate: number; numberingMode: "auto" | "manual"; depositPrefix: string; expensePrefix: string; depositStart: number; expenseStart: number; pinEnabled: boolean };
  categories: Array<{ id: number; name: string; type: TransactionType; color: string }>;
  transactions: Array<{ id: number; recordNumber: string; type: TransactionType; transactionDate: string; invoiceNumber: string; categoryId: number; categoryName: string; customerName: string; taxNumber: string; amountBeforeTax: number; taxRate: number; taxAmount: number; totalAmount: number; attachmentName: string | null; attachmentMime: string | null; attachmentUrl: string | null }>;
  archivedTransactions: DashboardData["transactions"];
  auditLogs: Array<{ id: number; transactionId: number; action: "created" | "updated" | "archived" | "restored"; details: string; createdAt: string | Date }>;
  reminders: Array<{ id: number; title: string; reminderDate: string; enabled: boolean }>;
  summary: { deposits: number; expenses: number; balance: number };
};

const text = {
  ar: {
    overview: "نظرة عامة", deposit: "الإيداع", expense: "الصرف", analytics: "الإحصاء", settings: "الإعدادات",
    welcome: "صباح مالي مرتب", subtitle: "تابع حركة أموالك في مكان واحد، وبخطوات واضحة.", add: "إضافة عملية", export: "تصدير Excel",
    deposits: "مجموع الإيداع", expenses: "مجموع الصرف", balance: "الفارق بين المجاميع", latest: "آخر العمليات", all: "كل العمليات",
    noRecords: "لا توجد عمليات حتى الآن", noRecordsDesc: "ابدأ بإضافة إيداع أو عملية صرف لتظهر ملخصاتك هنا.", category: "الفئة", customer: "العميل", total: "الإجمالي", actions: "إجراءات",
  },
  en: {
    overview: "Overview", deposit: "Deposits", expense: "Expenses", analytics: "Analytics", settings: "Settings",
    welcome: "Your financial day, in order", subtitle: "Follow your cash flow in one clear place.", add: "Add transaction", export: "Export Excel",
    deposits: "Total deposits", expenses: "Total expenses", balance: "Net balance", latest: "Recent transactions", all: "All transactions",
    noRecords: "No transactions yet", noRecordsDesc: "Add a deposit or expense to see your financial summary here.", category: "Category", customer: "Customer", total: "Total", actions: "Actions",
  },
};

const money = (value: number, language: "ar" | "en") => new Intl.NumberFormat(language === "ar" ? "ar-SA" : "en-US", { style: "currency", currency: "SAR", maximumFractionDigits: 2 }).format(value);
const compactMoney = (value: number, language: "ar" | "en") => new Intl.NumberFormat(language === "ar" ? "ar-SA" : "en-US", { maximumFractionDigits: 0 }).format(value);
const dateLabel = (value: string, language: "ar" | "en") => new Intl.DateTimeFormat(language === "ar" ? "ar-SA" : "en-US", { year: "numeric", month: "short", day: "numeric" }).format(new Date(`${value}T12:00:00`));

function LoginScreen() {
  const [email, setEmail] = useState("");
  const [forgotOpen, setForgotOpen] = useState(false);
  const beginLogin = () => {
    try {
      startLogin();
    } catch {
      toast.error("تعذر فتح بوابة الدخول الآمنة الآن.");
    }
  };

  return (
    <main dir="rtl" className="login-shell min-h-screen px-4 py-6 sm:px-8 lg:px-12">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl overflow-hidden rounded-[2rem] border border-white/70 bg-white/80 shadow-2xl shadow-emerald-950/10 backdrop-blur-xl lg:grid-cols-[1.1fr_0.9fr] dark:border-slate-700 dark:bg-slate-900/85">
        <section className="relative hidden overflow-hidden bg-[#0D3B37] p-12 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="absolute inset-0 opacity-70" style={{ backgroundImage: "radial-gradient(circle at 14% 20%, rgba(59, 203, 162, .5) 0, transparent 24%), radial-gradient(circle at 80% 80%, rgba(250, 183, 82, .25) 0, transparent 27%)" }} />
          <div className="relative flex items-center gap-3"><BrandMark inverse /><span className="text-lg font-bold">التحكم في المصروفات</span></div>
          <div className="relative max-w-md">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs text-emerald-100"><Sparkles className="size-3.5" />وضوح يومي لأموالك</span>
            <h1 className="mt-6 text-5xl font-black leading-tight">كل ريال في <span className="text-emerald-300">مكانه الصحيح.</span></h1>
            <p className="mt-5 max-w-sm text-base leading-7 text-emerald-50/80">سجّل الإيرادات والمصروفات، راقب الفرق، وصدّر سجلك بثقة.</p>
          </div>
          <div className="relative flex gap-3 text-sm text-emerald-50/75"><ShieldCheck className="mt-0.5 size-5 text-emerald-300" /><p>دخول آمن، إعدادات خاصة، وملخصات مالية في واجهة واحدة.</p></div>
        </section>

        <section className="flex flex-col justify-center p-7 sm:p-12">
          <div className="mb-10 flex items-center gap-3 lg:hidden"><BrandMark /><span className="font-bold text-slate-900 dark:text-white">التحكم في المصروفات</span></div>
          <div className="max-w-sm">
            <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">بوابتك المالية</span>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950 dark:text-white">تسجيل الدخول</h2>
            <p className="mt-3 leading-7 text-slate-500 dark:text-slate-400">أدخل بريدك أو تابع عبر Gmail للوصول إلى لوحة مصروفاتك.</p>
            <div className="mt-8 space-y-4">
              <Button onClick={beginLogin} variant="outline" className="h-12 w-full gap-3 border-slate-200 bg-white text-slate-800 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                <span className="grid size-5 place-items-center rounded-full bg-gradient-to-br from-blue-500 via-red-500 to-amber-400 text-[10px] font-black text-white">G</span>المتابعة مع Gmail
              </Button>
              <div className="relative py-1"><div className="border-t border-slate-200 dark:border-slate-700" /><span className="absolute left-1/2 top-1 -translate-x-1/2 -translate-y-1/2 bg-white px-3 text-xs text-slate-400 dark:bg-slate-900">أو</span></div>
              <div className="space-y-2"><Label htmlFor="login-email">البريد الإلكتروني</Label><Input id="login-email" type="email" dir="ltr" value={email} onChange={event => setEmail(event.target.value)} placeholder="name@example.com" className="h-12" /></div>
              <Button onClick={beginLogin} className="h-12 w-full bg-[#0F9D82] text-white hover:bg-[#0b806a]">المتابعة بالبريد الإلكتروني</Button>
              <button onClick={() => setForgotOpen(true)} className="w-full text-sm font-semibold text-emerald-700 hover:text-emerald-800 dark:text-emerald-400">نسيت كلمة السر؟</button>
            </div>
            <p className="mt-8 text-center text-xs leading-5 text-slate-400">باستمرارك، أنت توافق على استخدام بوابة دخول آمنة لحماية سجلاتك.</p>
          </div>
        </section>
      </div>
      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}><DialogContent dir="rtl" className="sm:max-w-md"><DialogHeader className="text-right"><DialogTitle>استعادة الوصول</DialogTitle><DialogDescription className="leading-6">يتم التحكم بكلمات المرور واستعادتها عبر بوابة الدخول الآمنة. اضغط «المتابعة بالبريد الإلكتروني» ثم استخدم خيار الاستعادة في البوابة عند ظهوره.</DialogDescription></DialogHeader><Button onClick={beginLogin} className="mt-3 bg-[#0F9D82] hover:bg-[#0b806a]">فتح بوابة الاستعادة</Button></DialogContent></Dialog>
    </main>
  );
}

function PinGate({ language, onUnlocked }: { language: "ar" | "en"; onUnlocked: () => void }) {
  const [pin, setPin] = useState("");
  const isArabic = language === "ar";
  const verifyPin = trpc.finance.verifyPin.useMutation({
    onSuccess: () => {
      setPin("");
      onUnlocked();
    },
    onError: () => {
      setPin("");
      toast.error(isArabic ? "الرقم السري غير صحيح" : "Incorrect PIN");
    },
  });
  const submit = () => {
    if (!/^\d{4,8}$/.test(pin)) {
      toast.error(isArabic ? "أدخل رقماً من 4 إلى 8 أرقام" : "Enter 4 to 8 digits");
      return;
    }
    verifyPin.mutate({ pin });
  };

  return <main dir={isArabic ? "rtl" : "ltr"} className="login-shell grid min-h-screen place-items-center p-5"><section className="w-full max-w-md rounded-[2rem] border border-white/80 bg-white/90 p-8 text-center shadow-2xl shadow-emerald-950/10 backdrop-blur dark:border-slate-700 dark:bg-slate-900/90"><BrandMark /><span className="mx-auto mt-6 grid size-12 place-items-center rounded-2xl bg-emerald-50 text-[#0F9D82] dark:bg-emerald-950"><LockKeyhole className="size-6" /></span><h1 className="mt-5 text-2xl font-black text-slate-950 dark:text-white">{isArabic ? "التطبيق مقفل" : "App is locked"}</h1><p className="mt-2 text-sm leading-6 text-slate-500">{isArabic ? "أدخل الرقم السري للوصول إلى سجلك المالي." : "Enter your PIN to access your financial records."}</p><div className="mx-auto mt-6 max-w-xs"><Label htmlFor="app-pin" className="sr-only">PIN</Label><Input id="app-pin" value={pin} onChange={event => setPin(event.target.value.replace(/\D/g, "").slice(0, 8))} onKeyDown={event => { if (event.key === "Enter") submit(); }} inputMode="numeric" type="password" autoFocus placeholder="••••" className="h-12 text-center text-xl tracking-[0.55em]" dir="ltr" /></div><Button onClick={submit} disabled={verifyPin.isPending} className="mt-4 h-11 w-full bg-[#0F9D82] hover:bg-[#0b806a]">{verifyPin.isPending ? <Loader2 className="size-4 animate-spin" /> : null}{isArabic ? "فتح التطبيق" : "Unlock app"}</Button></section></main>;
}

function BrandMark({ inverse = false }: { inverse?: boolean }) {
  return <span className={`grid size-10 place-items-center rounded-2xl shadow-lg ${inverse ? "bg-white text-[#0F9D82] shadow-black/10" : "bg-[#0F9D82] text-white shadow-emerald-950/20"}`}><span className="relative text-lg font-black">م<span className="absolute -bottom-1 -left-1 text-[9px] text-amber-300">↗</span><span className="absolute -top-1 -right-1 text-[9px] text-rose-300">↘</span></span></span>;
}

function SummaryCard({ title, value, hint, icon: Icon, accent, language }: { title: string; value: number; hint: string; icon: typeof TrendingUp; accent: "emerald" | "rose" | "navy"; language: "ar" | "en" }) {
  const styles = { emerald: "from-emerald-500/15 to-emerald-50 text-emerald-700 ring-emerald-100 dark:from-emerald-500/20 dark:to-emerald-900/10 dark:text-emerald-300 dark:ring-emerald-900", rose: "from-rose-500/15 to-rose-50 text-rose-700 ring-rose-100 dark:from-rose-500/20 dark:to-rose-900/10 dark:text-rose-300 dark:ring-rose-900", navy: "from-sky-500/15 to-sky-50 text-sky-700 ring-sky-100 dark:from-sky-500/20 dark:to-sky-900/10 dark:text-sky-300 dark:ring-sky-900" }[accent];
  return <article className={`rounded-3xl bg-gradient-to-br p-5 ring-1 ${styles}`}><div className="flex items-start justify-between"><div><p className="text-sm font-semibold opacity-75">{title}</p><p className="mt-3 text-2xl font-black tracking-tight tabular-nums">{money(value, language)}</p></div><span className="grid size-10 place-items-center rounded-2xl bg-white/70 shadow-sm dark:bg-slate-900/30"><Icon className="size-5" /></span></div><p className="mt-4 text-xs font-medium opacity-70">{hint}</p></article>;
}

function TransactionTable({ records, language, onDelete, onEdit }: { records: DashboardData["transactions"]; language: "ar" | "en"; onDelete: (id: number) => void; onEdit: (record: DashboardData["transactions"][number]) => void }) {
  const isArabic = language === "ar";
  if (!records.length) return <div className="flex min-h-72 flex-col items-center justify-center p-8 text-center"><span className="grid size-14 place-items-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800"><ReceiptText className="size-7" /></span><h3 className="mt-4 font-bold text-slate-800 dark:text-slate-100">{isArabic ? "لا توجد عمليات حتى الآن" : "No transactions yet"}</h3><p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">{isArabic ? "ابدأ بإضافة إيداع أو عملية صرف لتظهر ملخصاتك هنا." : "Add a deposit or expense to see your financial summary here."}</p></div>;
  return <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-right"><thead className="border-b border-slate-100 text-xs text-slate-400 dark:border-slate-800"><tr><th className="px-5 py-4 font-semibold">{isArabic ? "العملية" : "Transaction"}</th><th className="px-4 py-4 font-semibold">{isArabic ? "الفئة" : "Category"}</th><th className="px-4 py-4 font-semibold">{isArabic ? "العميل / المودع" : "Client / Depositor"}</th><th className="px-4 py-4 font-semibold">{isArabic ? "التاريخ" : "Date"}</th><th className="px-4 py-4 font-semibold">{isArabic ? "الإجمالي" : "Total"}</th><th className="px-4 py-4 font-semibold">{isArabic ? "إجراءات" : "Actions"}</th></tr></thead><tbody>{records.map(record => <tr key={record.id} className="border-b border-slate-100/80 transition hover:bg-slate-50/80 dark:border-slate-800/70 dark:hover:bg-slate-800/50"><td className="px-5 py-4"><div className="flex items-center gap-3"><span className={`grid size-9 place-items-center rounded-xl ${record.type === "deposit" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"}`}>{record.type === "deposit" ? <ArrowDownToLine className="size-4" /> : <ArrowUpFromLine className="size-4" />}</span><div><p className="font-bold text-slate-800 dark:text-slate-100">{record.recordNumber}</p>{record.invoiceNumber && <p className="mt-0.5 text-[11px] text-slate-400">{isArabic ? "فاتورة" : "Invoice"}: {record.invoiceNumber}</p>}{record.attachmentUrl && record.attachmentMime?.startsWith("image/") ? <a href={record.attachmentUrl} target="_blank" rel="noreferrer" className="mt-1 block overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700" title={isArabic ? "معاينة الصورة" : "Preview image"}><img src={record.attachmentUrl} alt={record.attachmentName || "Attachment"} className="h-10 w-16 object-cover" /></a> : record.attachmentUrl ? <a href={record.attachmentUrl} target="_blank" rel="noreferrer" className="mt-0.5 flex items-center gap-1 text-[11px] text-emerald-700 hover:underline dark:text-emerald-300"><FileText className="size-3" />{record.attachmentName || (isArabic ? "فتح المرفق" : "Open attachment")}</a> : record.attachmentName && <p className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-400"><FileText className="size-3" />{record.attachmentName}</p>}</div></div></td><td className="px-4 py-4"><span className="inline-flex items-center gap-2 text-sm"><i className="size-2 rounded-full bg-[#0F9D82]" />{record.categoryName}</span></td><td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">{record.customerName}</td><td className="px-4 py-4 text-sm text-slate-500" dir="ltr">{dateLabel(record.transactionDate, language)}</td><td className={`px-4 py-4 font-black tabular-nums ${record.type === "deposit" ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"}`}>{record.type === "deposit" ? "+" : "−"}{money(record.totalAmount, language)}</td><td className="px-4 py-4"><div className="flex items-center gap-1"><Button variant="ghost" size="icon" className="size-8 text-slate-400 hover:text-emerald-600" onClick={() => onEdit(record)} aria-label={isArabic ? "تعديل" : "Edit"}><Pencil className="size-4" /></Button><Button variant="ghost" size="icon" className="size-8 text-slate-400 hover:text-rose-600" onClick={() => onDelete(record.id)} aria-label={isArabic ? "حذف" : "Delete"}><Trash2 className="size-4" /></Button></div></td></tr>)}</tbody></table></div>;
}

function Analytics({ data, language }: { data: DashboardData; language: "ar" | "en" }) {
  const total = data.summary.deposits + data.summary.expenses;
  const ratio = total > 0 ? (data.summary.deposits / total) * 100 : 0;
  const categoryTotals = data.transactions.reduce<Record<string, number>>((acc, record) => { acc[record.categoryName] = (acc[record.categoryName] || 0) + record.totalAmount; return acc; }, {});
  const topCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]).slice(0, 4);
  const isArabic = language === "ar";
  return <div className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]"><section className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center justify-between"><div><p className="text-sm font-bold text-slate-900 dark:text-white">{isArabic ? "تدفقك المالي" : "Cash flow"}</p><p className="mt-1 text-sm text-slate-500">{isArabic ? "مقارنة الإيداع والصرف في السجل الحالي" : "Deposits versus expenses in your current records"}</p></div><ChartNoAxesCombined className="size-5 text-emerald-600" /></div><div className="mt-9 flex items-end gap-7 px-2"><div className="flex flex-1 flex-col gap-3"><div className="relative h-44 overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-800"><div className="absolute bottom-0 w-full rounded-2xl bg-gradient-to-t from-emerald-600 to-emerald-300 transition-all" style={{ height: `${total ? Math.max((data.summary.deposits / total) * 100, 5) : 0}%` }} /></div><div className="flex justify-between text-sm"><span className="font-semibold">{isArabic ? "الإيداع" : "Deposits"}</span><span className="font-bold text-emerald-700 dark:text-emerald-400">{compactMoney(data.summary.deposits, language)}</span></div></div><div className="flex flex-1 flex-col gap-3"><div className="relative h-44 overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-800"><div className="absolute bottom-0 w-full rounded-2xl bg-gradient-to-t from-rose-600 to-rose-300 transition-all" style={{ height: `${total ? Math.max((data.summary.expenses / total) * 100, 5) : 0}%` }} /></div><div className="flex justify-between text-sm"><span className="font-semibold">{isArabic ? "الصرف" : "Expenses"}</span><span className="font-bold text-rose-700 dark:text-rose-400">{compactMoney(data.summary.expenses, language)}</span></div></div></div><div className="mt-7 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-100"><span className="font-black">{ratio.toFixed(0)}%</span> {isArabic ? "من حركة الأموال المسجلة هي إيداعات." : "of recorded cash flow is deposits."}</div></section><section className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"><p className="font-bold text-slate-900 dark:text-white">{isArabic ? "الفئات الأعلى" : "Top categories"}</p><div className="mt-5 space-y-5">{topCategories.length ? topCategories.map(([name, value], index) => <div key={name}><div className="mb-2 flex justify-between text-sm"><span className="font-medium text-slate-700 dark:text-slate-200">{name}</span><span className="font-bold tabular-nums text-slate-900 dark:text-white">{money(value, language)}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-gradient-to-l from-[#0F9D82] to-[#61D4B8]" style={{ width: `${Math.max(12, (value / topCategories[0][1]) * 100)}%`, opacity: 1 - index * .16 }} /></div></div>) : <p className="text-sm text-slate-500">{isArabic ? "ستظهر قراءة الفئات هنا بعد تسجيل العمليات." : "Your category reading will appear after adding transactions."}</p>}</div></section></div>;
}

function SettingsPanel({ data, user, onLogout }: { data: DashboardData; user: { name?: string | null; email?: string | null }; onLogout: () => void }) {
  const utils = trpc.useUtils();
  const { theme, toggleTheme } = useTheme();
  const [pin, setPin] = useState("");
  const [categoryName, setCategoryName] = useState<Record<TransactionType, string>>({ deposit: "", expense: "" });
  const [reminderTitle, setReminderTitle] = useState("");
  const [reminderDate, setReminderDate] = useState("");
  const isArabic = data.settings.language === "ar";
  const invalidate = () => utils.finance.dashboard.invalidate();
  const updateSettings = trpc.finance.updateSettings.useMutation({ onSuccess: invalidate, onError: error => toast.error(error.message) });
  const addCategory = trpc.finance.createCategory.useMutation({ onSuccess: () => { invalidate(); toast.success(isArabic ? "تمت إضافة الفئة" : "Category added"); }, onError: error => toast.error(error.message) });
  const removeCategory = trpc.finance.deleteCategory.useMutation({ onSuccess: invalidate, onError: error => toast.error(error.message) });
  const addReminder = trpc.finance.createReminder.useMutation({ onSuccess: () => { invalidate(); setReminderTitle(""); setReminderDate(""); toast.success(isArabic ? "تمت إضافة التذكير" : "Reminder added"); }, onError: error => toast.error(error.message) });
  const toggleReminder = trpc.finance.toggleReminder.useMutation({ onSuccess: invalidate });
  const removeReminder = trpc.finance.deleteReminder.useMutation({ onSuccess: invalidate });
  const restoreTransaction = trpc.finance.restoreTransaction.useMutation({ onSuccess: invalidate, onError: error => toast.error(error.message) });
  const changeTheme = (next: "light" | "dark") => { if (theme !== next) toggleTheme?.(); updateSettings.mutate({ theme: next }); };

  const addCategoryFor = (type: TransactionType) => { const value = categoryName[type].trim(); if (!value) return; addCategory.mutate({ type, name: value }); setCategoryName(current => ({ ...current, [type]: "" })); };
  const saveReminder = () => { if (!reminderTitle.trim() || !reminderDate) { toast.error(isArabic ? "اكتب عنوان التذكير وموعده" : "Enter a reminder title and date"); return; } addReminder.mutate({ title: reminderTitle.trim(), reminderDate }); };

  return <div className="grid gap-5 xl:grid-cols-[1.05fr_.95fr]">
    <section className="space-y-5">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"><ShieldCheck className="size-5" /></span><div><h3 className="font-black text-slate-900 dark:text-white">{isArabic ? "معلومات الحساب" : "Account information"}</h3><p className="text-sm text-slate-500">{user.email || (isArabic ? "حساب محمي عبر بوابة الدخول" : "Account secured by the sign-in portal")}</p></div></div><div className="mt-5 grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm dark:bg-slate-800/60"><div className="flex justify-between"><span className="text-slate-500">{isArabic ? "الاسم" : "Name"}</span><span className="font-bold">{user.name || "—"}</span></div><div className="flex justify-between"><span className="text-slate-500">{isArabic ? "الحالة" : "Status"}</span><span className="flex items-center gap-1 font-bold text-emerald-700 dark:text-emerald-400"><CheckCircle2 className="size-3.5" />{isArabic ? "محمي" : "Protected"}</span></div></div></div>
      <div className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"><h3 className="font-black text-slate-900 dark:text-white">{isArabic ? "التخصيص" : "Personalization"}</h3><div className="mt-5 space-y-5"><div><p className="text-sm font-bold">{isArabic ? "اللغة" : "Language"}</p><div className="mt-2 grid grid-cols-2 gap-2"><Button variant={data.settings.language === "ar" ? "default" : "outline"} className={data.settings.language === "ar" ? "bg-[#0F9D82] hover:bg-[#0b806a]" : ""} onClick={() => updateSettings.mutate({ language: "ar" })}>العربية</Button><Button variant={data.settings.language === "en" ? "default" : "outline"} className={data.settings.language === "en" ? "bg-[#0F9D82] hover:bg-[#0b806a]" : ""} onClick={() => updateSettings.mutate({ language: "en" })}>English</Button></div></div><div><p className="text-sm font-bold">{isArabic ? "السمة" : "Theme"}</p><div className="mt-2 grid grid-cols-2 gap-2"><Button variant={data.settings.theme === "light" ? "default" : "outline"} className={data.settings.theme === "light" ? "bg-[#0F9D82] hover:bg-[#0b806a]" : ""} onClick={() => changeTheme("light")}><Sun className="size-4" />{isArabic ? "فاتح" : "Light"}</Button><Button variant={data.settings.theme === "dark" ? "default" : "outline"} className={data.settings.theme === "dark" ? "bg-[#0F9D82] hover:bg-[#0b806a]" : ""} onClick={() => changeTheme("dark")}><Moon className="size-4" />{isArabic ? "داكن" : "Dark"}</Button></div></div></div></div>
      <div className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center justify-between"><div><h3 className="font-black text-slate-900 dark:text-white">{isArabic ? "رقم سري للتطبيق" : "App PIN"}</h3><p className="mt-1 text-sm text-slate-500">{isArabic ? "طبقة حماية إضافية عند فتح التطبيق." : "An additional protection layer when opening the app."}</p></div><Switch checked={data.settings.pinEnabled} onCheckedChange={checked => { if (checked && !pin) { toast.error(isArabic ? "أدخل رقماً سرياً من 4 إلى 8 أرقام أولاً" : "Enter a 4–8 digit PIN first"); return; } updateSettings.mutate({ pinEnabled: checked, ...(checked ? { pin } : {}) }); }} /></div>{!data.settings.pinEnabled && <div className="mt-4 flex gap-2"><Input value={pin} onChange={event => setPin(event.target.value.replace(/\D/g, "").slice(0, 8))} inputMode="numeric" type="password" placeholder={isArabic ? "رقم من 4 إلى 8 أرقام" : "4 to 8 digits"} dir="ltr" /><Button variant="outline" onClick={() => { if (!/^\d{4,8}$/.test(pin)) { toast.error(isArabic ? "أدخل 4 إلى 8 أرقام" : "Enter 4 to 8 digits"); return; } updateSettings.mutate({ pinEnabled: true, pin }); }}>تفعيل</Button></div>}</div>
    </section>
    <section className="space-y-5">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center justify-between"><div><h3 className="font-black text-slate-900 dark:text-white">{isArabic ? "الضريبة والترقيم" : "Tax & numbering"}</h3><p className="mt-1 text-sm text-slate-500">{isArabic ? "إعدادات افتراضية للعمليات الجديدة." : "Defaults for your new transactions."}</p></div><Switch checked={data.settings.taxEnabled} onCheckedChange={taxEnabled => updateSettings.mutate({ taxEnabled })} /></div><div className="mt-5 grid grid-cols-[1fr_auto] items-end gap-3"><div className="space-y-2"><Label>{isArabic ? "نسبة الضريبة" : "Tax rate"}</Label><Input type="number" min="0" max="100" step="0.1" defaultValue={data.settings.taxRate} onBlur={event => updateSettings.mutate({ taxRate: Number(event.target.value) || 0 })} disabled={!data.settings.taxEnabled} dir="ltr" /></div><span className="mb-2 text-sm text-slate-500">%</span></div><div className="mt-4 rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/60"><div className="flex items-center justify-between gap-3"><div><span className="text-sm font-semibold">{isArabic ? "القيمة الافتراضية للترقيم" : "Default numbering value"}</span><p className="mt-1 text-xs text-slate-500">{isArabic ? "يُستخدم تلقائياً عند إضافة عملية جديدة." : "Used automatically for every new transaction."}</p></div><div className="flex gap-1"><Button size="sm" variant={data.settings.numberingMode === "auto" ? "default" : "ghost"} className={data.settings.numberingMode === "auto" ? "bg-[#0F9D82] hover:bg-[#0b806a]" : ""} onClick={() => updateSettings.mutate({ numberingMode: "auto" })}>{isArabic ? "آلي" : "Auto"}</Button><Button size="sm" variant={data.settings.numberingMode === "manual" ? "default" : "ghost"} className={data.settings.numberingMode === "manual" ? "bg-[#0F9D82] hover:bg-[#0b806a]" : ""} onClick={() => updateSettings.mutate({ numberingMode: "manual" })}>{isArabic ? "يدوي" : "Manual"}</Button></div></div></div></div>
      <div className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"><h3 className="font-black text-slate-900 dark:text-white">{isArabic ? "صيغة الترقيم الآلي" : "Automatic numbering format"}</h3><p className="mt-1 text-sm text-slate-500">{isArabic ? "حدد البادئة ورقم البداية لكل نوع." : "Set a prefix and starting number for each type."}</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><div className="space-y-2"><Label>{isArabic ? "بادئة الدخل" : "Income prefix"}</Label><Input defaultValue={data.settings.depositPrefix} dir="ltr" onBlur={event => updateSettings.mutate({ depositPrefix: event.target.value || "INC-" })} /></div><div className="space-y-2"><Label>{isArabic ? "رقم بداية الدخل" : "Income starting number"}</Label><Input type="number" min="1" defaultValue={data.settings.depositStart} dir="ltr" onBlur={event => updateSettings.mutate({ depositStart: Math.max(1, Number(event.target.value) || 1) })} /></div><div className="space-y-2"><Label>{isArabic ? "بادئة الصرف" : "Expense prefix"}</Label><Input defaultValue={data.settings.expensePrefix} dir="ltr" onBlur={event => updateSettings.mutate({ expensePrefix: event.target.value || "EXP-" })} /></div><div className="space-y-2"><Label>{isArabic ? "رقم بداية الصرف" : "Expense starting number"}</Label><Input type="number" min="1" defaultValue={data.settings.expenseStart} dir="ltr" onBlur={event => updateSettings.mutate({ expenseStart: Math.max(1, Number(event.target.value) || 1) })} /></div></div></div>
      <div className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"><h3 className="font-black text-slate-900 dark:text-white">{isArabic ? "إدارة الفئات" : "Manage categories"}</h3><div className="mt-5 grid gap-5 sm:grid-cols-2">{(["deposit", "expense"] as TransactionType[]).map(type => <div key={type}><p className={`mb-3 text-sm font-bold ${type === "deposit" ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"}`}>{type === "deposit" ? (isArabic ? "فئات الإيداع" : "Deposit categories") : (isArabic ? "فئات الصرف" : "Expense categories")}</p><div className="space-y-2">{data.categories.filter(category => category.type === type).map(category => <div key={category.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800/60"><span className="flex items-center gap-2 text-sm font-medium"><i className="size-2.5 rounded-full" style={{ background: category.color }} />{category.name}</span><button onClick={() => removeCategory.mutate({ id: category.id })} className="text-slate-400 hover:text-rose-600" aria-label="حذف الفئة"><X className="size-4" /></button></div>)}</div><div className="mt-3 flex gap-2"><Input value={categoryName[type]} onChange={event => setCategoryName(current => ({ ...current, [type]: event.target.value }))} onKeyDown={event => { if (event.key === "Enter") addCategoryFor(type); }} placeholder={isArabic ? "فئة جديدة" : "New category"} className="h-9 text-sm" /><Button size="icon" className={`size-9 ${type === "deposit" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"}`} onClick={() => addCategoryFor(type)}><Plus className="size-4" /></Button></div></div>)}</div></div>
      <div className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center gap-2"><BellRing className="size-5 text-amber-500" /><h3 className="font-black text-slate-900 dark:text-white">{isArabic ? "منبه وتذكير" : "Reminders"}</h3></div><div className="mt-4 grid gap-2 sm:grid-cols-[1fr_145px_auto]"><Input value={reminderTitle} onChange={event => setReminderTitle(event.target.value)} placeholder={isArabic ? "مثال: فاتورة المورد" : "e.g. Supplier invoice"} /><Input type="datetime-local" value={reminderDate} onChange={event => setReminderDate(event.target.value)} dir="ltr" /><Button onClick={saveReminder} className="bg-[#0F9D82] hover:bg-[#0b806a]"><Plus className="size-4" /></Button></div><div className="mt-4 space-y-2">{data.reminders.length ? data.reminders.map(reminder => <div key={reminder.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60"><div><p className="text-sm font-bold">{reminder.title}</p><p className="mt-0.5 text-xs text-slate-500" dir="ltr">{reminder.reminderDate.replace("T", " · ")}</p></div><div className="flex items-center gap-2"><Switch checked={reminder.enabled} onCheckedChange={enabled => toggleReminder.mutate({ id: reminder.id, enabled })} /><button onClick={() => removeReminder.mutate({ id: reminder.id })} className="text-slate-400 hover:text-rose-600"><Trash2 className="size-4" /></button></div></div>) : <p className="py-2 text-sm text-slate-500">{isArabic ? "لا توجد تذكيرات مضافة." : "No reminders yet."}</p>}</div></div>
      <div className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center justify-between"><div><h3 className="font-black text-slate-900 dark:text-white">{isArabic ? "الأرشيف وسجل التعديلات" : "Archive & audit"}</h3><p className="mt-1 text-sm text-slate-500">{isArabic ? "العمليات المؤرشفة لا تظهر في الملخص ويمكن استعادتها." : "Archived transactions stay out of summaries and can be restored."}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold dark:bg-slate-800">{data.archivedTransactions.length}</span></div><div className="mt-4 space-y-2">{data.archivedTransactions.length ? data.archivedTransactions.map(record => <div key={record.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60"><div><p className="text-sm font-bold">{record.recordNumber}</p><p className="text-xs text-slate-500">{record.categoryName} · {record.transactionDate}</p></div><Button size="sm" variant="outline" onClick={() => restoreTransaction.mutate({ id: record.id })}>{isArabic ? "استعادة" : "Restore"}</Button></div>) : <p className="py-2 text-sm text-slate-500">{isArabic ? "لا توجد عمليات مؤرشفة." : "No archived transactions."}</p>}</div><div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800"><p className="text-sm font-bold">{isArabic ? "آخر التعديلات" : "Recent changes"}</p><div className="mt-2 space-y-1">{data.auditLogs.slice(0, 5).map(log => <p key={log.id} className="text-xs text-slate-500">{log.details} · {new Date(log.createdAt).toLocaleString(isArabic ? "ar-SA" : "en-US")}</p>)}</div></div></div>
      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900"><div className="flex items-start gap-3"><CircleHelp className="mt-0.5 size-5 text-[#0F9D82]" /><div><h3 className="font-black text-slate-900 dark:text-white">{isArabic ? "حول التطبيق" : "About the app"}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{isArabic ? "التحكم في المصروفات هو مساحة مبسطة لتسجيل التدفقات النقدية وفهمها بشكل يومي." : "Expense Control is a clear, daily workspace to record and understand your cash flow."}</p></div></div><Button variant="outline" className="mt-5 w-full gap-2 text-rose-700 hover:bg-rose-50 hover:text-rose-800 dark:text-rose-400" onClick={onLogout}><LogOut className="size-4" />{isArabic ? "تسجيل الخروج" : "Sign out"}</Button></div>
    </section>
  </div>;
}

function FinanceDashboard({ data, user, logout }: { data: DashboardData; user: { name?: string | null; email?: string | null }; logout: () => Promise<void> }) {
  const { theme, toggleTheme } = useTheme();
  const [section, setSection] = useState<Section>("overview");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [dialog, setDialog] = useState<{ open: boolean; type: TransactionType; record?: DashboardData["transactions"][number] | null }>({ open: false, type: "deposit", record: null });
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const utils = trpc.useUtils();
  const archiveTransaction = trpc.finance.archiveTransaction.useMutation({ onSuccess: () => { utils.finance.dashboard.invalidate(); toast.success(data.settings.language === "ar" ? "تمت أرشفة العملية" : "Transaction archived"); }, onError: error => toast.error(error.message) });
  const persistTheme = trpc.finance.updateSettings.useMutation({ onSuccess: () => utils.finance.dashboard.invalidate(), onError: error => toast.error(error.message) });
  const isArabic = data.settings.language === "ar";
  const copy = text[data.settings.language];
  const nav = [{ id: "overview", label: copy.overview, icon: LayoutDashboard }, { id: "deposit", label: copy.deposit, icon: ArrowDownToLine }, { id: "expense", label: copy.expense, icon: ArrowUpFromLine }, { id: "analytics", label: copy.analytics, icon: ChartNoAxesCombined }, { id: "settings", label: copy.settings, icon: Settings2 }];
  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    return data.transactions.filter(record => {
      const matchesSection = section !== "deposit" && section !== "expense" || record.type === section;
      const matchesQuery = !query || [record.recordNumber, record.invoiceNumber, record.customerName, record.taxNumber, record.categoryName].some(value => value.toLowerCase().includes(query));
      const matchesDate = (!dateFrom || record.transactionDate >= dateFrom) && (!dateTo || record.transactionDate <= dateTo);
      const matchesCategory = filterCategory === "all" || String(record.categoryId) === filterCategory;
      return matchesSection && matchesQuery && matchesDate && matchesCategory;
    });
  }, [data.transactions, section, search, dateFrom, dateTo, filterCategory]);

  useEffect(() => { document.documentElement.dir = isArabic ? "rtl" : "ltr"; document.documentElement.lang = data.settings.language; }, [isArabic, data.settings.language]);
  useEffect(() => { if (data.settings.theme !== theme) toggleTheme?.(); }, [data.settings.theme, theme, toggleTheme]);

  const title = section === "overview" ? copy.overview : section === "analytics" ? copy.analytics : section === "settings" ? copy.settings : section === "deposit" ? copy.deposit : copy.expense;
  const openTransaction = (type: TransactionType) => setDialog({ open: true, type });
  const openEdit = (record: DashboardData["transactions"][number]) => setDialog({ open: true, type: record.type, record });
  const handleLogout = async () => { try { await logout(); toast.success(isArabic ? "تم تسجيل الخروج" : "Signed out"); } catch { toast.error(isArabic ? "تعذر تسجيل الخروج" : "Unable to sign out"); } };
  const toggleStoredTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    toggleTheme?.();
    persistTheme.mutate({ theme: nextTheme });
  };

  return <main dir={isArabic ? "rtl" : "ltr"} className="min-h-screen bg-[#F7F8F4] text-slate-900 dark:bg-[#101918] dark:text-slate-100"><div className="mx-auto flex min-h-screen max-w-[1680px]">
    <aside className="hidden w-72 shrink-0 flex-col border-l border-slate-200/80 bg-white/90 p-5 dark:border-slate-800 dark:bg-slate-950/60 lg:flex"><div className="flex items-center gap-3 px-2"><BrandMark /><div><p className="font-black">التحكم في المصروفات</p><p className="mt-0.5 text-xs text-slate-400">Expense Control</p></div></div><nav className="mt-10 space-y-2">{nav.map(item => { const Icon = item.icon; return <button key={item.id} onClick={() => setSection(item.id as Section)} className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-right text-sm font-bold transition ${section === item.id ? "bg-[#0F9D82] text-white shadow-lg shadow-emerald-950/15" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"}`}><Icon className="size-5" />{item.label}{section === item.id && <ChevronLeft className="mr-auto size-4" />}</button>; })}</nav><div className="mt-auto rounded-3xl bg-[#0D3B37] p-5 text-white"><WalletCards className="size-6 text-emerald-300" /><p className="mt-4 text-sm font-bold">{isArabic ? "كل رقم له قصة." : "Every number has a story."}</p><p className="mt-1 text-xs leading-5 text-emerald-50/70">{isArabic ? "احتفظ بسجلك مرتباً لتقرر بثقة." : "Keep records tidy to decide with confidence."}</p></div></aside>
    <div className="min-w-0 flex-1"><header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-slate-200/80 bg-[#F7F8F4]/85 px-5 backdrop-blur-xl dark:border-slate-800 dark:bg-[#101918]/85 sm:px-8"><div className="flex items-center gap-3"><Button variant="outline" size="icon" className="lg:hidden" onClick={() => setMobileNavOpen(true)}><Menu className="size-5" /></Button><div><p className="text-xs font-bold text-[#0F9D82]">{section === "overview" ? copy.welcome : copy.overview}</p><h1 className="mt-0.5 text-xl font-black sm:text-2xl">{title}</h1></div></div><div className="flex items-center gap-2"><Button variant="outline" size="icon" onClick={toggleStoredTheme} aria-label="تبديل السمة">{theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}</Button><Button variant="outline" className="hidden gap-2 sm:inline-flex" onClick={() => exportTransactionsToExcel(filteredRecords)}><Download className="size-4" />{copy.export}</Button><Button onClick={() => openTransaction(section === "expense" ? "expense" : "deposit")} className="gap-2 bg-[#0F9D82] shadow-lg shadow-emerald-950/15 hover:bg-[#0b806a]"><Plus className="size-4" />{copy.add}</Button></div></header>
      <div className="p-5 sm:p-8">{section === "settings" ? <SettingsPanel data={data} user={user} onLogout={handleLogout} /> : <><div className="mb-5 grid gap-3 rounded-3xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-2 lg:grid-cols-5"><Input value={search} onChange={event => setSearch(event.target.value)} placeholder={isArabic ? "بحث بالرقم أو الفاتورة أو العميل" : "Search number, invoice, client"} /><Input type="date" value={dateFrom} onChange={event => setDateFrom(event.target.value)} aria-label={isArabic ? "من تاريخ" : "From date"} /><Input type="date" value={dateTo} onChange={event => setDateTo(event.target.value)} aria-label={isArabic ? "إلى تاريخ" : "To date"} /><select value={filterCategory} onChange={event => setFilterCategory(event.target.value)} className="h-10 rounded-md border border-slate-200 bg-transparent px-3 text-sm dark:border-slate-700"><option value="all">{isArabic ? "كل الفئات" : "All categories"}</option>{data.categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select><Button variant="outline" onClick={() => { setSearch(""); setDateFrom(""); setDateTo(""); setFilterCategory("all"); }}>{isArabic ? "إعادة ضبط" : "Reset"}</Button></div>{section === "overview" && <><div className="mb-8 flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><h2 className="text-2xl font-black tracking-tight">{copy.welcome}</h2><p className="mt-1 text-sm text-slate-500">{copy.subtitle}</p></div><p className="text-sm text-slate-400">{isArabic ? "اليوم" : "Today"} · {new Intl.DateTimeFormat(isArabic ? "ar-SA" : "en-US", { weekday: "long", month: "long", day: "numeric" }).format(new Date())}</p></div><div className="grid gap-4 md:grid-cols-3"><SummaryCard title={copy.deposits} value={data.summary.deposits} hint={isArabic ? "كل الإيداعات المسجلة" : "All recorded deposits"} icon={TrendingUp} accent="emerald" language={data.settings.language} /><SummaryCard title={copy.expenses} value={data.summary.expenses} hint={isArabic ? "كل عمليات الصرف المسجلة" : "All recorded expenses"} icon={TrendingDown} accent="rose" language={data.settings.language} /><SummaryCard title={copy.balance} value={data.summary.balance} hint={data.summary.balance >= 0 ? (isArabic ? "توازن إيجابي" : "Positive balance") : (isArabic ? "يحتاج مراجعة" : "Needs attention")} icon={WalletCards} accent="navy" language={data.settings.language} /></div></>}{section === "analytics" ? <Analytics data={data} language={data.settings.language} /> : <section className={`mt-${section === "overview" ? "8" : "0"} overflow-hidden rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900`}><div className="flex items-center justify-between border-b border-slate-100 px-5 py-5 dark:border-slate-800"><div><h3 className="font-black">{section === "overview" ? copy.latest : title}</h3><p className="mt-1 text-xs text-slate-500">{filteredRecords.length} {isArabic ? "عملية مسجلة" : "transactions recorded"}</p></div><Button variant="ghost" size="icon" className="text-slate-400"><MoreHorizontal className="size-5" /></Button></div><TransactionTable records={filteredRecords} language={data.settings.language} onDelete={id => { if (window.confirm(isArabic ? "هل تريد أرشفة هذه العملية؟ يمكنك استعادتها لاحقاً من الإعدادات." : "Archive this transaction? You can restore it later from Settings.")) archiveTransaction.mutate({ id }); }} onEdit={openEdit} /></section>}</>}</div>
    </div></div>
    {mobileNavOpen && <div className="fixed inset-0 z-50 bg-slate-950/30 lg:hidden" onClick={() => setMobileNavOpen(false)}><aside className="h-full w-72 bg-white p-5 shadow-2xl dark:bg-slate-950" onClick={event => event.stopPropagation()}><div className="flex items-center justify-between"><div className="flex items-center gap-3"><BrandMark /><span className="font-black">التحكم في المصروفات</span></div><Button variant="ghost" size="icon" onClick={() => setMobileNavOpen(false)}><X className="size-5" /></Button></div><nav className="mt-8 space-y-2">{nav.map(item => { const Icon = item.icon; return <button key={item.id} onClick={() => { setSection(item.id as Section); setMobileNavOpen(false); }} className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-right text-sm font-bold ${section === item.id ? "bg-[#0F9D82] text-white" : "text-slate-500 dark:text-slate-300"}`}><Icon className="size-5" />{item.label}</button>; })}</nav></aside></div>}
    <TransactionDialog open={dialog.open} onOpenChange={open => setDialog(current => ({ ...current, open, ...(open ? {} : { record: null }) }))} type={dialog.type} categories={data.categories} settings={data.settings} language={data.settings.language} initialRecord={dialog.record} />
  </main>;
}

export default function Home() {
  const { user, loading, logout } = useAuth();
  const [pinUnlocked, setPinUnlocked] = useState(false);
  const dashboard = trpc.finance.dashboard.useQuery(undefined, { enabled: Boolean(user), retry: false, refetchOnWindowFocus: false });
  if (loading) return <div className="grid min-h-screen place-items-center bg-[#F7F8F4] dark:bg-[#101918]"><Loader2 className="size-7 animate-spin text-[#0F9D82]" /></div>;
  if (!user) return <LoginScreen />;
  if (dashboard.isLoading) return <div className="grid min-h-screen place-items-center bg-[#F7F8F4] dark:bg-[#101918]"><div className="text-center"><Loader2 className="mx-auto size-7 animate-spin text-[#0F9D82]" /><p className="mt-3 text-sm text-slate-500">جارٍ تجهيز لوحة المصروفات…</p></div></div>;
  if (dashboard.error || !dashboard.data) return <div className="grid min-h-screen place-items-center bg-[#F7F8F4] p-6 text-center dark:bg-[#101918]"><div><p className="font-black text-slate-900 dark:text-white">تعذر تحميل البيانات</p><p className="mt-2 text-sm text-slate-500">{dashboard.error?.message || "حاول تحديث الصفحة مرة أخرى."}</p><Button className="mt-5 bg-[#0F9D82] hover:bg-[#0b806a]" onClick={() => dashboard.refetch()}>إعادة المحاولة</Button></div></div>;
  if (dashboard.data.settings.pinEnabled && !pinUnlocked) return <PinGate language={dashboard.data.settings.language} onUnlocked={() => setPinUnlocked(true)} />;
  return <FinanceDashboard data={dashboard.data as DashboardData} user={user} logout={logout} />;
}
