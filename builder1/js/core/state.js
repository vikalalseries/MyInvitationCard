/**
 * AppState — Global state management
 * Single source of truth for all card data and UI state
 */
const AppState = (() => {
  const STORAGE_KEY = 'mic_builder1_state';

  // ── Default State ──────────────────────────────
  const createDefault = () => ({
    card: {
      templateId: 'wedding',

      groom: {
        name: 'Ramesh Kumar Sharma',
        fatherName: 'Shri Ram Prasad Sharma',
        motherName: 'Smt. Kaushalya Devi',
        city: 'Lucknow',
      },

      bride: {
        name: 'Sunita Devi Gupta',
        fatherName: 'Shri Mohan Lal Gupta',
        motherName: 'Smt. Savitri Devi',
        city: 'Agra',
      },

      events: [
        {
          id: 'evt-001',
          name: 'Vivah Samaroh',
          date: '2025-02-15',
          time: '10:00 AM',
          venue: 'Ram Barat Ghar',
          address: 'Civil Lines, Lucknow, Uttar Pradesh',
        }
      ],

      // Bal Aagrah — Children of family present
      balAagrah: [],

      // Darshnabhilashi — Well-wishers / family elders
      darshnabhilashi: [],

      // Swagatakankshi — Welcomers from groom/bride side
      swagatakankshi: {
        groomSide: [],
        brideSide: [],
      },

      // Vinit — Invitation message
      vinit: 'आपकी उपस्थिति हमारे लिए सौभाग्य की बात होगी।',

      // RSVP
      rsvpContact: '+91 98765 43210',
      rsvpName: '',

      // Styling
      style: {
        font: 'Cinzel',
        colorScheme: 'gold-cream',
        primaryColor: '#c9a84c',
        textColor: '#2a1f14',
        bgColor: '#fdf5e8',
        cardSize: 'portrait',
        borderStyle: 'classic',
        showDecorations: true,
        showParentNames: true,
        showCity: false,
      }
    },

    ui: {
      drawerOpen: false,
      drawerTab: 'typography',
      zoom: 85,
      activeAccordions: ['groom'],  // open by default
      isDirty: false,
      lastSaved: null,
    }
  });

  let state = createDefault();

  // ── Helpers ───────────────────────────────────
  function deepGet(obj, path) {
    return path.split('.').reduce((o, k) => (o != null ? o[k] : undefined), obj);
  }

  function deepSet(obj, path, value) {
    const keys = path.split('.');
    let cur = obj;
    for (let i = 0; i < keys.length - 1; i++) {
      if (cur[keys[i]] == null) cur[keys[i]] = {};
      cur = cur[keys[i]];
    }
    cur[keys[keys.length - 1]] = value;
  }

  // ── Public API ────────────────────────────────
  return {
    /** Get full state */
    get() { return state; },

    /** Get card data */
    getCard() { return state.card; },

    /** Get UI state */
    getUI() { return state.ui; },

    /** Get style config */
    getStyle() { return state.card.style; },

    /** Update any state path (dot-notation) */
    update(path, value) {
      deepSet(state, path, value);
      if (!path.startsWith('ui.')) state.ui.isDirty = true;
      EventBus.emit('state:changed', { path, value });
    },

    /** Update card field (shorthand) */
    updateCard(field, value) {
      deepSet(state.card, field, value);
      state.ui.isDirty = true;
      EventBus.emit('card:updated', { field, value });
      EventBus.emit('preview:refresh');
    },

    /** Update style field */
    updateStyle(field, value) {
      state.card.style[field] = value;
      state.ui.isDirty = true;
      EventBus.emit('style:updated', { field, value });
      EventBus.emit('preview:refresh');
    },

    /** Update UI field */
    updateUI(field, value) {
      state.ui[field] = value;
      EventBus.emit('ui:changed', { field, value });
    },

    // ── Events CRUD ──
    addEvent(eventData) {
      const evt = {
        id: 'evt-' + Date.now(),
        name: eventData.name || 'Ceremony',
        date: eventData.date || '',
        time: eventData.time || '',
        venue: eventData.venue || '',
        address: eventData.address || '',
        ...eventData,
      };
      state.card.events.push(evt);
      state.ui.isDirty = true;
      EventBus.emit('card:updated', { field: 'events', value: state.card.events });
      EventBus.emit('preview:refresh');
      return evt.id;
    },

    updateEvent(id, field, value) {
      const evt = state.card.events.find(e => e.id === id);
      if (evt) {
        evt[field] = value;
        state.ui.isDirty = true;
        EventBus.emit('card:updated', { field: 'events', value: state.card.events });
        EventBus.emit('preview:refresh');
      }
    },

    removeEvent(id) {
      state.card.events = state.card.events.filter(e => e.id !== id);
      state.ui.isDirty = true;
      EventBus.emit('card:updated', { field: 'events', value: state.card.events });
      EventBus.emit('preview:refresh');
    },

    // ── Accordion ──
    toggleAccordion(sectionId) {
      const list = state.ui.activeAccordions;
      const idx = list.indexOf(sectionId);
      if (idx === -1) {
        list.push(sectionId);
        EventBus.emit('accordion:opened', { sectionId });
      } else {
        list.splice(idx, 1);
        EventBus.emit('accordion:closed', { sectionId });
      }
    },

    isAccordionOpen(sectionId) {
      return state.ui.activeAccordions.includes(sectionId);
    },

    // ── Persistence ──
    saveToStorage() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state.card));
        state.ui.isDirty = false;
        state.ui.lastSaved = Date.now();
        EventBus.emit('state:saved');
      } catch (e) {
        console.warn('[AppState] Failed to save:', e);
      }
    },

    loadFromStorage() {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          // Merge saved card over defaults (preserve structure)
          state.card = Object.assign(createDefault().card, parsed);
          EventBus.emit('state:loaded');
          return true;
        }
      } catch (e) {
        console.warn('[AppState] Failed to load:', e);
      }
      return false;
    },

    reset() {
      state = createDefault();
      EventBus.emit('state:reset');
      EventBus.emit('preview:refresh');
    }
  };
})();