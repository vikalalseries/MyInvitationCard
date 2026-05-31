/**
 * Topbar Component
 * Renders the dark top navigation bar with logo, template badge,
 * panel toggle button, save, and download dropdown
 */
const Topbar = (() => {

  function render() {
    const el = document.getElementById('topbar');
    if (!el) return;

    el.innerHTML = `
      <div class="topbar-inner">

        <!-- Left group -->
        <div class="topbar-left">
          <a href="../index.html" class="topbar-back" title="Back to Home">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
            <span>Back</span>
          </a>

          <div class="topbar-divider"></div>

          <a href="../index.html" class="topbar-logo">
            My<span>Invitation</span>Card
          </a>

          <div class="topbar-template-badge">
            <span class="topbar-template-dot"></span>
            <span id="topbar-template-name">Wedding Invitation</span>
          </div>
        </div>

        <!-- Right group -->
        <div class="topbar-right">

          <!-- Undo / Redo (placeholder) -->
          <button class="topbar-btn topbar-btn-ghost" id="btn-undo" title="Undo (Ctrl+Z)" disabled>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <path d="M3 7v6h6"/><path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13"/>
            </svg>
          </button>
          <button class="topbar-btn topbar-btn-ghost" id="btn-redo" title="Redo (Ctrl+Y)" disabled>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <path d="M21 7v6h-6"/><path d="M3 17a9 9 0 019-9 9 9 0 016 2.3L21 13"/>
            </svg>
          </button>

          <div class="topbar-sep"></div>

          <!-- Design Panel toggle -->
          <button class="topbar-btn topbar-btn-panel" id="btn-toggle-panel" title="Open Design Panel">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <line x1="9" y1="3" x2="9" y2="21"/>
              <line x1="9" y1="8" x2="21" y2="8"/>
              <line x1="9" y1="13" x2="21" y2="13"/>
              <line x1="9" y1="18" x2="21" y2="18"/>
            </svg>
            <span>Design</span>
          </button>

          <!-- Save -->
          <button class="topbar-btn topbar-btn-outline" id="btn-save" title="Save (Ctrl+S)">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
              <polyline points="17,21 17,13 7,13 7,21"/>
              <polyline points="7,3 7,8 15,8"/>
            </svg>
            <span>Save</span>
          </button>

          <!-- Download with dropdown -->
          <div class="topbar-download-wrap" id="topbar-download-wrap">
            <button class="topbar-btn topbar-btn-primary" id="btn-download-toggle">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                <polyline points="7,10 12,15 17,10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              <span>Download</span>
              <svg class="chevron" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </button>

            <div class="topbar-dropdown" id="download-dropdown">
              <button class="dropdown-item" id="btn-dl-png">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21,15 16,10 5,21"/>
                </svg>
                Download PNG
              </button>
              <button class="dropdown-item" id="btn-dl-pdf">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                  <polyline points="14,2 14,8 20,8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                </svg>
                Save as PDF
              </button>
              <div class="dropdown-divider"></div>
              <button class="dropdown-item" id="btn-print">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="6,9 6,2 18,2 18,9"/>
                  <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/>
                  <rect x="6" y="14" width="12" height="8"/>
                </svg>
                Print Card
              </button>
            </div>
          </div>

        </div>
      </div>
    `;

    bindEvents();
  }

  function bindEvents() {
    // Panel toggle
    document.getElementById('btn-toggle-panel')?.addEventListener('click', () => {
      Drawer.toggle();
    });

    // Save
    document.getElementById('btn-save')?.addEventListener('click', () => {
      AppState.saveToStorage();
      Toast.show('Card saved!', 'success');
    });

    // Download dropdown toggle
    document.getElementById('btn-download-toggle')?.addEventListener('click', (e) => {
      e.stopPropagation();
      document.getElementById('topbar-download-wrap')?.classList.toggle('open');
    });

    // Close dropdown on outside click
    document.addEventListener('click', () => {
      document.getElementById('topbar-download-wrap')?.classList.remove('open');
    });

    // Download PNG
    document.getElementById('btn-dl-png')?.addEventListener('click', () => {
      closeDropdown();
      ExportService.downloadPNG();
    });

    // Download PDF
    document.getElementById('btn-dl-pdf')?.addEventListener('click', () => {
      closeDropdown();
      ExportService.downloadPDF();
    });

    // Print
    document.getElementById('btn-print')?.addEventListener('click', () => {
      closeDropdown();
      window.print();
    });

    // Listen for drawer toggle to update button state
    EventBus.on('drawer:opened', () => {
      document.getElementById('btn-toggle-panel')?.classList.add('active');
    });
    EventBus.on('drawer:closed', () => {
      document.getElementById('btn-toggle-panel')?.classList.remove('active');
    });

    // Listen for template change to update badge
    EventBus.on('card:updated', ({ field }) => {
      if (field === 'templateId') updateTemplateBadge();
    });
  }

  function closeDropdown() {
    document.getElementById('topbar-download-wrap')?.classList.remove('open');
  }

  function updateTemplateBadge() {
    const templateId = AppState.getCard().templateId;
    const labels = {
      wedding: 'Wedding Invitation',
      nikah: 'Nikah Invitation',
      birthday: 'Birthday Invitation',
      anniversary: 'Anniversary Card',
      corporate: 'Corporate Invitation',
    };
    const el = document.getElementById('topbar-template-name');
    if (el) el.textContent = labels[templateId] || 'Invitation Card';
  }

  function init() {
    render();
  }

  return { init, render, updateTemplateBadge };
})();