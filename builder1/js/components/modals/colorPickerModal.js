/**
 * ColorPickerModal - Full color picker modal
 * TODO: Implement full color picker with hex input
 */
const ColorPickerModal = (() => {
  function open(currentColor, onSelect) {
    // Placeholder - use native color picker for now
    const input = document.createElement('input');
    input.type = 'color';
    input.value = currentColor || '#c9a84c';
    input.addEventListener('change', (e) => onSelect(e.target.value));
    input.click();
  }
  return { open };
})();
