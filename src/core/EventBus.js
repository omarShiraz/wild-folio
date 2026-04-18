/**
 * Global pub/sub event bus.
 * Cross-cutting concerns (crime, wanted level, building enter) go through here
 * instead of being threaded as direct references across systems.
 */
class EventBus {
  constructor() {
    /** @type {Map<string, Set<Function>>} */
    this._listeners = new Map();
  }

  /**
   * @param {string} event
   * @param {Function} fn
   */
  on(event, fn) {
    if (!this._listeners.has(event)) this._listeners.set(event, new Set());
    this._listeners.get(event).add(fn);
  }

  /**
   * @param {string} event
   * @param {Function} fn
   */
  off(event, fn) {
    this._listeners.get(event)?.delete(fn);
  }

  /**
   * @param {string} event
   * @param {*} [payload]
   */
  emit(event, payload) {
    this._listeners.get(event)?.forEach((fn) => fn(payload));
  }
}

export const bus = new EventBus();
