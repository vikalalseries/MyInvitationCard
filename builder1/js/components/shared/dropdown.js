/**
 * Dropdown - Custom dropdown/select component
 * TODO: Implement searchable dropdown
 */
const Dropdown = (() => {
  function render({ id, label, options, selected, field }) {
    const opts = options.map(o => `<option value="${o.value}" ${o.value === selected ? 'selected' : ''}>${o.label}</option>`).join('');
    return `
      <div class="form-group">
        <label class="form-label" for="${id}">${label}</label>
        <select class="form-select" id="${id}" data-field="${field}">${opts}</select>
      </div>
    `;
  }
  return { render };
})();