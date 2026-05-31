/**
 * FontPicker - Font family selector component
 * TODO: Implement font preview picker
 */
const FontPicker = (() => {
  function render(fonts, selected, field) {
    return fonts.map(f => `
      <div class="font-option ${f.value === selected ? 'active' : ''}" data-font="${f.value}" data-field="${field}" style="font-family: ${f.family}">
        ${f.label}
      </div>
    `).join('');
  }
  return { render };
})();