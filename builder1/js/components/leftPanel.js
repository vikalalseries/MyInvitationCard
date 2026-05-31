/**
 * LeftPanel — Main left panel controller
 * Renders the accordion with all sections and wires live input updates
 */
const LeftPanel = (() => {

  // Sections in display order
  const SECTIONS = [
    GroomSection,
    BrideSection,
    EventsSection,
    BalAagrahSection,
    DarshnabhilashiSection,
    SwagatakankshiSection,
    VinitSection,
    AdvancedSection,
  ];

  function render() {
    const el = document.getElementById('left-panel');
    if (!el) return;

    el.innerHTML = `
      <div class="left-panel-header">
        <span class="left-panel-title">Card Content</span>
      </div>
      <div class="accordion" id="main-accordion" role="list">
        ${SECTIONS.map(s => Accordion.renderItem(s)).join('')}
      </div>
    `;

    // Bind accordion toggles
    Accordion.bindAll();

    // Bind section-specific events (add/remove buttons)
    SECTIONS.forEach(section => {
      if (typeof section.bindEvents === 'function') {
        try { section.bindEvents(); } catch (e) {
          console.warn(`[LeftPanel] bindEvents failed for ${section.id}:`, e);
        }
      }
    });

    // Live input → state update
    bindLiveInputs();
  }

  /** Bind all data-field inputs for live card preview update */
  function bindLiveInputs() {
    const accordion = document.getElementById('main-accordion');
    if (!accordion) return;

    accordion.addEventListener('input', (e) => {
      const target = e.target;
      const field = target.dataset.field;
      if (!field) return;

      // Update state via dot notation
      AppState.updateCard(field, target.value);
    });

    accordion.addEventListener('change', (e) => {
      const target = e.target;
      const field = target.dataset.field;
      if (!field) return;
      AppState.updateCard(field, target.value);
    });
  }

  /** Full refresh — re-renders everything */
  function refresh() {
    render();
  }

  function init() {
    render();
  }

  return { init, render, refresh };
})();