/**
 * SwagatakankshiSection — Welcomers from groom & bride side
 * Swagatakankshi = those who welcome guests
 */
const SwagatakankshiSection = {
  id: 'swagatakankshi',
  label: 'Swagatakankshi',
  sublabel: 'स्वागताकांक्षी',
  icon: '🤝',

  render() {
    const data = AppState.getCard().swagatakankshi || { groomSide: [], brideSide: [] };
    const groomList = data.groomSide || [];
    const brideList = data.brideSide || [];
    const esc = (s) => s ? String(s).replace(/"/g,'&quot;') : '';

    const renderList = (list, side) => list.map((p, i) => `
      <div class="person-entry">
        <div class="person-entry-info">
          <div class="person-entry-name">${esc(p.name)}</div>
          <div class="person-entry-role">${esc(p.relation)}</div>
        </div>
        <button class="person-entry-remove" data-remove-swagat="${side}" data-remove-idx="${i}">✕</button>
      </div>
    `).join('');

    return `
      <div class="section-body">
        <p style="font-size:0.72rem;color:var(--text-muted);margin-bottom:12px;line-height:1.5">
          People who will welcome guests at the ceremony.
        </p>

        <div class="section-divider">
          <span class="section-divider-label">Groom's Side</span>
          <span class="section-divider-line"></span>
        </div>
        <div id="swagat-groom-list">
          ${renderList(groomList, 'groom') || '<p style="font-size:0.75rem;color:var(--text-hint)">None added.</p>'}
        </div>
        <div class="form-row" style="margin-top:6px">
          <div class="form-group" style="margin-bottom:0"><input type="text" class="form-input" id="swagat-groom-name" placeholder="Name"></div>
          <div class="form-group" style="margin-bottom:0"><input type="text" class="form-input" id="swagat-groom-rel" placeholder="Relation"></div>
        </div>
        <button class="section-add-btn" id="btn-add-swagat-groom" style="margin-top:6px">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add (Groom's)
        </button>

        <div class="section-divider" style="margin-top:16px">
          <span class="section-divider-label">Bride's Side</span>
          <span class="section-divider-line"></span>
        </div>
        <div id="swagat-bride-list">
          ${renderList(brideList, 'bride') || '<p style="font-size:0.75rem;color:var(--text-hint)">None added.</p>'}
        </div>
        <div class="form-row" style="margin-top:6px">
          <div class="form-group" style="margin-bottom:0"><input type="text" class="form-input" id="swagat-bride-name" placeholder="Name"></div>
          <div class="form-group" style="margin-bottom:0"><input type="text" class="form-input" id="swagat-bride-rel" placeholder="Relation"></div>
        </div>
        <button class="section-add-btn" id="btn-add-swagat-bride" style="margin-top:6px">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add (Bride's)
        </button>
      </div>
    `;
  },

  bindEvents() {
    const addTo = (side) => {
      const nameEl = document.getElementById(`swagat-${side}-name`);
      const relEl = document.getElementById(`swagat-${side}-rel`);
      const name = nameEl?.value.trim();
      if (!name) { Toast.show('Enter name', 'warning'); return; }
      const data = AppState.getCard().swagatakankshi;
      data[side === 'groom' ? 'groomSide' : 'brideSide'].push({ name, relation: relEl?.value.trim() || '' });
      AppState.update('card.swagatakankshi', data);
      LeftPanel.refresh();
      Accordion.open('swagatakankshi');
    };

    document.getElementById('btn-add-swagat-groom')?.addEventListener('click', () => addTo('groom'));
    document.getElementById('btn-add-swagat-bride')?.addEventListener('click', () => addTo('bride'));

    document.querySelectorAll('[data-remove-swagat]').forEach(btn => {
      btn.addEventListener('click', () => {
        const side = btn.dataset.removeSwagat;
        const idx = parseInt(btn.dataset.removeIdx);
        const data = AppState.getCard().swagatakankshi;
        const key = side === 'groom' ? 'groomSide' : 'brideSide';
        data[key].splice(idx, 1);
        AppState.update('card.swagatakankshi', data);
        LeftPanel.refresh();
        Accordion.open('swagatakankshi');
      });
    });
  }
};