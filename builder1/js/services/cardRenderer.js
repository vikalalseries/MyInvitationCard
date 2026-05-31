/**
 * CardRenderer Service - High-level render coordinator
 * Note: Component-level rendering is in components/centerCanvas/cardRenderer.js
 */
const CardRendererService = (() => {
  function renderToCanvas(cardEl) {
    // Renders card element to HTML5 canvas
    if (typeof html2canvas !== 'undefined') {
      return html2canvas(cardEl, { scale: 2, useCORS: true });
    }
    return Promise.reject(new Error('html2canvas not available'));
  }
  return { renderToCanvas };
})();
