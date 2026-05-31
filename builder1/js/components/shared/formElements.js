/**
 * FormElements - Reusable form input components
 * TODO: Implement custom form element builders
 */
const FormElements = (() => {
  function textInput({ id, label, value = '', placeholder = '', field }) {
    return `
      <div class="form-group">
        <label class="form-label" for="${id}">${label}</label>
        <input type="text" class="form-input" id="${id}" value="${value}" placeholder="${placeholder}" data-field="${field}">
      </div>
    `;
  }

  function textareaInput({ id, label, value = '', placeholder = '', field, rows = 3 }) {
    return `
      <div class="form-group">
        <label class="form-label" for="${id}">${label}</label>
        <textarea class="form-textarea" id="${id}" rows="${rows}" placeholder="${placeholder}" data-field="${field}">${value}</textarea>
      </div>
    `;
  }

  return { textInput, textareaInput };
})();