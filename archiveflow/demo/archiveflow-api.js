(function () {
  const days = window.__demoDays;
  const at = window.__demoAt;
  let nextId = 100;
  const me = { id: 1, username: "admin", name: "محمد السالم", role: "admin", status: "active" };
  let signedIn = true;
  const accounts = [
    { ...me },
    { id: 2, username: "noura", name: "نورة القحطاني", role: "followup", status: "active" },
    { id: 3, username: "ahmad", name: "أحمد العتيبي", role: "registration", status: "active" },
    { id: 4, username: "sarah", name: "سارة الحربي", role: "readonly", status: "suspended" },
  ];
  const txs = [
    { id: 1, number: "بلد/وارد/2026/00124", type: "واردة", subject: "طلب اعتماد مخطط تحسين الحديقة العامة", party: "أمانة المنطقة الشرقية", received: days(-10), due: days(1), priority: "عالية", status: "جديدة", department: "الإدارة الهندسية", assignee: "أحمد العتيبي", notes: "يتطلب الرد خلال خمسة أيام عمل.", attachment: "مخطط-الحديقة.pdf", archived: false },
    { id: 2, number: "بلد/صادر/2026/00098", type: "صادرة", subject: "تعميم تنظيم ساعات العمل الشتوية", party: "جميع الإدارات", received: days(-12), due: days(3), priority: "متوسطة", status: "قيد الإجراء", department: "الشؤون الإدارية", assignee: "نورة القحطاني", notes: "بانتظار اعتماد المدير العام.", attachment: "تعميم-الدوام.docx", archived: false },
    { id: 3, number: "بلد/داخلي/2026/00056", type: "داخلية", subject: "محضر اجتماع لجنة المشتريات", party: "إدارة المشتريات", received: days(-14), due: days(-9), priority: "منخفضة", status: "مكتملة", department: "المشتريات", assignee: "سارة الحربي", notes: "تمت الأرشفة بعد اعتماد المحضر.", attachment: "محضر-اللجنة.pdf", archived: true },
    { id: 4, number: "بلد/وارد/2026/00118", type: "واردة", subject: "مطالبة مالية عن أعمال صيانة الطرق", party: "شركة المسار للمقاولات", received: days(-21), due: days(-12), priority: "عالية", status: "متأخرة", department: "المالية", assignee: "خالد الشهري", notes: "مطلوب مراجعة المستخلص النهائي.", attachment: "مطالبة-مالية.pdf", archived: false },
    { id: 5, number: "بلد/وارد/2026/00121", type: "واردة", subject: "دعوة للمشاركة في ملتقى المدن الذكية", party: "وزارة البلديات والإسكان", received: days(-11), due: days(-4), priority: "متوسطة", status: "قيد الإجراء", department: "العلاقات العامة", assignee: "ريم المطيري", notes: "تأكيد أسماء المشاركين.", attachment: "دعوة-الملتقى.pdf", archived: false },
    { id: 6, number: "بلد/صادر/2026/00094", type: "صادرة", subject: "رد على استفسار رخصة محل تجاري", party: "مؤسسة روافد التجارية", received: days(-17), due: days(-10), priority: "منخفضة", status: "مكتملة", department: "التراخيص", assignee: "عبدالله الزهراني", notes: "تم الإرسال عبر منصة المراسلات.", attachment: "الرد-الرسمي.pdf", archived: false },
    { id: 7, number: "بلد/وارد/2026/00119", type: "واردة", subject: "شكوى بشأن إنارة شارع الأمير سلطان", party: "مواطن — عبر منصة بلدي", received: days(-6), due: days(8), priority: "متوسطة", status: "جديدة", department: "الإدارة الهندسية", assignee: "أحمد العتيبي", notes: "", attachment: "", archived: false },
    { id: 8, number: "بلد/داخلي/2026/00057", type: "داخلية", subject: "طلب صيانة أجهزة الحاسب في قسم التراخيص", party: "تقنية المعلومات", received: days(-3), due: days(12), priority: "منخفضة", status: "قيد الإجراء", department: "التراخيص", assignee: "نورة القحطاني", notes: "", attachment: "", archived: false },
  ];
  const history = { 1: [{ id: 11, action: "created", details: "تم إنشاء المعاملة", createdAt: at(-10), actorName: "محمد السالم" }], 4: [{ id: 41, action: "created", details: "تم إنشاء المعاملة", createdAt: at(-21), actorName: "خالد الشهري" }, { id: 42, action: "updated", details: "تم تحديث بيانات المعاملة", createdAt: at(-15, 13), actorName: "محمد السالم" }] };
  const addHistory = (txId, action, details) => { (history[txId] = history[txId] || []).unshift({ id: nextId++, action, details, createdAt: new Date().toISOString(), actorName: me.name }); };
  const backups = [{ id: 1, kind: "manual", fileName: "archive-backup-2026-10-15.json", transactionCount: 6, sizeBytes: 5120, status: "ready", createdAt: at(-8, 7) }];

  window.__demoApi({
    "auth.localMe": () => (signedIn ? me : null),
    "auth.me": () => null,
    "auth.localLogin": () => { signedIn = true; return me; },
    "auth.localLogout": () => { signedIn = false; return { success: true }; },
    "auth.accounts": () => accounts,
    "auth.createAccount": (input) => { if (accounts.some((a) => a.username === input.username)) throw new Error("Duplicate entry"); const account = { id: nextId++, username: input.username, name: input.name, role: input.role, status: input.status }; accounts.push(account); return account; },
    "auth.updateAccount": (input) => { const account = accounts.find((a) => a.id === input.id); if (!account) return null; Object.assign(account, { name: input.name ?? account.name, role: input.role ?? account.role, status: input.status ?? account.status }); return account; },
    "auth.deleteAccount": (input) => { const index = accounts.findIndex((a) => a.id === input.id); if (index >= 0) accounts.splice(index, 1); return { success: true }; },
    "transactions.list": () => txs,
    "transactions.history": (input) => history[input.id] || [],
    "transactions.create": (input) => { const tx = { ...input, id: nextId++, archived: Boolean(input.archived) }; txs.unshift(tx); addHistory(tx.id, "created", "تم إنشاء المعاملة"); return tx; },
    "transactions.update": (input) => { const tx = txs.find((t) => t.id === input.id); if (!tx) return null; Object.assign(tx, input.data); addHistory(tx.id, "updated", "تم تحديث بيانات المعاملة"); return tx; },
    "transactions.archive": (input) => { const tx = txs.find((t) => t.id === input.id); if (!tx) return null; tx.archived = true; tx.status = "مكتملة"; addHistory(tx.id, "archived", "تمت أرشفة المعاملة"); return tx; },
    "transactions.delete": (input) => { const index = txs.findIndex((t) => t.id === input.id); if (index >= 0) txs.splice(index, 1); return undefined; },
    "attachments.upload": () => ({ success: true }),
    "backups.list": () => backups,
    "backups.create": () => { const payload = JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), transactions: txs }); const backup = { id: nextId++, kind: "manual", fileName: `archive-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`, transactionCount: txs.length, sizeBytes: payload.length, status: "ready", createdAt: new Date().toISOString() }; backups.unshift(backup); return { ...backup, payload }; },
    "backups.restore": (input) => { let count = 0; for (const item of input.transactions || []) { if (!txs.some((t) => t.number === item.number)) { txs.push({ ...item, id: nextId++, archived: Boolean(item.archived) }); count++; } } return count; },
  });
})();
