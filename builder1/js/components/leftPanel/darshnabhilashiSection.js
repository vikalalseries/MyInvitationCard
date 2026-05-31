/**
 * DarshnabhilashiSection — Well-wishers / Family elders section
 * Darshnabhilashi = those who wish to see / bless
 */
const DarshnabhilashiSection = {
  id: 'darshnabhilashi',
  label: 'Darshnabhilashi',
  sublabel: 'दर्शनाभिलाषी',
  icon: '👴',

  render() {
    const list = AppState.getCard().darshnabhilashi || [];
    const esc = (s) => s ? String(s).replace(/"/g,'&quot;') : '';

    const listHTML = list.map((person, i) => `
      <div class="person-entry" id="darsh-entry-${i}">
        <div class="person-entry-info">
          <div class="person-entry-name">${esc(person.name)}</div>
          <div class="person-entry-role">${esc(person.relation)}</div>
        </div>
        <button class="person-entry-remove" data-remove-darsh="${i}">✕</button>
      </div>
    `).join('');

    return `
      <div class="section-body">
        <p style="font-size:0.72rem;color:var(--text-muted);margin-bottom:12px;line-height:1.5">
          Family elders and well-wishers whose blessings are sought.
        </p>
        <div id="darsh-list">
          ${listHTML || '<p style="font-size:0.75rem;color:var(--text-hint)">None added yet.</p>'}
        </div>
        <div class="form-row" style="margin-top:8px">
          <div class="form-group" style="margin-bottom:0">
            <input type="text" class="form-input" id="darsh-new-name" placeholder="Full Name">
          </div>
          <div class="form-group" style="margin-bottom:0">
            <input type="text" class="form-input" id="darsh-new-relation" placeholder="Relation">
          </div>
        </div>
        <button class="section-add-btn" id="btn-add-darsh" style="margin-top:8px">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Person
        </button>
      </div>
    `;
  },

  bindEvents() {
    document.getElementById('btn-add-darsh')?.addEventListener('click', () => {
      const name = document.getElementById('darsh-new-name')?.value.trim();
      const relation = document.getElementById('darsh-new-relation')?.value.trim();
      if (!name) { Toast.show('Please enter a name', 'warning'); return; }
      const list = AppState.getCard().darshnabhilashi;
      list.push({ name, relation });
      AppState.update('card.darshnabhilashi', list);
      LeftPanel.refresh();
      Accordion.open('darshnabhilashi');
    });
    document.querySelectorAll('[data-remove-darsh]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.removeDarsh);
        const list = AppState.getCard().darshnabhilashi;
        list.splice(idx, 1);
        AppState.update('card.darshnabhilashi', list);
        LeftPanel.refresh();
        Accordion.open('darshnabhilashi');
      });
    });
  }
};