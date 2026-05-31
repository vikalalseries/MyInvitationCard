/**
 * BalAagrahSection — Children of family section
 * Bal Aagrah = children present at the wedding
 */
const BalAagrahSection = {
  id: 'bal-aagrah',
  label: 'Bal Aagrah',
  sublabel: 'बाल आग्रह',
  icon: '👦',

  render() {
    const list = AppState.getCard().balAagrah || [];
    const esc = (s) => s ? String(s).replace(/"/g,'&quot;') : '';

    const listHTML = list.map((person, i) => `
      <div class="person-entry" id="bal-entry-${i}">
        <div class="person-entry-info">
          <div class="person-entry-name">${esc(person.name) || 'Child Name'}</div>
          <div class="person-entry-role">${esc(person.relation) || ''}</div>
        </div>
        <button class="person-entry-remove" data-remove-bal="${i}" title="Remove">✕</button>
      </div>
    `).join('');

    return `
      <div class="section-body">
        <p style="font-size:0.72rem;color:var(--text-muted);margin-bottom:12px;line-height:1.5">
          Add children from groom & bride's family who will be present.
        </p>

        <div id="bal-list">
          ${listHTML || '<p style="font-size:0.75rem;color:var(--text-hint);padding:4px 0">No children added yet.</p>'}
        </div>

        <div class="form-row" style="margin-top:8px" id="bal-add-row">
          <div class="form-group" style="margin-bottom:0">
            <input type="text" class="form-input" id="bal-new-name" placeholder="Child's Name">
          </div>
          <div class="form-group" style="margin-bottom:0">
            <input type="text" class="form-input" id="bal-new-relation" placeholder="Relation">
          </div>
        </div>
        <button class="section-add-btn" id="btn-add-bal" style="margin-top:8px">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Child
        </button>
      </div>
    `;
  },

  bindEvents() {
    document.getElementById('btn-add-bal')?.addEventListener('click', () => {
      const name = document.getElementById('bal-new-name')?.value.trim();
      const relation = document.getElementById('bal-new-relation')?.value.trim();
      if (!name) { Toast.show('Please enter child\'s name', 'warning'); return; }
      const list = AppState.getCard().balAagrah;
      list.push({ name, relation });
      AppState.update('card.balAagrah', list);
      LeftPanel.refresh();
      Accordion.open('bal-aagrah');
    });

    document.querySelectorAll('[data-remove-bal]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.removeBal);
        const list = AppState.getCard().balAagrah;
        list.splice(idx, 1);
        AppState.update('card.balAagrah', list);
        LeftPanel.refresh();
        Accordion.open('bal-aagrah');
      });
    });
  }
};