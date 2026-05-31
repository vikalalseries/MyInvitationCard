/**
 * Helpers - General utility functions
 */
const Helpers = (() => {
  function debounce(fn, delay = 300) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }
  function throttle(fn, limit = 100) {
    let inThrottle;
    return (...args) => {
      if (!inThrottle) {
        fn(...args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }
  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }
  function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }
  function shortId() {
    return Math.random().toString(36).substr(2, 8);
  }
  return { debounce, throttle, deepClone, uuid, shortId };
})();
