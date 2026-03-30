/**
 * Service worker registration for PWA support.
 * Only runs on web — no-op on native.
 */

export function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        if (__DEV__) {
          console.log('[SW] Service worker registered:', registration.scope);
        }
      })
      .catch((err) => {
        console.warn('[SW] Service worker registration failed:', err);
      });
  });
}
