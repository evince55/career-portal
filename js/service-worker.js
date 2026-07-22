// Tombstone for the retired /js/-scoped service worker.
//
// The real worker moved to /service-worker.js on 2026-07-21 so its scope covers
// the whole site. Returning visitors still hold a registration scoped to /js/,
// and because overlapping scopes resolve most-specific-first, that old worker
// would go on intercepting every /js/* request and serving them cache-first
// from its own precache — including js/pwa.js, the file that carries the
// migration code. Simply deleting this script is worse: its update check would
// 404 and the stale worker would be stranded in place.
//
// So this file stays, doing nothing but retiring the registration that fetched
// it. The browser's update check installs this, activate() unregisters it, and
// /js/* goes back to the network — at which point the fresh pwa.js loads and
// registers the root-scoped worker.
//
// Deliberately absent: any precache list, and any fetch handler, so it stops
// intercepting requests the moment it takes over. It also must NOT clear
// caches — the Cache Storage API is origin-wide, so deleting caches here would
// wipe the live root worker's precache too. The root worker already drops
// non-current caches in its own activate().
//
// Safe to delete once traffic from pre-2026-07-21 visitors has aged out.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    self.registration.unregister()
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then((clients) => {
        // Reload open tabs so they pick up the real worker straight away
        // instead of waiting for the next manual navigation.
        clients.forEach((client) => {
          if ('navigate' in client) client.navigate(client.url).catch(() => {});
        });
      })
      .catch(() => {})
  );
});
