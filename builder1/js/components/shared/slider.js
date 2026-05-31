/**
 * Slider - Range input slider component
 * TODO: Implement custom styled slider
 */
const Slider = (() => {
  function render({ id, label, min, max, value, step = 1, field }) {
    return `
      <div class="form-group">
        <label class="form-label">${label} <span class="slider-val" id="${id}-val">${value}</span></label>
        <input type="range" class="form-slider" id="${id}" min="${min}" max="${max}" value="${value}" step="${step}" data-field="${field}">
      </div>
    `;
  }
  return { render };
})();