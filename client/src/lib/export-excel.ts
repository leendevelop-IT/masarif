import * as XLSX from "xlsx";

export type ExportTransaction = {
  recordNumber: string;
  transactionDate: string;
  invoiceNumber: string;
  type: "deposit" | "expense";
  categoryName: string;
  customerName: string;
  taxNumber: string;
  amountBeforeTax: number;
  taxAmount: number;
  totalAmount: number;
};

export function exportTransactionsToExcel(records: ExportTransaction[]) {
  const rows = records.map(record => ({
    "الرقم": record.recordNumber,
    "التاريخ": record.transactionDate,
    "رقم الفاتورة": record.invoiceNumber || "",
    "اسم العميل": record.customerName === "—" ? "" : record.customerName,
    "الرقم الضريبي": record.taxNumber || "",
    "نوع الاضافة (الدخل/الصرف)": record.type === "deposit" ? "الدخل" : "الصرف",
    "المبلغ بدون الضريبة": record.amountBeforeTax,
    "قيمة الضريبة": record.taxAmount,
    "المبلغ شامل الضريبة": record.totalAmount,
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows, {
    header: ["الرقم", "التاريخ", "رقم الفاتورة", "اسم العميل", "الرقم الضريبي", "نوع الاضافة (الدخل/الصرف)", "المبلغ بدون الضريبة", "قيمة الضريبة", "المبلغ شامل الضريبة"],
  });
  worksheet["!cols"] = [
    { wch: 14 }, { wch: 14 }, { wch: 18 }, { wch: 24 }, { wch: 18 }, { wch: 26 }, { wch: 22 }, { wch: 16 }, { wch: 22 },
  ];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "المصروفات");
  XLSX.writeFileXLSX(workbook, `سجل-المصروفات-${new Date().toISOString().slice(0, 10)}.xlsx`);
}
