/**
 * DatePicker - Date input with calendar UI
 * TODO: Implement custom calendar picker
 */
const DatePicker = (() => {
  function render({ id, label, value, field }) {
    return `
      <div class="form-group">
        <label class="form-label" for="${id}">${label}</label>
        <input type="date" class="form-input form-date" id="${id}" value="${value}" data-field="${field}">
      </div>
    `;
  }
  return { render };
})();