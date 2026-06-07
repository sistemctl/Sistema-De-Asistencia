const CACHE_NAME = 'asistencia-pwa-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/app',
  '/manifest.json',
  '/static/main.css?v=30',
  '/static/favicon.svg',
  '/js/app.js?v=22',
  '/js/auth.js?v=9',
  'https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Only intercept GET requests
  if (event.request.method !== 'GET') return;

  // Do not intercept API calls, let them pass through (network only for API)
  if (event.request.url.includes('/api/')) {
    return;
  }

  // Network-first strategy for HTML pages and local assets
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Cache the fresh response if it's a good response
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Fallback to cache if network fails
        return caches.match(event.request);
      })
  );
});
