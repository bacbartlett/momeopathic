const CACHE_NAME = 'acute-care-v1';

const PRECACHE_URLS = [
  '/',
  '/manifest.json',
];

// Install: precache critical resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch: network-first for API calls, cache-first for static assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Network-only for Convex API / WebSocket connections
  if (
    url.hostname.includes('convex.cloud') ||
    url.hostname.includes('convex.dev') ||
    url.hostname.includes('convex.site')
  ) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Network-only for PostHog analytics
  if (url.hostname.includes('posthog.com')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Cache-first for static assets (JS, CSS, images, fonts)
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        return cached;
      }

      return fetch(event.request).then((response) => {
        // Don't cache non-successful responses or opaque responses
        if (!response || response.status !== 200) {
          return response;
        }

        // Cache static assets
        const contentType = response.headers.get('content-type') || '';
        const isStaticAsset =
          contentType.includes('javascript') ||
          contentType.includes('css') ||
          contentType.includes('image') ||
          contentType.includes('font') ||
          contentType.includes('woff');

        if (isStaticAsset) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }

        return response;
      });
    })
  );
});
