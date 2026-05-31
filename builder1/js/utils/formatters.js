/**
 * Formatters - Text and date formatting utilities
 */
const Formatters = (() => {
  function formatDate(dateStr) {
    return DateService.format(dateStr);
  }
  function formatPhoneDisplay(phone) {
    return phone.replace(/(\d{5})(\d{5})/, '$1 $2');
  }
  function titleCase(str) {
    return str.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
  }
  function truncate(str, max = 50) {
    return str.length > max ? str.substring(0, max) + '...' : str;
  }
  return { formatDate, formatPhoneDisplay, titleCase, truncate };
})();
