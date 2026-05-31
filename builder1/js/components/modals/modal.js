/**
 * Modal - Base modal component
 * TODO: Implement reusable modal system
 */
const Modal = (() => {
  let activeModal = null;

  function open(content, options = {}) {
    const container = document.getElementById('modals-container');
    if (!container) return;
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `<div class="modal-box">${content}</div>`;
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
    container.appendChild(modal);
    activeModal = modal;
    requestAnimationFrame(() => modal.classList.add('open'));
  }

  function close() {
    if (!activeModal) return;
    activeModal.classList.remove('open');
    setTimeout(() => { activeModal?.remove(); activeModal = null; }, 300);
  }

  return { open, close };
})();
