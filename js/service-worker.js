const CACHE_NAME = 'career-portal-v21';

// Precache: every page + the design system + module JS + fonts + live-data config.
// Kept in sync with files on disk by tests/site-integrity.mjs.
// v3: UI icons are now inlined per page from icons/sprite.svg, so individual
// icon SVGs are no longer precached; the sprite source is cached instead.
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/projects.html',
  '/dashboard.html',
  '/contact.html',
  '/offline.html',
  '/404.html',
  '/projects/aria.html',
  '/projects/audio.html',
  '/projects/azure-functions.html',
  '/projects/career-portal.html',
  '/projects/homelab.html',
  '/projects/llm-orchestrator.html',
  '/projects/meshwatch.html',
  '/projects/minecraft-monitoring.html',
  '/projects/monitoring-stack.html',
  '/manifest.json',
  '/css/tokens.css',
  '/css/base.css',
  '/css/pages/home.css',
  '/css/pages/projects.css',
  '/css/pages/case-study.css',
  '/css/pages/dashboard.css',
  '/css/pages/contact.css',
  '/css/pages/misc.css',
  '/js/palette.js',
  '/js/scroll-reveal.js',
  '/js/motion.js',
  '/js/home-live.js',
  '/js/stats-source.js',
  '/js/hero-cluster.js',
  '/js/projects-filter.js',
  '/js/dashboard.js',
  '/js/contact.js',
  '/js/tweaks.js',
  '/js/utils/helpers.js',
  '/js/pwa.js',
  '/fonts/space-grotesk.woff2',
  '/fonts/jetbrains-mono.woff2',
  '/config/minecraft-stats.json',
  '/sitemap.xml',
  '/icons/sprite.svg',
  '/icons/icon.svg',
  '/og/card.jpg',
  '/icons/icon-72.png',
  '/icons/icon-96.png',
  '/icons/icon-128.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// Install — precache with per-asset error tolerance
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        ASSETS_TO_CACHE.map((asset) =>
          fetch(asset).then((response) => {
            if (!response.ok) {
              console.warn(`[ServiceWorker] Failed to fetch: ${asset} (${response.status})`);
              return null;
            }
            return cache.put(asset, response);
          }).catch((error) => {
            console.warn(`[ServiceWorker] Error fetching ${asset}:`, error.message);
            return null;
          })
        )
      );
    })
  );
  self.skipWaiting();
});

// Activate — drop old cache versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name).catch((err) => {
            console.warn(`[ServiceWorker] Failed to delete cache ${name}:`, err.message);
          }))
      );
    }).catch((err) => {
      console.warn('[ServiceWorker] Cache cleanup failed:', err.message);
    })
  );
  self.clients.claim();
});

// Fetch strategy:
//  - navigations (HTML): network-first so visitors always get fresh pages;
//    cache fallback when offline, then offline.html
//  - everything else: cache-first (ignoreSearch so ?v= busters still hit the
//    precache), network fallback with runtime cache-put for same-origin GETs
//    (this is how the lazy three.js vendor file becomes available offline)
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then((response) => {
        const clone = response.clone();
        if (response.ok) {
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone)).catch(() => {});
        }
        return response;
      }).catch(() => {
        return caches.match(request, { ignoreSearch: true }).then((cached) => {
          return cached || caches.match('/offline.html');
        });
      })
    );
    return;
  }

  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        const sameOrigin = new URL(request.url).origin === self.location.origin;
        if (response && response.ok && sameOrigin) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone)).catch(() => {});
        }
        return response;
      });
    }).catch((err) => {
      console.warn('[ServiceWorker] Fetch handler error:', err.message);
      return new Response('Network request failed.', {
        status: 503,
        headers: { 'Content-Type': 'text/plain' }
      });
    })
  );
});

// Messages from pwa.js
self.addEventListener('message', (event) => {
  try {
    if (event.data && event.data.type === 'SKIP_WAITING') {
      self.skipWaiting();
    } else if (event.data && event.data.type === 'CLEAR_CACHE') {
      caches.keys().then((cacheNames) => {
        Promise.all(cacheNames.map((name) => caches.delete(name)));
      });
    }
  } catch (err) {
    console.error('[ServiceWorker] Message handler error:', err.message);
  }
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[ServiceWorker] Unhandled rejection:', event.reason);
});
