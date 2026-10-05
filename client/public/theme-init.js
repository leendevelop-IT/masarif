// Runs before the first paint: applies the saved theme and language so the
// page never flashes the wrong colours or direction. Kept as a file (not an
// inline script) because the production Content-Security-Policy only allows
// scripts served from this origin.
(function () {
  try {
    var stored = localStorage.getItem("masarif.theme");
    var dark = stored
      ? stored === "dark"
      : window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (dark) document.documentElement.classList.add("dark");
    var language = localStorage.getItem("masarif.language");
    if (language === "en") {
      document.documentElement.lang = "en";
      document.documentElement.dir = "ltr";
    }
  } catch (e) {
    // Storage can be unavailable (private mode); the app applies the defaults.
  }
})();
