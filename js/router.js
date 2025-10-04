/**
 * TribeX Router - Mobile-First SPA Router mit History API
 */

export class Router {
  constructor() {
    this.routes = new Map();
    this.currentRoute = null;
    this.listeners = new Map();
    this.transitionDuration = 180;

    // History API
    window.addEventListener('popstate', (event) => {
      this.navigateToPath(window.location.pathname, false);
    });
  }

  /**
   * Registriert eine Route
   */
  register(path, handler) {
    this.routes.set(path, handler);
  }

  /**
   * Navigiert zu einem Pfad
   */
  async navigate(path, pushState = true) {
    if (this.currentRoute === path) return;

    const handler = this.routes.get(path);
    if (!handler) {
      console.warn(`Route ${path} nicht gefunden`);
      return;
    }

    // Trigger beforeNavigate
    this.emit('beforeNavigate', { from: this.currentRoute, to: path });

    // Update History
    if (pushState) {
      window.history.pushState({ path }, '', path);
    }

    const previousRoute = this.currentRoute;
    this.currentRoute = path;

    // Trigger routeChange
    this.emit('routeChange', { from: previousRoute, to: path });

    // Execute handler
    await handler({ from: previousRoute, to: path });

    // Trigger afterNavigate
    this.emit('afterNavigate', { from: previousRoute, to: path });
  }

  /**
   * Navigiert zum aktuellen Pfad (für popstate)
   */
  navigateToPath(path, pushState = false) {
    this.navigate(path, pushState);
  }

  /**
   * Event Listener
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  emit(event, data) {
    if (!this.listeners.has(event)) return;
    this.listeners.get(event).forEach(callback => callback(data));
  }

  /**
   * Aktuellen Pfad zurückgeben
   */
  getCurrentPath() {
    return this.currentRoute || window.location.pathname;
  }

  /**
   * Initial Route laden
   */
  init() {
    const path = window.location.pathname;
    const route = this.routes.has(path) ? path : '/chat';
    this.navigate(route, path !== route);
  }
}
