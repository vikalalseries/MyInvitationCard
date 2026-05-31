/**
 * GroomSection — Groom information accordion section
 */
const GroomSection = {
  id: 'groom',
  label: 'Groom / Dulha',
  sublabel: 'वर पक्ष',
  icon: '🤵',

  render() {
    const g = AppState.getCard().groom;
    return `
      <div class="section-body">

        <div class="form-group">
          <label class="form-label" for="groom-name">Groom's Name <small style="opacity:0.6;font-size:0.62rem;font-weight:400">(वर का नाम)</small></label>
          <input type="text" class="form-input" id="groom-name"
            value="${e(g.name)}"
            placeholder="e.g. Ramesh Kumar Sharma"
            data-field="groom.name">
        </div>

        <div class="section-divider">
          <span class="section-divider-label">Parents</span>
          <span class="section-divider-line"></span>
        </div>

        <div class="form-group">
          <label class="form-label" for="groom-father">Father's Name</label>
          <input type="text" class="form-input" id="groom-father"
            value="${e(g.fatherName)}"
            placeholder="e.g. Shri Ram Prasad Sharma"
            data-field="groom.fatherName">
        </div>

        <div class="form-group">
          <label class="form-label" for="groom-mother">Mother's Name</label>
          <input type="text" class="form-input" id="groom-mother"
            value="${e(g.motherName)}"
            placeholder="e.g. Smt. Kaushalya Devi"
            data-field="groom.motherName">
        </div>

        <div class="form-group">
          <label class="form-label" for="groom-city">City / Place</label>
          <input type="text" class="form-input" id="groom-city"
            value="${e(g.city)}"
            placeholder="e.g. Lucknow"
            data-field="groom.city">
        </div>

      </div>
    `;
  }
};

// Escape helper for section scope
function e(str) {
  if (!str) return '';
  return String(str).replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}