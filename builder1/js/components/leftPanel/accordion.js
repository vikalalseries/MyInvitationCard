/**
 * Accordion — Manages accordion expand/collapse
 * Used by LeftPanel to render collapsible sections
 */
const Accordion = (() => {

  /** Render a single accordion item */
  function renderItem(section) {
    const isOpen = AppState.isAccordionOpen(section.id);

    return `
      <div class="accordion-item ${isOpen ? 'open' : ''}" data-section-id="${section.id}" id="accordion-${section.id}">
        <button class="accordion-header" data-accordion-toggle="${section.id}" aria-expanded="${isOpen}">
          <div class="accordion-header-left">
            <div class="accordion-section-icon">${section.icon || '📋'}</div>
            <div>
              <div class="accordion-title">${section.label}</div>
              ${section.sublabel ? `<span class="accordion-subtitle">${section.sublabel}</span>` : ''}
            </div>
          </div>
          <svg class="accordion-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </button>
        <div class="accordion-body">
          <div class="accordion-content">
            ${section.render()}
          </div>
        </div>
      </div>
    `;
  }

  /** Bind toggle click events to all accordion headers */
  function bindAll() {
    document.querySelectorAll('[data-accordion-toggle]').forEach(btn => {
      btn.addEventListener('click', () => {
        const sectionId = btn.dataset.accordionToggle;
        toggleSection(sectionId);
      });
    });
  }

  /** Toggle a specific section */
  function toggleSection(sectionId) {
    const item = document.getElementById(`accordion-${sectionId}`);
    if (!item) return;

    const isCurrentlyOpen = item.classList.contains('open');

    // Update state
    AppState.toggleAccordion(sectionId);

    // Toggle CSS class
    item.classList.toggle('open', !isCurrentlyOpen);

    // Update aria-expanded
    const btn = item.querySelector('[data-accordion-toggle]');
    if (btn) btn.setAttribute('aria-expanded', String(!isCurrentlyOpen));
  }

  /** Force-open a section programmatically */
  function open(sectionId) {
    if (!AppState.isAccordionOpen(sectionId)) {
      toggleSection(sectionId);
    }
  }

  /** Force-close a section programmatically */
  function close(sectionId) {
    if (AppState.isAccordionOpen(sectionId)) {
      toggleSection(sectionId);
    }
  }

  return { renderItem, bindAll, toggleSection, open, close };
})();