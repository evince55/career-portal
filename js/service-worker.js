const CACHE_NAME = 'career-portal-v6';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/project-explorer.html',
  '/dashboard.html',
  '/offline.html',
  '/manifest.json',
  '/css/styles.css',
  '/js/terminal.js',
  '/js/audio.js',
  '/js/project-catalog.js',
  '/js/meshwatch-api.js',
  '/js/ai-assistant.js',
  '/js/performance.js',
  '/js/visual-effects.js',
  '/js/pwa.js',
  '/config/career-fair.json',
  '/config/minecraft-stats.json',
  '/icons/icon-72.png',
  '/icons/icon-96.png',
  '/icons/icon-128.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/screenshots/terminal-view.png'
];

// Install event - cache assets with error handling for each asset
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        ASSETS_TO_CACHE.map(asset => 
          fetch(asset).then(response => {
            if (!response.ok) {
              console.warn(`[ServiceWorker] Failed to fetch: ${asset} (${response.status})`);
              return null;
            }
            return cache.put(asset, response);
          }).catch(error => {
            console.warn(`[ServiceWorker] Error fetching ${asset}:`, error.message);
            return null;
          })
        )
      ).then(results => {
        const failed = results.filter(r => r.status === 'rejected' || (r.value === null));
        if (failed.length > 0) {
          console.warn(`[ServiceWorker] ${failed.length}/${ASSETS_TO_CACHE.length} assets failed to cache`);
        }
      });
    })
  );
  self.skipWaiting();
});

// Activate event - clean old caches with error handling
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.debug(`[ServiceWorker] Deleting old cache: ${name}`);
            return caches.delete(name).catch(err => {
              console.warn(`[ServiceWorker] Failed to delete cache ${name}:`, err.message);
            });
          })
      );
    }).catch(err => {
      console.warn('[ServiceWorker] Cache cleanup failed:', err.message);
    })
  );
});

// Fetch event - serve from cache, fallback to offline.html with error boundary
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      
      return fetch(event.request).then((response) => {
        const responseClone = response.clone();
        
        // Only cache successful GET requests with valid status codes
        if (response && event.request.method === 'GET' && response.ok) {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          }).catch(err => {
            console.warn('[ServiceWorker] Failed to cache request:', err.message);
          });
        }
        
        return response;
      }).catch(() => {
        // Fallback to offline page when network is unavailable
        return caches.match('/offline.html').catch(() => {
          // Final fallback if even offline.html isn't cached
          return new Response('You appear to be offline. Please check your connection.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain' }
          });
        });
      });
    }).catch(err => {
      console.warn('[ServiceWorker] Fetch handler error:', err.message);
      return new Response('Network request failed.', {
        status: 503,
        headers: { 'Content-Type': 'text/plain' }
      });
    })
  );
});

// Message handler for cache updates with error boundary
self.addEventListener('message', (event) => {
  try {
    if (event.data && event.data.type === 'SKIP_WAITING') {
      self.skipWaiting();
    } else if (event.data && event.data.type === 'CLEAR_CACHE') {
      caches.keys().then((cacheNames) => {
        Promise.all(cacheNames.map(name => caches.delete(name)));
      });
    }
  } catch (err) {
    console.error('[ServiceWorker] Message handler error:', err.message);
  }
});

// Handle unhandled promise rejections in service worker
self.addEventListener('unhandledrejection', (event) => {
  console.error('[ServiceWorker] Unhandled rejection:', event.reason);
});
