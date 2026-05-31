/**
 * App — Main application controller
 * Orchestrates all component initialization
 */
const App = (() => {
  let initialized = false;

  function init() {
    if (initialized) return;
    initialized = true;

    console.log('[App] MyInvitationCard Builder initializing...');

    // Load saved state from localStorage
    AppState.loadFromStorage();

    // Initialize components in dependency order
    try {
      Topbar.init();
      LeftPanel.init();
      RightCanvas.init();
      Drawer.init();
    } catch (err) {
      console.error('[App] Component init error:', err);
    }

    // Wire global events
    wireEvents();

    // Initial card render
    CardRenderer.render();

    // Auto-save every 30 seconds if dirty
    setInterval(() => {
      if (AppState.getUI().isDirty) {
        AppState.saveToStorage();
      }
    }, 30000);

    console.log('[App] Ready ✓');
  }

  function wireEvents() {
    // Card data changed → refresh preview
    EventBus.on('preview:refresh', () => {
      CardRenderer.render();
    });

    // State reset → refresh everything
    EventBus.on('state:reset', () => {
      LeftPanel.refresh();
      CardRenderer.render();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Ctrl+S / Cmd+S → Save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        AppState.saveToStorage();
        Toast.show('Card saved!', 'success');
      }
      // Escape → Close drawer
      if (e.key === 'Escape' && AppState.getUI().drawerOpen) {
        Drawer.close();
      }
    });

    // Warn before leaving with unsaved changes
    window.addEventListener('beforeunload', (e) => {
      if (AppState.getUI().isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    });
  }

  return { init };
})();