/**
 * ExportDialog - Download/export options modal
 * TODO: Implement export options UI
 */
const ExportDialog = (() => {
  function open() {
    Modal.open(`
      <div class="modal-header"><h3>Export Card</h3><button onclick="Modal.close()">✕</button></div>
      <div class="modal-body">
        <button class="btn btn-primary" onclick="ExportService.downloadPNG(); Modal.close()">Download PNG</button>
        <button class="btn btn-outline" onclick="ExportService.downloadPDF(); Modal.close()">Download PDF</button>
      </div>
    `);
  }
  return { open };
})();
