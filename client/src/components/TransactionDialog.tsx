import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Camera, FileText, Loader2, Paperclip, Pencil, Plus } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

type TransactionType = "deposit" | "expense";
type Category = { id: number; name: string; type: TransactionType; color: string };
type Settings = { taxEnabled: boolean; taxRate: number; numberingMode: "auto" | "manual" };
export type EditableTransaction = { id: number; recordNumber: string; type: TransactionType; transactionDate: string; invoiceNumber: string; categoryId: number; customerName: string; taxNumber: string; amountBeforeTax: number; taxRate: number; totalAmount: number; attachmentName: string | null; attachmentMime: string | null; attachmentUrl: string | null };
type TransactionPayload = { type: TransactionType; categoryId: number; amount: number; amountIncludesTax: boolean; taxEnabled: boolean; taxRate: number; numberingMode: "auto" | "manual"; recordNumber?: string; transactionDate: string; invoiceNumber?: string; customerName?: string; taxNumber?: string; attachmentName?: string; attachmentMime?: string; attachmentUrl?: string };
type Props = { open: boolean; onOpenChange: (open: boolean) => void; type: TransactionType; categories: Category[]; settings: Settings; language: "ar" | "en"; initialRecord?: EditableTransaction | null };

const today = () => new Date().toISOString().slice(0, 10);

export function TransactionDialog({ open, onOpenChange, type, categories, settings, language, initialRecord }: Props) {
  const utils = trpc.useUtils();
  const isArabic = language === "ar";
  const isEditing = Boolean(initialRecord);
  const [transactionType, setTransactionType] = useState<TransactionType>(type);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today());
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [personName, setPersonName] = useState("");
  const [taxNumber, setTaxNumber] = useState("");
  const [taxRateValue, setTaxRateValue] = useState(settings.taxRate);
  const [numberingMode, setNumberingMode] = useState<"auto" | "manual">(settings.numberingMode);
  const [recordNumber, setRecordNumber] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [existingAttachmentName, setExistingAttachmentName] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<TransactionPayload | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const matchingCategories = useMemo(() => categories.filter(category => category.type === transactionType), [categories, transactionType]);
  const isExpense = transactionType === "expense";
  const taxEnabled = isExpense && (isEditing ? taxRateValue > 0 : settings.taxEnabled);
  const taxRate = taxEnabled ? taxRateValue : 0;
  const enteredAmount = Number(amount) || 0;
  const amountBeforeTax = isExpense ? enteredAmount / (1 + taxRate / 100) : enteredAmount;
  const taxAmount = isExpense ? enteredAmount - amountBeforeTax : 0;

  const copy = isArabic ? {
    title: isEditing ? "تعديل العملية" : "إضافة عملية", description: isEditing ? "عدّل البيانات ثم راجع التغييرات قبل تثبيتها." : "اختر نوع العملية وأدخل بياناتها بدقة.", income: "الدخل", expense: "الصرف", numbering: "الترقيم", automatic: "آلي", manual: "يدوي", recordNumber: "رقم العملية", date: "التاريخ", invoiceNumber: "رقم الفاتورة", category: "الفئة", chooseCategory: "اختر الفئة", amount: "المبلغ", grossAmount: "المبلغ شامل الضريبة", depositor: "اسم المودع", customer: "اسم العميل", taxNumber: "الرقم الضريبي", taxValue: "قيمة الضريبة", beforeTax: "المبلغ قبل الضريبة", attachment: "إرفاق", attachFile: "ملف", camera: "صورة / كاميرا", optional: "اختياري", cancel: "إلغاء", save: isEditing ? "مراجعة التعديل" : "حفظ العملية", complete: "أكمل الرقم والتاريخ والفئة والمبلغ قبل الحفظ", savedIncome: isEditing ? "تم تعديل الدخل بنجاح" : "تم حفظ الدخل بنجاح", savedExpense: isEditing ? "تم تعديل الصرف بنجاح" : "تم حفظ الصرف بنجاح", fileSize: "حجم المرفق يجب ألا يتجاوز 10 ميغابايت", failed: "تعذر حفظ العملية", rate: "النسبة الحالية", confirmTitle: "تثبيت التعديل؟", confirmDescription: "سيتم حفظ التغييرات على هذه العملية ولا يمكن التراجع عنها تلقائياً.", confirm: "نعم، تثبيت التعديل", review: "تأكيد التغييرات", existingAttachment: "المرفق الحالي",
  } : {
    title: isEditing ? "Edit transaction" : "Add transaction", description: isEditing ? "Edit the fields and review your changes before applying them." : "Choose the transaction type and enter its details.", income: "Income", expense: "Expense", numbering: "Numbering", automatic: "Automatic", manual: "Manual", recordNumber: "Transaction number", date: "Date", invoiceNumber: "Invoice number", category: "Category", chooseCategory: "Choose a category", amount: "Amount", grossAmount: "Amount including tax", depositor: "Depositor name", customer: "Customer name", taxNumber: "Tax number", taxValue: "Tax value", beforeTax: "Amount before tax", attachment: "Attachment", attachFile: "File", camera: "Photo / camera", optional: "Optional", cancel: "Cancel", save: isEditing ? "Review changes" : "Save transaction", complete: "Complete number, date, category, and amount before saving", savedIncome: isEditing ? "Income updated" : "Income saved", savedExpense: isEditing ? "Expense updated" : "Expense saved", fileSize: "Attachment must be 10 MB or smaller", failed: "Unable to save transaction", rate: "Current rate", confirmTitle: "Apply changes?", confirmDescription: "The changes will be saved to this transaction and cannot be automatically undone.", confirm: "Yes, apply changes", review: "Confirm changes", existingAttachment: "Current attachment",
  };

  useEffect(() => {
    if (!open) return;
    const record = initialRecord;
    setTransactionType(record?.type || type);
    setAmount(record ? String(record.type === "expense" ? record.totalAmount : record.amountBeforeTax) : "");
    setDate(record?.transactionDate || today());
    setInvoiceNumber(record?.invoiceNumber || "");
    setCategoryId(record ? String(record.categoryId) : "");
    setPersonName(record?.customerName === "—" ? "" : record?.customerName || "");
    setTaxNumber(record?.taxNumber || "");
    setTaxRateValue(record ? record.taxRate : settings.taxRate);
    setNumberingMode(record ? "manual" : settings.numberingMode || "auto");
    setRecordNumber(record?.recordNumber || "");
    setAttachment(null);
    setExistingAttachmentName(record?.attachmentName || null);
    setConfirmOpen(false);
    setPendingPayload(null);
  }, [open, type, initialRecord, settings.numberingMode, settings.taxRate]);

  useEffect(() => {
    if (!isEditing) setCategoryId(matchingCategories[0] ? String(matchingCategories[0].id) : "");
  }, [matchingCategories, isEditing]);

  const finishSuccess = async () => {
    await utils.finance.dashboard.invalidate();
    toast.success(isExpense ? copy.savedExpense : copy.savedIncome);
    onOpenChange(false);
  };
  const uploadAttachment = trpc.finance.uploadAttachment.useMutation();
  const create = trpc.finance.createTransaction.useMutation({ onSuccess: finishSuccess, onError: error => toast.error(error.message || copy.failed) });
  const update = trpc.finance.updateTransaction.useMutation({ onSuccess: finishSuccess, onError: error => toast.error(error.message || copy.failed) });

  const uploadSelectedAttachment = async () => {
    if (!attachment) return undefined;
    setUploading(true);
    try {
      const bytes = new Uint8Array(await attachment.arrayBuffer());
      let binary = "";
      const chunkSize = 0x8000;
      for (let index = 0; index < bytes.length; index += chunkSize) binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
      return await uploadAttachment.mutateAsync({ fileName: attachment.name, mimeType: attachment.type || "application/octet-stream", fileData: btoa(binary) });
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    if (!amount || enteredAmount <= 0 || !date || !categoryId || (numberingMode === "manual" && !recordNumber.trim())) {
      toast.error(copy.complete);
      return;
    }
    const payload: TransactionPayload = {
      type: transactionType,
      categoryId: Number(categoryId),
      amount: enteredAmount,
      amountIncludesTax: isExpense,
      taxEnabled,
      taxRate,
      numberingMode,
      recordNumber: recordNumber.trim() || undefined,
      transactionDate: date,
      invoiceNumber: isExpense ? invoiceNumber.trim() || undefined : undefined,
      customerName: personName.trim() || undefined,
      taxNumber: isExpense ? taxNumber.trim() || undefined : undefined,
    };
    if (isEditing && initialRecord) {
      setPendingPayload(payload);
      setConfirmOpen(true);
    } else {
      try {
        const uploaded = await uploadSelectedAttachment();
        create.mutate({ ...payload, attachmentName: uploaded?.fileName, attachmentMime: uploaded?.mimeType, attachmentUrl: uploaded?.url });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : copy.failed);
      }
    }
  };

  const confirmUpdate = async () => {
    if (!initialRecord || !pendingPayload) return;
    try {
      const uploaded = await uploadSelectedAttachment();
      update.mutate({ id: initialRecord.id, ...pendingPayload, attachmentName: uploaded?.fileName, attachmentMime: uploaded?.mimeType, attachmentUrl: uploaded?.url });
      setConfirmOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : copy.failed);
    }
  };
  const pickFile = (file?: File) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error(copy.fileSize);
      return;
    }
    setAttachment(file);
    setExistingAttachmentName(null);
  };

  return <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir={isArabic ? "rtl" : "ltr"} className="max-h-[92vh] overflow-y-auto border-slate-200 bg-white p-0 sm:max-w-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className={`h-1.5 ${isExpense ? "bg-rose-500" : "bg-emerald-500"}`} />
        <div className="p-6">
          <DialogHeader className={isArabic ? "text-right" : "text-left"}><DialogTitle className="flex items-center gap-2 text-xl text-slate-950 dark:text-white">{isEditing ? <Pencil className="size-5 text-emerald-600" /> : null}{copy.title}</DialogTitle><DialogDescription>{copy.description}</DialogDescription></DialogHeader>
          <div className="mt-6 grid grid-cols-2 rounded-2xl bg-slate-100 p-1 dark:bg-slate-800"><button type="button" onClick={() => setTransactionType("deposit")} className={`rounded-xl px-4 py-3 text-sm font-bold transition ${!isExpense ? "bg-white text-emerald-700 shadow-sm dark:bg-slate-700 dark:text-emerald-300" : "text-slate-500"}`}>{copy.income}</button><button type="button" onClick={() => setTransactionType("expense")} className={`rounded-xl px-4 py-3 text-sm font-bold transition ${isExpense ? "bg-white text-rose-700 shadow-sm dark:bg-slate-700 dark:text-rose-300" : "text-slate-500"}`}>{copy.expense}</button></div>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <div className="space-y-2"><Label>{copy.numbering}</Label><Select value={numberingMode} onValueChange={value => setNumberingMode(value as "auto" | "manual")}><SelectTrigger className="h-11"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="auto">{copy.automatic}</SelectItem><SelectItem value="manual">{copy.manual}</SelectItem></SelectContent></Select></div>
            {numberingMode === "manual" && <div className="space-y-2"><Label htmlFor="record-number">{copy.recordNumber}</Label><Input id="record-number" value={recordNumber} onChange={event => setRecordNumber(event.target.value)} placeholder="INV-102" className="h-11" dir="ltr" /></div>}
            <div className="space-y-2"><Label htmlFor="transaction-date">{copy.date}</Label><Input id="transaction-date" type="date" value={date} onChange={event => setDate(event.target.value)} className="h-11" dir="ltr" /></div>
            {isExpense && <div className="space-y-2"><Label htmlFor="invoice-number">{copy.invoiceNumber}</Label><Input id="invoice-number" value={invoiceNumber} onChange={event => setInvoiceNumber(event.target.value)} placeholder={copy.optional} className="h-11" dir="ltr" /></div>}
            <div className="space-y-2"><Label>{copy.category}</Label><Select value={categoryId} onValueChange={setCategoryId}><SelectTrigger className="h-11"><SelectValue placeholder={copy.chooseCategory} /></SelectTrigger><SelectContent>{matchingCategories.map(category => <SelectItem key={category.id} value={String(category.id)}>{category.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label htmlFor="person-name">{isExpense ? copy.customer : copy.depositor}</Label><Input id="person-name" value={personName} onChange={event => setPersonName(event.target.value)} placeholder={copy.optional} className="h-11" /></div>
            {isExpense && <div className="space-y-2"><Label htmlFor="tax-number">{copy.taxNumber}</Label><Input id="tax-number" value={taxNumber} onChange={event => setTaxNumber(event.target.value)} placeholder={copy.optional} className="h-11" dir="ltr" /></div>}
            <div className="space-y-2 sm:col-span-2"><Label htmlFor="transaction-amount">{isExpense ? copy.grossAmount : copy.amount}</Label><div className="relative"><Input id="transaction-amount" inputMode="decimal" type="number" min="0" step="0.01" value={amount} onChange={event => setAmount(event.target.value)} placeholder="0.00" className="h-11 pl-12 text-left font-semibold" dir="ltr" /><span className="absolute left-3 top-2.5 text-xs font-semibold text-slate-400">SAR</span></div></div>
          </div>
          {isExpense && <div className="mt-5 grid gap-3 rounded-2xl border border-rose-100 bg-rose-50/70 p-4 dark:border-rose-900/50 dark:bg-rose-950/20 sm:grid-cols-3"><div><p className="text-xs text-slate-500">{copy.rate}</p><p className="mt-1 font-bold">{taxRate}%</p></div><div><p className="text-xs text-slate-500">{copy.taxValue}</p><p className="mt-1 font-bold text-rose-700 dark:text-rose-300">{taxAmount.toLocaleString(isArabic ? "ar-SA" : "en-US", { maximumFractionDigits: 2 })} SAR</p></div><div><p className="text-xs text-slate-500">{copy.beforeTax}</p><p className="mt-1 font-bold text-slate-800 dark:text-slate-100">{amountBeforeTax.toLocaleString(isArabic ? "ar-SA" : "en-US", { maximumFractionDigits: 2 })} SAR</p></div></div>}
          <div className="mt-5 space-y-2"><Label>{copy.attachment}</Label><input ref={fileRef} type="file" className="hidden" onChange={event => pickFile(event.target.files?.[0])} /><input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={event => pickFile(event.target.files?.[0])} /><div className="flex flex-wrap gap-2"><Button type="button" variant="outline" className="h-10 gap-2" onClick={() => fileRef.current?.click()}><Paperclip className="size-4" />{copy.attachFile}</Button><Button type="button" variant="outline" className="h-10 gap-2" onClick={() => cameraRef.current?.click()}><Camera className="size-4" />{copy.camera}</Button>{(attachment || existingAttachmentName) && <span className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"><FileText className="size-4" />{attachment?.name || `${copy.existingAttachment}: ${existingAttachmentName}`}</span>}</div></div>
          <div className="mt-7 flex justify-end gap-3"><Button variant="outline" onClick={() => onOpenChange(false)}>{copy.cancel}</Button><Button onClick={submit} disabled={uploading || create.isPending || update.isPending} className={`min-w-32 gap-2 ${isExpense ? "bg-rose-600 hover:bg-rose-700" : "bg-emerald-600 hover:bg-emerald-700"}`}>{uploading || create.isPending || update.isPending ? <Loader2 className="size-4 animate-spin" /> : isEditing ? <Pencil className="size-4" /> : <Plus className="size-4" />}{copy.save}</Button></div>
        </div>
      </DialogContent>
    </Dialog>
    <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}><AlertDialogContent dir={isArabic ? "rtl" : "ltr"}><AlertDialogHeader className={isArabic ? "text-right" : "text-left"}><AlertDialogTitle>{copy.confirmTitle}</AlertDialogTitle><AlertDialogDescription>{copy.confirmDescription}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{copy.cancel}</AlertDialogCancel><AlertDialogAction onClick={confirmUpdate} className="bg-[#0F9D82] hover:bg-[#0b806a]">{copy.confirm}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </>;
}
