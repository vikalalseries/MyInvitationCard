/**
 * PrintService - Print handling
 */
const PrintService = (() => {
  function print() {
    window.print();
  }
  return { print };
})();
