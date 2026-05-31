/**
 * CardRenderer — Renders/updates the invitation card DOM
 * Called whenever state changes to keep preview in sync
 */
const CardRenderer = (() => {

  const CORNER_SVG = `
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 2 L2 18" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" opacity="0.8"/>
      <path d="M2 2 L18 2" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" opacity="0.8"/>
      <path d="M2 8 Q9 8 9 2" stroke="currentColor" stroke-width="0.7" fill="none" opacity="0.5"/>
      <circle cx="2" cy="2" r="2" fill="currentColor" opacity="0.7"/>
      <circle cx="11" cy="11" r="1.2" fill="currentColor" opacity="0.35"/>
      <circle cx="18" cy="2" r="1" fill="currentColor" opacity="0.3"/>
      <circle cx="2" cy="18" r="1" fill="currentColor" opacity="0.3"/>
    </svg>
  `;

  /** Full card re-render */
  function render() {
    const card = AppState.getCard();
    const style = card.style;

    const el = document.getElementById('invitation-card');
    if (!el) return;

    // Update template class
    const templates = ['wedding', 'nikah', 'birthday', 'anniversary', 'corporate'];
    templates.forEach(t => el.classList.remove(`template-${t}`));
    el.classList.add(`template-${card.templateId || 'wedding'}`);

    // Apply font
    el.style.fontFamily = getFontFamily(style.font);

    // Apply custom colors via CSS variables
    el.style.setProperty('--card-accent', style.primaryColor || '#c9a84c');
    el.style.setProperty('--card-text', style.textColor || '#2a1f14');

    // Render card content
    el.innerHTML = buildCardHTML(card);
  }

  function buildCardHTML(card) {
    const style = card.style;
    const showDecorations = style.showDecorations !== false;
    const showParents = style.showParentNames !== false;
    const showCity = style.showCity === true;

    const esc = (s) => s ? String(s).replace(/</g,'&lt;').replace(/>/g,'&gt;') : '';

    return `
      ${showDecorations ? `
        <div class="card-border"></div>
        <div class="card-corner tl">${CORNER_SVG}</div>
        <div class="card-corner tr">${CORNER_SVG}</div>
        <div class="card-corner bl">${CORNER_SVG}</div>
        <div class="card-corner br">${CORNER_SVG}</div>
      ` : ''}

      <div class="card-inner">

        <!-- Ceremony tag -->
        <div class="card-ceremony-tag">
          ${getTemplateTag(card.templateId)}
        </div>

        <!-- Names -->
        <div class="card-names-section">

          <!-- Groom -->
          <div class="card-person groom">
            <div class="card-main-name">${esc(card.groom.name) || 'Groom Name'}</div>
            ${showParents && (card.groom.fatherName || card.groom.motherName) ? `
              <div class="card-parents">${formatParents(card.groom)}</div>
            ` : ''}
            ${showCity && card.groom.city ? `
              <div class="card-city">${esc(card.groom.city)}</div>
            ` : ''}
          </div>

          <!-- & divider -->
          <div class="card-and-block">
            <div class="card-divider-ornament">
              <div class="ornament-line"></div>
              <div class="ornament-symbol">❋</div>
              <div class="ornament-line"></div>
            </div>
            <div class="card-amp">&amp;</div>
            <div class="card-divider-ornament">
              <div class="ornament-line"></div>
              <div class="ornament-symbol">❋</div>
              <div class="ornament-line"></div>
            </div>
          </div>

          <!-- Bride -->
          <div class="card-person bride">
            <div class="card-main-name">${esc(card.bride.name) || 'Bride Name'}</div>
            ${showParents && (card.bride.fatherName || card.bride.motherName) ? `
              <div class="card-parents">${formatParents(card.bride)}</div>
            ` : ''}
            ${showCity && card.bride.city ? `
              <div class="card-city">${esc(card.bride.city)}</div>
            ` : ''}
          </div>

        </div>

        <!-- Divider -->
        <div class="card-main-divider">
          <div class="divider-line"></div>
          <div class="divider-icon">✦</div>
          <div class="divider-line"></div>
        </div>

        <!-- Vinit message -->
        ${card.vinit ? `
          <div class="card-vinit-block">
            <div class="card-vinit-text">${esc(card.vinit)}</div>
          </div>
        ` : ''}

        <!-- Events -->
        ${card.events && card.events.length > 0 ? `
          <div class="card-events-section">
            ${card.events.map((evt, i) => `
              ${i > 0 ? '<div class="card-event-sep">• • •</div>' : ''}
              <div class="card-event">
                <div class="card-event-name">${esc(evt.name)}</div>
                ${evt.date || evt.time ? `
                  <div class="card-event-meta">
                    ${evt.date ? `<span>${formatDate(evt.date)}</span>` : ''}
                    ${evt.date && evt.time ? '<span>•</span>' : ''}
                    ${evt.time ? `<span>${esc(evt.time)}</span>` : ''}
                  </div>
                ` : ''}
                ${evt.venue ? `<div class="card-event-venue">${esc(evt.venue)}</div>` : ''}
                ${evt.address ? `<div class="card-event-address">${esc(evt.address)}</div>` : ''}
              </div>
            `).join('')}
          </div>
        ` : ''}

        <!-- RSVP -->
        ${card.rsvpContact ? `
          <div class="card-rsvp-block">
            <div class="card-rsvp-text">
              ${card.rsvpName ? `${esc(card.rsvpName)} — ` : ''}RSVP: ${esc(card.rsvpContact)}
            </div>
          </div>
        ` : ''}

      </div>
    `;
  }

  // ── Helpers ──────────────────────────────────

  function formatParents(person) {
    const parts = [];
    if (person.fatherName) parts.push(person.fatherName);
    if (person.motherName) parts.push(person.motherName);
    return parts.join(' &amp; ');
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    } catch (e) { return dateStr; }
  }

  function getFontFamily(font) {
    const map = {
      'Cinzel': "'Cinzel', serif",
      'Cormorant': "'Cormorant Garamond', serif",
      'Dancing': "'Dancing Script', cursive",
      'Playfair': "'Playfair Display', serif",
      'Raleway': "'Raleway', sans-serif",
      'Montserrat': "'Montserrat', sans-serif",
    };
    return map[font] || map['Cinzel'];
  }

  function getTemplateTag(templateId) {
    const tags = {
      wedding: '🙏 Vivah Nimantran • विवाह निमंत्रण',
      nikah: '☪ Nikah Nimantran • نكاح',
      birthday: '🎂 Birthday Invitation',
      anniversary: '❤ Anniversary Celebration',
      corporate: '📋 Formal Invitation',
    };
    return tags[templateId] || tags.wedding;
  }

  return { render, buildCardHTML };
})();
