/**
 * AdvancedSection — Advanced card settings
 * Card size, additional info, RSVP settings
 */
const AdvancedSection = {
  id: 'advanced',
  label: 'Advanced',
  sublabel: 'अतिरिक्त सेटिंग',
  icon: '⚙️',

  render() {
    const card = AppState.getCard();
    const style = card.style;

    return `
      <div class="section-body">

        <div class="section-divider" style="margin-top:0">
          <span class="section-divider-label">Card Size</span>
          <span class="section-divider-line"></span>
        </div>

        <div style="display:flex;gap:8px;margin-bottom:16px">
          ${['portrait', 'landscape', 'square'].map(size => `
            <button class="btn btn-sm ${style.cardSize === size ? 'btn-primary' : 'btn-outline'}"
              data-card-size="${size}" style="flex:1;text-transform:capitalize">
              ${size}
            </button>
          `).join('')}
        </div>

        <div class="section-divider">
          <span class="section-divider-label">Display Options</span>
          <span class="section-divider-line"></span>
        </div>

        <div class="form-toggle-wrap">
          <span class="form-toggle-label">Show Parent Names</span>
          <label class="form-toggle">
            <input type="checkbox" id="toggle-parents" ${style.showParentNames ? 'checked' : ''} data-toggle-field="showParentNames">
            <span class="form-toggle-track"></span>
          </label>
        </div>

        <div class="form-toggle-wrap">
          <span class="form-toggle-label">Show City / Place</span>
          <label class="form-toggle">
            <input type="checkbox" id="toggle-city" ${style.showCity ? 'checked' : ''} data-toggle-field="showCity">
            <span class="form-toggle-track"></span>
          </label>
        </div>

        <div class="form-toggle-wrap">
          <span class="form-toggle-label">Show Decorations</span>
          <label class="form-toggle">
            <input type="checkbox" id="toggle-decorations" ${style.showDecorations ? 'checked' : ''} data-toggle-field="showDecorations">
            <span class="form-toggle-track"></span>
          </label>
        </div>

        <div class="section-divider">
          <span class="section-divider-label">Actions</span>
          <span class="section-divider-line"></span>
        </div>

        <div style="display:flex;flex-direction:column;gap:8px">
          <button class="btn btn-outline btn-full" id="btn-reset-card">
            🔄 Reset to Defaults
          </button>
        </div>

      </div>
    `;
  },

  bindEvents() {
    // Card size buttons
    document.querySelectorAll('[data-card-size]').forEach(btn => {
      btn.addEventListener('click', () => {
        AppState.updateStyle('cardSize', btn.dataset.cardSize);
        // Refresh this section
        LeftPanel.refresh();
        Accordion.open('advanced');
      });
    });

    // Toggle checkboxes
    document.querySelectorAll('[data-toggle-field]').forEach(input => {
      input.addEventListener('change', () => {
        AppState.updateStyle(input.dataset.toggleField, input.checked);
      });
    });

    // Reset
    document.getElementById('btn-reset-card')?.addEventListener('click', () => {
      if (confirm('Reset all card data to defaults?')) {
        AppState.reset();
        Toast.show('Card reset to defaults', 'info');
      }
    });
  }
};