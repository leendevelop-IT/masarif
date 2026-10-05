import * as XLSX from "xlsx";
import type { Dictionary } from "./i18n";

export type ExportTransaction = {
  recordNumber: string;
  transactionDate: string;
  invoiceNumber: string;
  type: "deposit" | "expense";
  customerName: string;
  taxNumber: string;
  amountBeforeTax: number;
  taxAmount: number;
  totalAmount: number;
};

/** Writes the agreed nine-column workbook: number, date, invoice, customer, tax number, type, net, tax, total. */
export function exportTransactionsToExcel(
  records: ExportTransaction[],
  t: Dictionary
) {
  const headers = t.export.headers;
  const rows = records.map(record => ({
    [headers[0]]: record.recordNumber,
    [headers[1]]: record.transactionDate,
    [headers[2]]: record.invoiceNumber || "",
    [headers[3]]: record.customerName || "",
    [headers[4]]: record.taxNumber || "",
    [headers[5]]:
      record.type === "deposit" ? t.export.deposit : t.export.expense,
    [headers[6]]: record.amountBeforeTax,
    [headers[7]]: record.taxAmount,
    [headers[8]]: record.totalAmount,
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows, { header: [...headers] });
  worksheet["!cols"] = [
    { wch: 14 },
    { wch: 14 },
    { wch: 18 },
    { wch: 24 },
    { wch: 18 },
    { wch: 26 },
    { wch: 22 },
    { wch: 16 },
    { wch: 22 },
  ];
  if (t.dir === "rtl") worksheet["!views"] = [{ RTL: true }];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, t.export.sheet);
  XLSX.writeFileXLSX(
    workbook,
    `${t.export.fileName}-${new Date().toISOString().slice(0, 10)}.xlsx`
  );
}
