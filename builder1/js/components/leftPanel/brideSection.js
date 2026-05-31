/**
 * BrideSection — Bride information accordion section
 */
const BrideSection = {
  id: 'bride',
  label: 'Bride / Dulhan',
  sublabel: 'वधू पक्ष',
  icon: '👰',

  render() {
    const b = AppState.getCard().bride;
    const esc = (s) => s ? String(s).replace(/"/g,'&quot;') : '';
    return `
      <div class="section-body">

        <div class="form-group">
          <label class="form-label" for="bride-name">Bride's Name <small style="opacity:0.6;font-size:0.62rem;font-weight:400">(वधू का नाम)</small></label>
          <input type="text" class="form-input" id="bride-name"
            value="${esc(b.name)}"
            placeholder="e.g. Sunita Devi Gupta"
            data-field="bride.name">
        </div>

        <div class="section-divider">
          <span class="section-divider-label">Parents</span>
          <span class="section-divider-line"></span>
        </div>

        <div class="form-group">
          <label class="form-label" for="bride-father">Father's Name</label>
          <input type="text" class="form-input" id="bride-father"
            value="${esc(b.fatherName)}"
            placeholder="e.g. Shri Mohan Lal Gupta"
            data-field="bride.fatherName">
        </div>

        <div class="form-group">
          <label class="form-label" for="bride-mother">Mother's Name</label>
          <input type="text" class="form-input" id="bride-mother"
            value="${esc(b.motherName)}"
            placeholder="e.g. Smt. Savitri Devi"
            data-field="bride.motherName">
        </div>

        <div class="form-group">
          <label class="form-label" for="bride-city">City / Place</label>
          <input type="text" class="form-input" id="bride-city"
            value="${esc(b.city)}"
            placeholder="e.g. Agra"
            data-field="bride.city">
        </div>

      </div>
    `;
  }
};