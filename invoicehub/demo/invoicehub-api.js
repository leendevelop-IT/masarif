(function () {
  const days = window.__demoDays;
  const at = window.__demoAt;
  let nextId = 100;
  let signedIn = true;
  const user = { id: 1, name: "أحمد الغامدي", email: "ahmad@example.com", role: "user" };
  const settings = {
    language: "ar", theme: "dark", vatEnabled: true, vatRate: 15, pinEnabled: false,
    numbering: { balancePrefix: "DEP", balanceStart: 1, untaxedPrefix: "INV", untaxedStart: 1, taxablePrefix: "TAX", taxableStart: 1 },
    categories: [{ id: 1, kind: "taxable", name: "خدمات استشارية" }, { id: 2, kind: "taxable", name: "صيانة" }, { id: 3, kind: "untaxed", name: "مبيعات" }, { id: 4, kind: "untaxed", name: "توريد" }],
    reminders: [{ id: 1, title: "تقديم إقرار الضريبة للربع الحالي", dueAt: at(7, 9), isEnabled: true, notifiedAt: null }, { id: 2, title: "تحصيل فاتورة INV-2291", dueAt: at(-2, 9), isEnabled: true, notifiedAt: null }],
  };
  let pin = "";
  const counters = { DEP: 4, INV: 3, TAX: 6 };
  const invoice = (id, kind, date, seq, no, category, client, taxNumber, gross, file) => {
    const rate = kind === "taxable" ? 15 : 0;
    const net = rate ? Math.round((gross * 100) / (1 + rate / 100)) / 100 : gross;
    return { id, kind, invoiceDate: date, sequenceNumber: seq, invoiceNumber: no, category, clientName: client, taxNumber, grossAmount: gross, netAmount: net, taxAmount: Math.round((gross - net) * 100) / 100, attachmentKey: file ? `k${id}` : null, attachmentName: file };
  };
  const invoices = [
    invoice(11, "taxable", days(-3), "TAX-000006", "INV-2291", "خدمات استشارية", "شركة الأفق للتجارة", "300012345600003", 5750, "invoice-2291.pdf"),
    invoice(12, "untaxed", days(-5), "INV-000003", "A-118", "مبيعات", "مؤسسة النخيل", "", 1800, null),
    invoice(13, "taxable", days(-9), "TAX-000005", "INV-2287", "صيانة", "مكتب الرواد الهندسي", "310098765400003", 2300, "scan.jpg"),
    invoice(14, "taxable", days(-25), "TAX-000004", "INV-2270", "خدمات استشارية", "شركة الأفق للتجارة", "300012345600003", 1725, null),
    invoice(15, "untaxed", days(-41), "INV-000002", "A-102", "مبيعات", "سالم العمري", "", 950, "receipt.png"),
    invoice(16, "taxable", days(-70), "TAX-000003", "INV-2231", "صيانة", "شركة البناء الحديث", "300567891200003", 4600, null),
    invoice(17, "untaxed", days(-100), "INV-000001", "A-090", "توريد", "مؤسسة النخيل", "", 2100, null),
    invoice(18, "taxable", days(-130), "TAX-000002", "INV-2201", "خدمات استشارية", "مكتب الرواد الهندسي", "310098765400003", 3450, null),
    invoice(19, "taxable", days(-160), "TAX-000001", "INV-2188", "صيانة", "شركة البناء الحديث", "300567891200003", 1150, null),
  ];
  const balances = [
    { id: 21, entryDate: days(-4), entryNumber: "DEP-000004", category: "إيداع", depositorName: "تحويل بنكي — الراجحي", amount: 7000, attachmentKey: null, attachmentName: null },
    { id: 22, entryDate: days(-21), entryNumber: "DEP-000003", category: "إيداع", depositorName: "نقدًا", amount: 2500, attachmentKey: "k22", attachmentName: "deposit.pdf" },
    { id: 23, entryDate: days(-48), entryNumber: "DEP-000002", category: "إيداع", depositorName: "تحويل بنكي — الأهلي", amount: 3000, attachmentKey: null, attachmentName: null },
    { id: 24, entryDate: days(-120), entryNumber: "DEP-000001", category: "إيداع", depositorName: "تحويل بنكي — الراجحي", amount: 4200, attachmentKey: null, attachmentName: null },
  ];
  const activity = [
    { id: 1, action: "invoice.created", entityType: "invoice", details: JSON.stringify({ sequenceNumber: "TAX-000006", grossAmount: 5750 }), createdAt: at(-3, 8) },
    { id: 2, action: "balance.created", entityType: "balance", details: JSON.stringify({ entryNumber: "DEP-000004", amount: 7000 }), createdAt: at(-4, 10) },
    { id: 3, action: "settings.updated", entityType: "settings", details: JSON.stringify({ changed: "vat" }), createdAt: at(-6, 14) },
    { id: 4, action: "backup.created", entityType: "backup", details: JSON.stringify({ fileName: "invoice-archive-backup.zip" }), createdAt: at(-8, 7) },
  ];
  const backups = [{ id: 1, fileName: "invoice-archive-2026-10-17.zip", createdAt: at(-8, 7), invoiceCount: 5, balanceCount: 3, sizeBytes: 184320 }];
  const log = (action, entityType, details) => activity.unshift({ id: nextId++, action, entityType, details: JSON.stringify(details), createdAt: new Date().toISOString() });
  const nextNumber = (prefix) => { counters[prefix] = (counters[prefix] || 0) + 1; return `${prefix}-${String(counters[prefix]).padStart(6, "0")}`; };
  const monthKey = (d) => d.slice(0, 7);
  const summary = () => {
    const taxableTotal = invoices.filter((i) => i.kind === "taxable").reduce((s, i) => s + i.grossAmount, 0);
    const untaxedTotal = invoices.filter((i) => i.kind === "untaxed").reduce((s, i) => s + i.grossAmount, 0);
    const balance = balances.reduce((s, b) => s + b.amount, 0);
    const months = Array.from({ length: 6 }, (_, i) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - (5 - i)); const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; return { key, label: new Intl.DateTimeFormat(settings.language === "ar" ? "ar-SA-u-ca-gregory-nu-latn" : "en-GB", { month: "short" }).format(d), taxable: 0, untaxed: 0 }; });
    invoices.forEach((i) => { const m = months.find((x) => x.key === monthKey(i.invoiceDate)); if (m) m[i.kind] += i.grossAmount; });
    const categoryCounts = {}; invoices.forEach((i) => { categoryCounts[i.category] = (categoryCounts[i.category] || 0) + 1; });
    return { balance, taxableTotal, untaxedTotal, invoicesTotal: taxableTotal + untaxedTotal, difference: taxableTotal + untaxedTotal - balance, months,
      stats: { balanceCount: balances.length, taxableCount: invoices.filter((i) => i.kind === "taxable").length, untaxedCount: invoices.filter((i) => i.kind === "untaxed").length, invoiceCount: invoices.length, categoryCounts: Object.entries(categoryCounts).map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count) } };
  };
  const recompute = (row, gross) => { const rate = row.kind === "taxable" && settings.vatEnabled ? settings.vatRate : 0; const net = rate ? Math.round((gross * 100) / (1 + rate / 100)) / 100 : gross; row.grossAmount = gross; row.netAmount = net; row.taxAmount = Math.round((gross - net) * 100) / 100; };

  window.__demoApi({
    "auth.me": () => (signedIn ? user : null),
    "auth.logout": () => { signedIn = false; return { success: true }; },
    "auth.login": () => { signedIn = true; return { success: true }; },
    "auth.register": (input) => { signedIn = true; user.name = input.name || user.name; user.email = input.email || user.email; return { recoveryCode: "DEMO-7K2M-9QHA-XV3L-P8ZR-T6WC-4BNE" }; },
    "auth.resetWithRecoveryCode": () => ({ success: true }),
    "auth.accountSecurity": () => ({ hasPasswordLogin: true, hasRecoveryCode: true }),
    "auth.issueRecoveryCode": () => ({ code: "DEMO-7K2M-9QHA-XV3L-P8ZR-T6WC-4BNE" }),
    "archive.settings": () => ({ ...settings, profile: { name: user.name, email: user.email } }),
    "archive.summary": () => summary(),
    "archive.list": () => ({ invoices, balances }),
    "archive.exportAll": () => ({ invoices, balances }),
    "archive.createInvoice": (input) => { const prefix = input.kind === "taxable" ? settings.numbering.taxablePrefix : settings.numbering.untaxedPrefix; const row = invoice(nextId++, input.kind, input.date, input.mode === "manual" ? input.sequenceNumber : nextNumber(prefix), input.invoiceNumber || "", input.category, input.clientName, input.taxNumber || "", Number(input.grossAmount), input.attachment ? input.attachment.name : null); recompute(row, Number(input.grossAmount)); invoices.unshift(row); log("invoice.created", "invoice", { sequenceNumber: row.sequenceNumber, grossAmount: row.grossAmount }); return { id: row.id }; },
    "archive.createBalance": (input) => { const row = { id: nextId++, entryDate: input.date, entryNumber: input.mode === "manual" ? input.entryNumber : nextNumber(settings.numbering.balancePrefix), category: input.category, depositorName: input.depositorName, amount: Number(input.amount), attachmentKey: input.attachment ? `k${nextId}` : null, attachmentName: input.attachment ? input.attachment.name : null }; balances.unshift(row); log("balance.created", "balance", { entryNumber: row.entryNumber, amount: row.amount }); return { id: row.id }; },
    "archive.updateInvoice": (input) => { const row = invoices.find((i) => i.id === input.id); if (!row) throw new Error("السجل غير موجود"); row.sequenceNumber = input.sequenceNumber; row.invoiceNumber = input.invoiceNumber; row.invoiceDate = input.date; row.category = input.category; row.clientName = input.clientName; row.taxNumber = input.taxNumber; recompute(row, Number(input.grossAmount)); if (input.attachment) { row.attachmentKey = `k${row.id}`; row.attachmentName = input.attachment.name; } log("invoice.updated", "invoice", { sequenceNumber: row.sequenceNumber }); return { id: row.id }; },
    "archive.updateBalance": (input) => { const row = balances.find((b) => b.id === input.id); if (!row) throw new Error("السجل غير موجود"); row.entryNumber = input.entryNumber; row.entryDate = input.date; row.category = input.category; row.depositorName = input.depositorName; row.amount = Number(input.amount); if (input.attachment) { row.attachmentKey = `k${row.id}`; row.attachmentName = input.attachment.name; } log("balance.updated", "balance", { entryNumber: row.entryNumber }); return { id: row.id }; },
    "archive.deleteInvoice": (input) => { const i = invoices.findIndex((r) => r.id === input.id); if (i >= 0) { log("invoice.deleted", "invoice", { sequenceNumber: invoices[i].sequenceNumber }); invoices.splice(i, 1); } return { success: true }; },
    "archive.deleteBalance": (input) => { const i = balances.findIndex((r) => r.id === input.id); if (i >= 0) { log("balance.deleted", "balance", { entryNumber: balances[i].entryNumber }); balances.splice(i, 1); } return { success: true }; },
    "archive.attachmentUrl": () => ({ url: "https://example.com/demo-attachment.pdf" }),
    "archive.verifyPin": (input) => { if (String(input.pin) !== pin) throw new Error("الرقم السري غير صحيح."); return { success: true }; },
    "archive.updateSettings": (input) => { if (input.name) user.name = input.name; settings.language = input.language; settings.theme = input.theme; settings.vatEnabled = input.vatEnabled; settings.vatRate = Number(input.vatRate); log("settings.updated", "settings", { changed: "profile-language-theme-vat" }); return { success: true }; },
    "archive.updateNumbering": (input) => { Object.assign(settings.numbering, input); log("settings.updated", "settings", { changed: "numbering" }); return { success: true }; },
    "archive.setPin": (input) => { if (settings.pinEnabled && String(input.currentPin || "") !== pin) throw new Error("الرقم السري الحالي غير صحيح."); settings.pinEnabled = Boolean(input.enabled); pin = input.enabled ? String(input.newPin || "") : ""; log("pin.updated", "pin", { enabled: settings.pinEnabled }); return { enabled: settings.pinEnabled }; },
    "archive.addCategory": (input) => { settings.categories.push({ id: nextId++, kind: input.kind, name: input.name }); log("category.added", "category", { name: input.name }); return { success: true }; },
    "archive.removeCategory": (input) => { const i = settings.categories.findIndex((c) => c.id === input.id); if (i >= 0) { log("category.removed", "category", { name: settings.categories[i].name }); settings.categories.splice(i, 1); } return { success: true }; },
    "archive.addReminder": (input) => { settings.reminders.push({ id: nextId++, title: input.title, dueAt: input.dueAt, isEnabled: true, notifiedAt: null }); log("reminder.added", "reminder", { title: input.title }); return { success: true }; },
    "archive.removeReminder": (input) => { const i = settings.reminders.findIndex((r) => r.id === input.id); if (i >= 0) settings.reminders.splice(i, 1); return { success: true }; },
    "ai.extractInvoice": () => ({ invoiceNumber: "INV-2305", invoiceDate: days(0), clientName: "شركة الأفق للتجارة", taxNumber: "300012345600003", grossAmount: 1150, category: "خدمات استشارية" }),
    "activity.list": () => activity,
    "backups.list": () => backups,
    "backups.create": () => { const b = { id: nextId++, fileName: `invoice-archive-${days(0)}.zip`, createdAt: new Date().toISOString(), invoiceCount: invoices.length, balanceCount: balances.length, sizeBytes: 190000 }; backups.unshift(b); log("backup.created", "backup", { fileName: b.fileName }); return { id: b.id }; },
    "backups.download": () => ({ url: "about:blank" }),
    "backups.restore": () => ({ invoices: 0, balances: 0, skipped: invoices.length + balances.length }),
    "notifications.options": () => ({ publicKey: "demo", subscriptions: 1, backgroundDeliveryReady: false, scheduleNeedsOwner: false, isProduction: false, canActivateSchedule: false }),
    "notifications.subscribe": () => ({ success: true }),
    "notifications.unsubscribe": () => ({ success: true }),
    "notifications.activateSchedule": () => ({ success: true }),
  }, { "/api/backups/restore-upload": () => ({ success: true, invoices: 0, balances: 0, skipped: 0 }) });
})();
