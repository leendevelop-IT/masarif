// Demo API shim: answers the app's tRPC calls from in-memory sample data so the
// redesigned client can be explored without a server. Nothing is persisted.
window.__demoFlash = function flash(message) {
  let bar = document.getElementById("demo-flash");
  if (!bar) {
    bar = document.createElement("div");
    bar.id = "demo-flash";
    bar.setAttribute("role", "status");
    bar.style.cssText = "position:fixed;top:14px;inset-inline-start:50%;transform:translateX(-50%);z-index:300;padding:10px 16px;border-radius:10px;background:#132033;color:#fff;font-size:14px;font-family:inherit;box-shadow:0 10px 30px rgba(0,0,0,.3);max-width:min(92vw,520px);text-align:center";
    document.body.appendChild(bar);
  }
  bar.textContent = message;
  bar.style.display = "block";
  clearTimeout(bar._timer);
  bar._timer = setTimeout(() => { bar.style.display = "none"; }, 3200);
};
window.__demoApi = function install(handlers, extraRoutes = {}) {
  const originalFetch = window.fetch.bind(window);
  // The app is a single-page app that reads location.pathname; when hosted under a
  // deeper path, start it at "/" so its own routes match.
  const appRoutes = ["/", "/archive", "/statistics", "/reminders", "/activity", "/settings", "/register", "/forgot-password", "/transactions", "/reports", "/users"];
  if (!appRoutes.some((route) => location.pathname === route || location.pathname.startsWith(route + "/") && route !== "/")) {
    try { history.replaceState(null, "", "/"); } catch {}
  }
  if (!document.documentElement.getAttribute("dir")) { document.documentElement.setAttribute("dir", "rtl"); document.documentElement.setAttribute("lang", "ar"); }
  // Downloads, printing and new tabs are blocked inside the demo viewer; say so instead of failing silently.
  const blockedNote = window.__demoBlockedNote || "التنزيل والطباعة وفتح الروابط معطلة في النسخة التجريبية، وتعمل في النسخة الحقيقية.";
  window.print = () => window.__demoFlash(blockedNote);
  window.open = () => { window.__demoFlash(blockedNote); return null; };
  const originalClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () { if (this.hasAttribute("download")) { window.__demoFlash(blockedNote); return; } return originalClick.call(this); };
  const unwrap = (raw) => (raw && typeof raw === "object" && "json" in raw ? raw.json : raw);
  window.fetch = async (input, init) => {
    const url = new URL(typeof input === "string" ? input : input.url, location.href);
    for (const [path, handler] of Object.entries(extraRoutes)) {
      if (url.pathname.endsWith(path)) {
        await new Promise((r) => setTimeout(r, 200));
        return new Response(JSON.stringify(await handler()), { status: 200, headers: { "Content-Type": "application/json" } });
      }
    }
    if (!url.pathname.includes("/api/trpc/")) return originalFetch(input, init);
    const names = decodeURIComponent(url.pathname.split("/api/trpc/")[1]).split(",");
    let inputs = {};
    const method = (init && init.method ? init.method : "GET").toUpperCase();
    if (method === "POST") { try { inputs = JSON.parse(init.body || "{}"); } catch {} }
    else if (url.searchParams.get("input")) { try { inputs = JSON.parse(url.searchParams.get("input")); } catch {} }
    const results = await Promise.all(names.map(async (name, index) => {
      const handler = handlers[name];
      const payload = unwrap(inputs ? inputs[index] ?? inputs[String(index)] : undefined);
      if (!handler) return { error: { json: { message: `غير متاح في النسخة التجريبية: ${name}`, code: -32004, data: { code: "NOT_FOUND", httpStatus: 404, path: name } } } };
      try {
        const data = await handler(payload);
        return { result: { data: { json: data === undefined ? null : data } } };
      } catch (error) {
        return { error: { json: { message: error && error.message ? error.message : String(error), code: -32600, data: { code: "BAD_REQUEST", httpStatus: 400, path: name } } } };
      }
    }));
    await new Promise((r) => setTimeout(r, 120));
    return new Response(JSON.stringify(results), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  // Small, unobtrusive reminder that this is a demo with sample data.
  window.addEventListener("DOMContentLoaded", () => {
    const pill = document.createElement("div");
    pill.setAttribute("role", "note");
    pill.textContent = window.__demoNote || "نسخة تجريبية ببيانات افتراضية — لا يُحفظ شيء بعد إغلاق الصفحة";
    pill.style.cssText = "position:fixed;bottom:10px;inset-inline-end:10px;z-index:90;padding:4px 10px;border-radius:999px;background:rgba(19,32,51,.82);color:#fff;font-size:12px;line-height:1.5;font-family:inherit;backdrop-filter:blur(4px);pointer-events:none;max-width:min(80vw,360px);opacity:.9";
    document.body.appendChild(pill);
  });
};
window.__demoDays = (offset) => { const d = new Date(); d.setDate(d.getDate() + offset); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
window.__demoAt = (offsetDays, hour = 9) => { const d = new Date(); d.setDate(d.getDate() + offsetDays); d.setHours(hour, 0, 0, 0); return d.toISOString(); };
