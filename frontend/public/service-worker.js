/* EarlyBird Service Worker - v1.1 */

// Detect development mode
const IS_DEV = self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1';

const CACHE_NAME = 'earlybird-v1.1';
const RUNTIME_CACHE = 'earlybird-runtime-v1.1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching static assets');
        return cache.addAll(STATIC_ASSETS.filter(url => url !== '/'));
      })
      .then(() => self.skipWaiting())
      .catch((error) => console.error('[Service Worker] Install error:', error))
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
              console.log('[Service Worker] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
      .catch((error) => console.error('[Service Worker] Activate error:', error))
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const { method, url } = request;

  // Skip non-GET requests
  if (method !== 'GET') {
    return;
  }

  // Skip Chrome extensions and external URLs
  if (url.startsWith('chrome-extension://') || url.startsWith('moz-extension://')) {
    return;
  }

  // Skip Webpack HMR (Hot Module Replacement) files - development only
  if (url.includes('.hot-update.') || url.includes('hot-update.json') || url.includes('webpack-hmr') || url.includes('sockjs-node') || url.includes('ws://')) {
    return;
  }

  // In development mode, skip all caching and go straight to network
  if (IS_DEV) {
    return;
  }

  // API calls - network first, fallback to cache
  if (url.includes('/api/') || url.includes('localhost:8000') || url.includes('localhost:8001')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            // Clone and cache successful API responses - before returning
            try {
              const responseToCache = response.clone();
              caches.open(RUNTIME_CACHE)
                .then((cache) => {
                  cache.put(request, responseToCache)
                    .catch((error) => console.error('[Service Worker] API cache error:', error));
                })
                .catch((error) => console.error('[Service Worker] Cache open error:', error));
            } catch (error) {
              console.error('[Service Worker] API clone error:', error);
            }
          }
          return response;
        })
        .catch(() => {
          // Fallback to cached response for failed API calls
          return caches.match(request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                console.log('[Service Worker] Serving from cache (API):', url);
                return cachedResponse;
              }
              // Return offline response
              return new Response(
                JSON.stringify({ error: 'Offline - no cached data available' }),
                { status: 503, statusText: 'Service Unavailable', headers: { 'Content-Type': 'application/json' } }
              );
            });
        })
    );
    return;
  }

  // Static assets - cache first, fallback to network
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          console.log('[Service Worker] Serving from cache:', url);
          return cachedResponse;
        }

        // Not in cache, fetch from network
        return fetch(request)
          .then((response) => {
            // Check response validity before cloning
            if (!response || response.status !== 200 || response.type === 'error') {
              return response;
            }

            // Clone for caching - do this first before returning
            try {
              const responseToCache = response.clone();
              caches.open(RUNTIME_CACHE)
                .then((cache) => {
                  cache.put(request, responseToCache)
                    .catch((error) => console.error('[Service Worker] Cache put error:', error));
                })
                .catch((error) => console.error('[Service Worker] Cache open error:', error));
            } catch (error) {
              console.error('[Service Worker] Clone error:', error);
            }

            return response;
          })
          .catch((error) => {
            console.error('[Service Worker] Fetch error:', error);
            // Return offline page or cached asset
            return caches.match('/index.html')
              .then((response) => response || new Response('Offline - Network unavailable', { status: 503 }));
          });
      })
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync triggered:', event.tag);
  if (event.tag === 'sync-deliveries') {
    event.waitUntil(syncDeliveries());
  }
});

// Handle push notifications
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'New notification from EarlyBird',
    icon: 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 192 192%27%3E%3Crect fill=%272c3e50%27 width=%27192%27 height=%27192%27/%3E%3Ctext x=%2750%25%27 y=%2750%25%27 font-size=%2780%27 fill=%27%23fff%27 text-anchor=%27middle%27 dominant-baseline=%27middle%27 font-weight=%27bold%27%3E🍎%3C/text%3E%3C/svg%3E',
    badge: 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 96 96%27%3E%3Crect fill=%232c3e50%27 width=%2796%27 height=%2796%27/%3E%3Ctext x=%2748%27 y=%2748%27 font-size=%2760%27 fill=%27%23fff%27 text-anchor=%27middle%27 dominant-baseline=%27middle%27%3E🍎%3C/text%3E%3C/svg%3E',
    tag: 'earlybird-notification',
    requireInteraction: false,
    actions: [
      { action: 'open', title: 'Open' },
      { action: 'close', title: 'Dismiss' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('EarlyBird', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' })
      .then((clientList) => {
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url === '/' && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
  );
});

// Utility function for syncing deliveries
async function syncDeliveries() {
  try {
    const response = await fetch('/api/deliveries/sync', { method: 'POST' });
    if (!response.ok) throw new Error('Sync failed');
    console.log('[Service Worker] Deliveries synced successfully');
  } catch (error) {
    console.error('[Service Worker] Sync error:', error);
    throw error;
  }
}
