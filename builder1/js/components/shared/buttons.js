/**
 * Buttons - Reusable button component builders
 */
const Buttons = (() => {
  function primary(text, id, attrs = '') {
    return `<button class="btn btn-primary" id="${id}" ${attrs}>${text}</button>`;
  }
  function outline(text, id, attrs = '') {
    return `<button class="btn btn-outline" id="${id}" ${attrs}>${text}</button>`;
  }
  function ghost(text, id, attrs = '') {
    return `<button class="btn btn-ghost" id="${id}" ${attrs}>${text}</button>`;
  }
  return { primary, outline, ghost };
})();