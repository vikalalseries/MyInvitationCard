(() => {
  document.documentElement.classList.add("theme-preload");
  const STORAGE_KEY = "siteTheme";

  function safeStorageGet() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  }

  function safeStorageSet(value) {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {}
  }

  function normalizeTheme(theme) {
    return theme === "dark" ? "dark" : "light";
  }

  function getCurrentTheme() {
    return normalizeTheme(safeStorageGet());
  }

  function syncThemeButtons(theme) {
    document.querySelectorAll("[data-site-theme]").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.siteTheme === theme);
      btn.setAttribute(
        "aria-pressed",
        btn.dataset.siteTheme === theme ? "true" : "false"
      );
    });
  }

  function applyTheme(theme) {
    const root = document.documentElement;
    const nextTheme = normalizeTheme(theme);

    root.classList.toggle("site-theme-dark", nextTheme === "dark");
    root.dataset.siteTheme = nextTheme;

    requestAnimationFrame(() => {
      document.documentElement.classList.remove("theme-preload");
    });

    safeStorageSet(nextTheme);
    syncThemeButtons(nextTheme);
  }

  function bindThemeButtons() {
    document.querySelectorAll("[data-site-theme]").forEach((btn) => {
      if (btn.dataset.themeBound) return;

      btn.dataset.themeBound = "true";

      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        applyTheme(btn.dataset.siteTheme);
      });
    });
  }

  applyTheme(getCurrentTheme());

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindThemeButtons);
  } else {
    bindThemeButtons();
  }

  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY) {
      applyTheme(e.newValue);
    }
  });

  window.SiteTheme = {
    applyTheme,
    getCurrentTheme
  };
})();