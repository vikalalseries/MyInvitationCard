/**
 * EventsSection — Ceremonies & Events accordion section
 * Supports adding/removing multiple events
 */
const EventsSection = {
  id: 'events',
  label: 'Events / Ceremonies',
  sublabel: 'कार्यक्रम',
  icon: '📅',

  render() {
    const events = AppState.getCard().events;
    const esc = (s) => s ? String(s).replace(/"/g,'&quot;') : '';

    const eventsHTML = events.map(evt => `
      <div class="event-entry" id="event-entry-${evt.id}">
        <div class="event-entry-header">
          <span class="event-entry-name">${esc(evt.name) || 'Unnamed Event'}</span>
          <button class="event-entry-remove icon-btn danger" data-remove-event="${evt.id}" title="Remove event">✕</button>
        </div>
        <div class="event-entry-body">
          <div class="form-group">
            <label class="form-label" for="evt-name-${evt.id}">Ceremony Name</label>
            <input type="text" class="form-input" id="evt-name-${evt.id}"
              value="${esc(evt.name)}"
              placeholder="e.g. Vivah Samaroh"
              data-event-id="${evt.id}" data-event-field="name">
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label" for="evt-date-${evt.id}">Date</label>
              <input type="date" class="form-input form-date" id="evt-date-${evt.id}"
                value="${esc(evt.date)}"
                data-event-id="${evt.id}" data-event-field="date">
            </div>
            <div class="form-group">
              <label class="form-label" for="evt-time-${evt.id}">Time</label>
              <input type="text" class="form-input" id="evt-time-${evt.id}"
                value="${esc(evt.time)}"
                placeholder="e.g. 10:00 AM"
                data-event-id="${evt.id}" data-event-field="time">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label" for="evt-venue-${evt.id}">Venue Name</label>
            <input type="text" class="form-input" id="evt-venue-${evt.id}"
              value="${esc(evt.venue)}"
              placeholder="e.g. Ram Barat Ghar"
              data-event-id="${evt.id}" data-event-field="venue">
          </div>
          <div class="form-group">
            <label class="form-label" for="evt-address-${evt.id}">Address</label>
            <input type="text" class="form-input" id="evt-address-${evt.id}"
              value="${esc(evt.address)}"
              placeholder="e.g. Civil Lines, Lucknow, UP"
              data-event-id="${evt.id}" data-event-field="address">
          </div>
        </div>
      </div>
    `).join('');

    return `
      <div class="section-body">
        <div id="events-list">
          ${eventsHTML.length ? eventsHTML : '<p style="font-size:0.78rem;color:var(--text-muted);padding:8px 0">No events added yet.</p>'}
        </div>
        <button class="section-add-btn" id="btn-add-event">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Ceremony
        </button>
      </div>
    `;
  },

  bindEvents() {
    // Add event button
    document.getElementById('btn-add-event')?.addEventListener('click', () => {
      AppState.addEvent({ name: 'New Ceremony', date: '', time: '', venue: '', address: '' });
      LeftPanel.refresh();
      // Re-open events section
      Accordion.open('events');
    });

    // Remove event buttons
    document.querySelectorAll('[data-remove-event]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.removeEvent;
        AppState.removeEvent(id);
        // Remove DOM element directly for smooth UX
        document.getElementById(`event-entry-${id}`)?.remove();
        EventBus.emit('preview:refresh');
      });
    });

    // Event field inputs (live update)
    document.querySelectorAll('[data-event-id]').forEach(input => {
      input.addEventListener('input', () => {
        const id = input.dataset.eventId;
        const field = input.dataset.eventField;
        AppState.updateEvent(id, field, input.value);

        // Update event entry header name preview
        if (field === 'name') {
          const header = document.querySelector(`#event-entry-${id} .event-entry-name`);
          if (header) header.textContent = input.value || 'Unnamed Event';
        }
      });
    });
  }
};