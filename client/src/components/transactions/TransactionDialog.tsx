import { Field } from "@/components/common/Field";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useDashboard } from "@/contexts/DashboardContext";
import { useLocale } from "@/contexts/LocaleContext";
import { describeError } from "@/lib/errors";
import { toISODate } from "@/lib/format";
import { trpc } from "@/lib/trpc";
import type { TransactionRecord, TransactionType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { MAX_ATTACHMENT_BYTES } from "@shared/const";
import { computeAmounts } from "@shared/money";
import { Camera, FileText, Loader2, Paperclip, Plus, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

export type DialogMode =
  | { type: TransactionType }
  | { record: TransactionRecord };

type Props = {
  open: boolean;
  mode: DialogMode;
  onOpenChange: (open: boolean) => void;
};
type FieldErrors = Partial<
  Record<"amount" | "date" | "category" | "recordNumber", string>
>;
type AttachmentLink = { name: string; mimeType: string; url: string };

const NEW_CATEGORY = "__new__";

const fileToBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

export function TransactionDialog({ open, mode, onOpenChange }: Props) {
  const { t, f, dir } = useLocale();
  const { data } = useDashboard();
  const utils = trpc.useUtils();
  const record = "record" in mode ? mode.record : null;
  const isEditing = Boolean(record);
  const { settings, categories } = data;

  const [type, setType] = useState<TransactionType>("deposit");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => toISODate(new Date()));
  const [categoryId, setCategoryId] = useState("");
  const [party, setParty] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [taxNumber, setTaxNumber] = useState("");
  const [taxApplies, setTaxApplies] = useState(true);
  const [taxRate, setTaxRate] = useState(15);
  const [numberingMode, setNumberingMode] = useState<"auto" | "manual">("auto");
  const [recordNumber, setRecordNumber] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [removeExisting, setRemoveExisting] = useState(false);
  const [newCategoryOpen, setNewCategoryOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState<"idle" | "uploading" | "saving">("idle");
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);

  // Fill the form from the record being edited, or reset it for a new transaction.
  useEffect(() => {
    if (!open) return;
    const initialType =
      record?.type ?? ("type" in mode ? mode.type : "deposit");
    setType(initialType);
    setAmount(
      record
        ? String(
            record.type === "expense"
              ? record.totalAmount
              : record.amountBeforeTax
          )
        : ""
    );
    setDate(record?.transactionDate ?? toISODate(new Date()));
    setCategoryId(record ? String(record.categoryId) : "");
    setParty(record?.customerName ?? "");
    setInvoiceNumber(record?.invoiceNumber ?? "");
    setTaxNumber(record?.taxNumber ?? "");
    setTaxApplies(record ? record.taxRate > 0 : settings.taxEnabled);
    setTaxRate(
      record && record.taxRate > 0 ? record.taxRate : settings.taxRate
    );
    setNumberingMode(record ? "manual" : settings.numberingMode);
    setRecordNumber(record?.recordNumber ?? "");
    setFile(null);
    setRemoveExisting(false);
    setNewCategoryOpen(false);
    setNewCategoryName("");
    setErrors({});
    setConfirmOpen(false);
    setBusy("idle");
    const timer = window.setTimeout(() => amountRef.current?.focus(), 80);
    return () => window.clearTimeout(timer);
    // `record` is derived from `mode`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    open,
    mode,
    settings.taxEnabled,
    settings.taxRate,
    settings.numberingMode,
  ]);

  const matchingCategories = useMemo(
    () => categories.filter(category => category.type === type),
    [categories, type]
  );

  // The category that is actually in effect: the chosen one while it fits the
  // type, otherwise the first category of that type. Derived at render time so
  // that switching type never clobbers the record's own category on open.
  const effectiveCategoryId = matchingCategories.some(
    category => String(category.id) === categoryId
  )
    ? categoryId
    : matchingCategories[0]
      ? String(matchingCategories[0].id)
      : "";

  const isExpense = type === "expense";
  const amounts = computeAmounts({
    type,
    amount: Number(amount) || 0,
    amountIncludesTax: isExpense,
    taxEnabled: isExpense && taxApplies,
    taxRate,
  });

  const predictedNumber = useMemo(() => {
    const prefix =
      type === "deposit" ? settings.depositPrefix : settings.expensePrefix;
    const start =
      type === "deposit" ? settings.depositStart : settings.expenseStart;
    const used = new Set(
      [...data.transactions, ...data.archivedTransactions]
        .filter(item => item.type === type)
        .map(item => item.recordNumber)
    );
    let next = start;
    while (used.has(`${prefix}${String(next).padStart(4, "0")}`)) next += 1;
    return `${prefix}${String(next).padStart(4, "0")}`;
  }, [type, settings, data.transactions, data.archivedTransactions]);

  const previewUrl = useMemo(
    () =>
      file && file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
    [file]
  );
  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl]
  );

  const existingAttachment = record && !removeExisting && !file ? record : null;

  const upload = trpc.finance.uploadAttachment.useMutation();
  const discardUpload = trpc.finance.discardAttachment.useMutation();
  const create = trpc.finance.createTransaction.useMutation();
  const update = trpc.finance.updateTransaction.useMutation();
  const createCategory = trpc.finance.createCategory.useMutation();

  const pickFile = (picked?: File | null) => {
    if (!picked) return;
    if (picked.size > MAX_ATTACHMENT_BYTES) {
      toast.error(t.form.fileTooLarge);
      return;
    }
    setFile(picked);
    setRemoveExisting(false);
  };

  const addCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) return;
    try {
      const created = await createCategory.mutateAsync({ name, type });
      await utils.finance.dashboard.invalidate();
      setCategoryId(String(created.id));
      setNewCategoryOpen(false);
      setNewCategoryName("");
      toast.success(t.settings.categories.added);
    } catch (error) {
      toast.error(describeError(error, t));
    }
  };

  const validate = () => {
    const next: FieldErrors = {};
    if (!(Number(amount) > 0)) next.amount = t.form.errors.amount;
    if (!date) next.date = t.form.errors.date;
    if (!effectiveCategoryId) next.category = t.form.errors.category;
    if (numberingMode === "manual" && !recordNumber.trim())
      next.recordNumber = t.form.errors.recordNumber;
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const buildPayload = (attachment: AttachmentLink | null | undefined) => ({
    type,
    categoryId: Number(effectiveCategoryId),
    amount: Number(amount),
    amountIncludesTax: isExpense,
    taxEnabled: isExpense && taxApplies,
    taxRate,
    numberingMode,
    recordNumber: numberingMode === "manual" ? recordNumber.trim() : undefined,
    transactionDate: date,
    invoiceNumber: isExpense ? invoiceNumber.trim() || undefined : undefined,
    customerName: party.trim() || undefined,
    taxNumber: isExpense ? taxNumber.trim() || undefined : undefined,
    attachment,
  });

  const save = async () => {
    let uploadedId: number | null = null;
    try {
      let attachment: AttachmentLink | null | undefined;
      if (file) {
        setBusy("uploading");
        const uploaded = await upload.mutateAsync({
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          fileData: await fileToBase64(file),
        });
        uploadedId = uploaded.id;
        attachment = {
          name: uploaded.name,
          mimeType: uploaded.mimeType,
          url: uploaded.url,
        };
      } else if (isEditing && removeExisting) {
        attachment = null;
      }
      setBusy("saving");
      if (record)
        await update.mutateAsync({
          id: record.id,
          ...buildPayload(attachment),
        });
      else await create.mutateAsync(buildPayload(attachment));
      uploadedId = null;
      await utils.finance.dashboard.invalidate();
      toast.success(
        record
          ? t.form.updated
          : isExpense
            ? t.form.savedExpense
            : t.form.savedDeposit
      );
      onOpenChange(false);
    } catch (error) {
      // The file went up but the transaction did not: free it rather than leave it orphaned.
      if (uploadedId) discardUpload.mutate({ id: uploadedId });
      toast.error(describeError(error, t));
    } finally {
      setBusy("idle");
      setConfirmOpen(false);
    }
  };

  const submit = () => {
    if (!validate()) return;
    if (isEditing) setConfirmOpen(true);
    else void save();
  };

  const working = busy !== "idle";

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={working ? () => undefined : onOpenChange}
      >
        <DialogContent
          dir={dir}
          showCloseButton={false}
          className={cn(
            "flex max-h-[92dvh] flex-col gap-0 overflow-hidden border-border bg-surface p-0 sm:max-w-xl sm:rounded-2xl",
            "max-sm:inset-0 max-sm:top-0 max-sm:left-0 max-sm:h-dvh max-sm:max-h-none max-sm:w-full max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none max-sm:border-0"
          )}
        >
          <div
            className={cn(
              "h-1.5 shrink-0",
              isExpense ? "bg-expense" : "bg-deposit"
            )}
          />
          <DialogHeader className="shrink-0 px-5 pt-5 text-start sm:px-7">
            <div className="flex items-start justify-between gap-3">
              <div>
                <DialogTitle className="text-xl font-semibold text-ink">
                  {isEditing ? t.form.editTitle : t.form.addTitle}
                </DialogTitle>
                <DialogDescription className="mt-1 text-sm text-ink-2">
                  {isEditing ? t.form.editSubtitle : t.form.addSubtitle}
                </DialogDescription>
              </div>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                disabled={working}
                aria-label={t.common.close}
                className="grid size-9 shrink-0 place-items-center rounded-lg text-ink-3 hover:bg-surface-2 hover:text-ink"
              >
                <X className="size-5" />
              </button>
            </div>
          </DialogHeader>

          <form
            id="tx-form"
            className="scroll-thin flex-1 overflow-y-auto px-5 pt-4 pb-5 sm:px-7"
            onSubmit={event => {
              event.preventDefault();
              submit();
            }}
            noValidate
          >
            <div
              className="segmented grid w-full grid-cols-2"
              role="group"
              aria-label={t.form.type}
            >
              <button
                type="button"
                onClick={() => setType("deposit")}
                aria-pressed={!isExpense}
                className={cn(
                  "h-10 text-sm font-semibold",
                  !isExpense && "!text-deposit-text"
                )}
              >
                {t.form.deposit}
              </button>
              <button
                type="button"
                onClick={() => setType("expense")}
                aria-pressed={isExpense}
                className={cn(
                  "h-10 text-sm font-semibold",
                  isExpense && "!text-expense-text"
                )}
              >
                {t.form.expense}
              </button>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field
                label={isExpense ? t.form.amountInclTax : t.form.amount}
                htmlFor="tx-amount"
                error={errors.amount}
                className="sm:col-span-2"
              >
                <div className="relative">
                  <input
                    ref={amountRef}
                    id="tx-amount"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={amount}
                    onChange={event => setAmount(event.target.value)}
                    aria-invalid={Boolean(errors.amount)}
                    placeholder="0.00"
                    className="field tnum h-14 pe-16 text-2xl font-semibold"
                  />
                  <span className="pointer-events-none absolute inset-y-0 end-4 grid place-items-center text-sm font-medium text-ink-3">
                    {f.currency}
                  </span>
                </div>
              </Field>

              <Field label={t.form.date} htmlFor="tx-date" error={errors.date}>
                <input
                  id="tx-date"
                  type="date"
                  value={date}
                  onChange={event => setDate(event.target.value)}
                  aria-invalid={Boolean(errors.date)}
                  className="field"
                />
              </Field>

              <Field
                label={t.form.category}
                htmlFor="tx-category"
                error={errors.category}
              >
                {newCategoryOpen ? (
                  <div className="flex gap-2">
                    <input
                      autoFocus
                      value={newCategoryName}
                      onChange={event => setNewCategoryName(event.target.value)}
                      onKeyDown={event => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          void addCategory();
                        }
                        if (event.key === "Escape") setNewCategoryOpen(false);
                      }}
                      placeholder={t.form.newCategoryPlaceholder}
                      className="field"
                      aria-label={t.form.newCategoryPlaceholder}
                    />
                    <Button
                      type="button"
                      size="icon-lg"
                      onClick={() => void addCategory()}
                      disabled={
                        createCategory.isPending || !newCategoryName.trim()
                      }
                      aria-label={t.common.add}
                      className="h-11 w-11 shrink-0"
                    >
                      {createCategory.isPending ? (
                        <Loader2 className="animate-spin" />
                      ) : (
                        <Plus />
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-lg"
                      onClick={() => setNewCategoryOpen(false)}
                      aria-label={t.common.cancel}
                      className="h-11 w-11 shrink-0"
                    >
                      <X />
                    </Button>
                  </div>
                ) : (
                  <Select
                    value={effectiveCategoryId}
                    onValueChange={value =>
                      value === NEW_CATEGORY
                        ? setNewCategoryOpen(true)
                        : setCategoryId(value)
                    }
                  >
                    <SelectTrigger
                      id="tx-category"
                      aria-invalid={Boolean(errors.category)}
                      className="h-11 w-full rounded-lg border-border-strong bg-surface px-3 text-[15px] dark:bg-surface-2"
                    >
                      <SelectValue placeholder={t.form.chooseCategory} />
                    </SelectTrigger>
                    <SelectContent dir={dir}>
                      {matchingCategories.map(category => (
                        <SelectItem
                          key={category.id}
                          value={String(category.id)}
                        >
                          <i
                            className="size-2 rounded-full"
                            style={{ background: category.color }}
                            aria-hidden
                          />
                          {category.name}
                        </SelectItem>
                      ))}
                      <SelectItem
                        value={NEW_CATEGORY}
                        className="text-primary-strong dark:text-primary"
                      >
                        <Plus className="size-4 text-current" />
                        {t.form.newCategory}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </Field>

              <Field
                label={isExpense ? t.form.customer : t.form.depositor}
                htmlFor="tx-party"
                optional={t.common.optional}
              >
                <input
                  id="tx-party"
                  value={party}
                  onChange={event => setParty(event.target.value)}
                  className="field"
                  autoComplete="off"
                />
              </Field>

              {isExpense && (
                <Field
                  label={t.form.invoiceNumber}
                  htmlFor="tx-invoice"
                  optional={t.common.optional}
                >
                  <input
                    id="tx-invoice"
                    value={invoiceNumber}
                    onChange={event => setInvoiceNumber(event.target.value)}
                    className="field"
                    dir="ltr"
                    autoComplete="off"
                  />
                </Field>
              )}

              {isExpense && (
                <Field
                  label={t.form.taxNumber}
                  htmlFor="tx-taxnumber"
                  optional={t.common.optional}
                >
                  <input
                    id="tx-taxnumber"
                    value={taxNumber}
                    onChange={event => setTaxNumber(event.target.value)}
                    className="field"
                    dir="ltr"
                    inputMode="numeric"
                    autoComplete="off"
                  />
                </Field>
              )}
            </div>

            {isExpense && (
              <div className="mt-4 rounded-xl border border-border bg-background p-4">
                <div className="flex items-center justify-between gap-3">
                  <label
                    htmlFor="tx-tax"
                    className="text-sm font-medium text-ink"
                  >
                    {t.form.taxApplies}
                  </label>
                  <div className="flex items-center gap-3">
                    {taxApplies && (
                      <span className="tnum inline-flex items-center gap-1 text-sm text-ink-2">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.5"
                          value={taxRate}
                          onChange={event =>
                            setTaxRate(
                              Math.min(
                                100,
                                Math.max(0, Number(event.target.value) || 0)
                              )
                            )
                          }
                          aria-label={t.form.taxRate}
                          className="field h-8 w-16 px-2 text-center text-sm"
                        />
                        %
                      </span>
                    )}
                    <Switch
                      id="tx-tax"
                      checked={taxApplies}
                      onCheckedChange={setTaxApplies}
                      className="h-6 w-10 data-[state=checked]:bg-primary [&_span]:size-5"
                    />
                  </div>
                </div>
                <dl className="tnum mt-3 grid grid-cols-3 gap-2 text-sm">
                  <div className="rounded-lg bg-surface p-2.5">
                    <dt className="text-xs text-ink-3">{t.form.beforeTax}</dt>
                    <dd className="mt-0.5 font-semibold text-ink">
                      {f.money(amounts.amountBeforeTax)}
                    </dd>
                  </div>
                  <div className="rounded-lg bg-surface p-2.5">
                    <dt className="text-xs text-ink-3">{t.form.taxValue}</dt>
                    <dd className="mt-0.5 font-semibold text-expense-text">
                      {f.money(amounts.taxAmount)}
                    </dd>
                  </div>
                  <div className="rounded-lg bg-surface p-2.5">
                    <dt className="text-xs text-ink-3">{t.form.total}</dt>
                    <dd className="mt-0.5 font-semibold text-ink">
                      {f.money(amounts.totalAmount)}
                    </dd>
                  </div>
                </dl>
              </div>
            )}

            <div className="mt-4 rounded-xl border border-border bg-background p-4">
              {isEditing ? (
                <Field
                  label={t.form.recordNumber}
                  htmlFor="tx-number"
                  error={errors.recordNumber}
                >
                  <input
                    id="tx-number"
                    value={recordNumber}
                    onChange={event => setRecordNumber(event.target.value)}
                    className="field"
                    dir="ltr"
                  />
                </Field>
              ) : (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-ink">
                      {t.form.numbering}
                    </p>
                    <p className="tnum mt-0.5 text-xs text-ink-3" dir="auto">
                      {numberingMode === "auto"
                        ? t.form.nextNumber(predictedNumber)
                        : t.form.recordNumber}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 sm:items-end">
                    <div
                      className="segmented"
                      role="group"
                      aria-label={t.form.numbering}
                    >
                      <button
                        type="button"
                        aria-pressed={numberingMode === "auto"}
                        onClick={() => setNumberingMode("auto")}
                      >
                        {t.form.auto}
                      </button>
                      <button
                        type="button"
                        aria-pressed={numberingMode === "manual"}
                        onClick={() => setNumberingMode("manual")}
                      >
                        {t.form.manual}
                      </button>
                    </div>
                    {numberingMode === "manual" && (
                      <div className="w-full sm:w-56">
                        <input
                          value={recordNumber}
                          onChange={event =>
                            setRecordNumber(event.target.value)
                          }
                          placeholder="INV-0102"
                          aria-label={t.form.recordNumber}
                          aria-invalid={Boolean(errors.recordNumber)}
                          className="field h-10"
                          dir="ltr"
                        />
                        {errors.recordNumber && (
                          <p className="mt-1 text-xs text-danger" role="alert">
                            {errors.recordNumber}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4">
              <p className="text-[13px] font-medium text-ink-2">
                {t.form.attachment}{" "}
                <span className="font-normal text-ink-3">
                  ({t.common.optional})
                </span>
              </p>
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
                onChange={event => pickFile(event.target.files?.[0])}
              />
              <input
                ref={cameraRef}
                type="file"
                className="hidden"
                accept="image/*"
                capture="environment"
                onChange={event => pickFile(event.target.files?.[0])}
              />
              {file || existingAttachment ? (
                <div className="mt-2 flex items-center gap-3 rounded-xl border border-border bg-background p-3">
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt=""
                      className="size-14 shrink-0 rounded-lg object-cover"
                    />
                  ) : existingAttachment?.attachmentUrl &&
                    existingAttachment.attachmentMime?.startsWith("image/") ? (
                    <img
                      src={existingAttachment.attachmentUrl}
                      alt=""
                      className="size-14 shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <span className="grid size-14 shrink-0 place-items-center rounded-lg bg-surface-2 text-ink-3">
                      <FileText className="size-6" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p
                      className="truncate text-sm font-medium text-ink"
                      dir="auto"
                    >
                      {file?.name ?? existingAttachment?.attachmentName}
                    </p>
                    <p className="text-xs text-ink-3">
                      {file
                        ? t.form.fileSize(
                            f.integer(Math.max(1, Math.round(file.size / 1024)))
                          )
                        : t.form.currentAttachment}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => fileRef.current?.click()}
                  >
                    {t.form.chooseFile}
                  </Button>
                  <button
                    type="button"
                    onClick={() => {
                      setFile(null);
                      if (existingAttachment) setRemoveExisting(true);
                    }}
                    aria-label={t.form.removeAttachment}
                    className="grid size-9 shrink-0 place-items-center rounded-lg text-ink-3 hover:bg-expense-soft hover:text-expense-text"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ) : (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 gap-2"
                    onClick={() => fileRef.current?.click()}
                  >
                    <Paperclip className="size-4" />
                    {t.form.chooseFile}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 gap-2 sm:hidden"
                    onClick={() => cameraRef.current?.click()}
                  >
                    <Camera className="size-4" />
                    {t.form.takePhoto}
                  </Button>
                  <span className="text-xs text-ink-3">
                    {t.form.attachmentHint}
                  </span>
                </div>
              )}
            </div>
          </form>

          <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border bg-surface px-5 py-4 sm:px-7">
            <p className="tnum hidden text-sm text-ink-2 sm:block">
              {t.form.total}:{" "}
              <span className="font-semibold text-ink">
                {f.money(amounts.totalAmount)}
              </span>
            </p>
            <div className="flex w-full justify-end gap-2 sm:w-auto">
              <Button
                type="button"
                variant="outline"
                className="h-11 px-5"
                onClick={() => onOpenChange(false)}
                disabled={working}
              >
                {t.common.cancel}
              </Button>
              <Button
                type="submit"
                form="tx-form"
                disabled={working}
                className={cn(
                  "h-11 min-w-36 gap-2 px-5 text-primary-foreground",
                  isExpense
                    ? "bg-expense hover:bg-expense/90"
                    : "bg-primary hover:bg-primary-strong"
                )}
              >
                {working ? <Loader2 className="size-4 animate-spin" /> : null}
                {busy === "uploading"
                  ? t.form.uploading
                  : busy === "saving"
                    ? t.form.saving
                    : isEditing
                      ? t.form.saveChanges
                      : t.form.save}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent dir={dir} className="border-border bg-surface">
          <AlertDialogHeader className="text-start">
            <AlertDialogTitle>{t.form.reviewTitle}</AlertDialogTitle>
            <AlertDialogDescription>{t.form.reviewBody}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={working}>
              {t.common.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={event => {
                event.preventDefault();
                void save();
              }}
              disabled={working}
              className="bg-primary text-primary-foreground hover:bg-primary-strong"
            >
              {working ? <Loader2 className="size-4 animate-spin" /> : null}
              {t.form.confirmSave}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
