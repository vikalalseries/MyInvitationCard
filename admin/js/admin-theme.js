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

  function updateToggleButtons(theme) {
    const buttons = document.querySelectorAll("#themeToggleBtn, .theme-toggle-btn-admin");
    buttons.forEach((btn) => {
      const icon = btn.querySelector("i");
      if (icon) {
        if (theme === "dark") {
          icon.className = "fa-regular fa-sun";
        } else {
          icon.className = "fa-regular fa-moon";
        }
      }
      btn.setAttribute("aria-label", theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode");
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
    updateToggleButtons(nextTheme);
  }

  function bindThemeButtons() {
    const buttons = document.querySelectorAll("#themeToggleBtn, .theme-toggle-btn-admin");
    buttons.forEach((btn) => {
      if (btn.dataset.themeBound) return;
      btn.dataset.themeBound = "true";

      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const current = getCurrentTheme();
        const next = current === "dark" ? "light" : "dark";
        applyTheme(next);
      });
    });
  }

  // Initial execution
  applyTheme(getCurrentTheme());

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      bindThemeButtons();
      updateToggleButtons(getCurrentTheme());
    });
  } else {
    bindThemeButtons();
    updateToggleButtons(getCurrentTheme());
  }

  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY) {
      applyTheme(e.newValue);
    }
  });

  window.AdminTheme = {
    applyTheme,
    getCurrentTheme
  };
})();
