/**
 * Loader - Loading spinner component
 */
const Loader = (() => {
  function show(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = '<div class="loader-spinner"></div>';
  }
  function hide(containerId) {
    const el = document.getElementById(containerId);
    if (el) el.innerHTML = '';
  }
  return { show, hide };
})();