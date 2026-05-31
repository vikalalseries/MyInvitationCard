/**
 * DateService - Date calculations and formatting
 */
const DateService = (() => {
  function format(dateStr, locale = 'en-IN') {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    } catch (e) { return dateStr; }
  }
  function formatShort(dateStr) {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch (e) { return dateStr; }
  }
  function getDayName(dateStr) {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString('en-IN', { weekday: 'long' });
    } catch (e) { return ''; }
  }
  return { format, formatShort, getDayName };
})();
