/**
 * EventBus — Simple pub/sub event system
 * Enables decoupled communication between components
 */
const EventBus = (() => {
  const events = {};

  return {
    /**
     * Subscribe to an event
     * @returns {Function} Unsubscribe function
     */
    on(event, callback) {
      if (!events[event]) events[event] = [];
      events[event].push(callback);
      return () => this.off(event, callback);
    },

    /** Unsubscribe from an event */
    off(event, callback) {
      if (!events[event]) return;
      events[event] = events[event].filter(cb => cb !== callback);
    },

    /** Emit an event with optional data */
    emit(event, data) {
      if (!events[event]) return;
      events[event].forEach(cb => {
        try {
          cb(data);
        } catch (err) {
          console.error(`[EventBus] Error in handler for "${event}":`, err);
        }
      });
    },

    /** Subscribe once — auto-unsubscribes after first call */
    once(event, callback) {
      const unsub = this.on(event, (data) => {
        callback(data);
        unsub();
      });
    },

    /** Debug: list all registered events */
    debug() {
      return Object.keys(events).map(e => ({ event: e, listeners: events[e].length }));
    }
  };
})();