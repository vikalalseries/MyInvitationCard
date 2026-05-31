/**
 * PrintDialog - Print settings modal
 * TODO: Implement print settings UI
 */
const PrintDialog = (() => {
  function open() {
    window.print();
  }
  return { open };
})();
