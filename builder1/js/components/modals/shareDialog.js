/**
 * ShareDialog - Share options modal
 * TODO: Implement sharing via URL, QR, WhatsApp
 */
const ShareDialog = (() => {
  function open() {
    Modal.open('<div class="modal-header"><h3>Share Card</h3><button onclick="Modal.close()">✕</button></div><div class="modal-body"><p>Share via WhatsApp, copy link, or generate QR code.</p></div>');
  }
  return { open };
})();
