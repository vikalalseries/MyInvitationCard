/**
 * VinitSection — Invitation message / request text
 */
const VinitSection = {
  id: 'vinit',
  label: 'Vinit / Message',
  sublabel: 'विनित',
  icon: '🙏',

  render() {
    const vinit = AppState.getCard().vinit;
    const rsvp = AppState.getCard().rsvpContact;
    const rsvpName = AppState.getCard().rsvpName;
    const esc = (s) => s ? String(s).replace(/</g,'&lt;').replace(/>/g,'&gt;') : '';

    return `
      <div class="section-body">

        <div class="form-group">
          <label class="form-label" for="vinit-text">Invitation Message <small style="opacity:0.6;font-size:0.62rem;font-weight:400">(हिंदी/English)</small></label>
          <textarea class="form-textarea form-textarea-hindi" id="vinit-text"
            rows="3"
            placeholder="e.g. आपकी उपस्थिति हमारे लिए सौभाग्य की बात होगी।"
            data-field="vinit">${esc(vinit)}</textarea>
          <span class="form-hint">This text appears on the card as the invitation request.</span>
        </div>

        <div class="section-divider">
          <span class="section-divider-label">RSVP</span>
          <span class="section-divider-line"></span>
        </div>

        <div class="form-group">
          <label class="form-label" for="rsvp-contact">RSVP Contact Number</label>
          <input type="tel" class="form-input" id="rsvp-contact"
            value="${esc(rsvp)}"
            placeholder="e.g. +91 98765 43210"
            data-field="rsvpContact">
        </div>

        <div class="form-group">
          <label class="form-label" for="rsvp-name">RSVP Contact Name <small style="opacity:0.6">(optional)</small></label>
          <input type="text" class="form-input" id="rsvp-name"
            value="${esc(rsvpName)}"
            placeholder="e.g. Ramesh Kumar"
            data-field="rsvpName">
        </div>

      </div>
    `;
  }
};