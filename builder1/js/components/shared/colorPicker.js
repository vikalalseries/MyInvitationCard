/**
 * ColorPicker - Inline color swatch picker component
 * TODO: Implement full color picker with custom input
 */
const ColorPicker = (() => {
  function renderSwatches(colors, selectedColor, onChange) {
    // Placeholder
    return colors.map(c => `<div class="color-swatch ${c === selectedColor ? 'active' : ''}" style="background:${c}" data-color="${c}"></div>`).join('');
  }
  return { renderSwatches };
})();