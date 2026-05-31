/**
 * Validators - Input validation utilities
 */
const Validators = (() => {
  function isNonEmpty(value) {
    return typeof value === 'string' && value.trim().length > 0;
  }
  function isPhone(value) {
    return /^[+]?[0-9\s\-]{7,15}$/.test(value.trim());
  }
  function isDate(value) {
    return /^\d{4}-\d{2}-\d{2}$/.test(value);
  }
  function maxLength(value, max) {
    return value.length <= max;
  }
  return { isNonEmpty, isPhone, isDate, maxLength };
})();
