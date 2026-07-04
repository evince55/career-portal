// PWA Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Versioned script URL busts any stale CDN-cached copy; updateViaCache 'none'
    // makes the browser always revalidate the worker script on update checks.
    navigator.serviceWorker.register('/js/service-worker.js?v=18', { updateViaCache: 'none' })
      .then((registration) => {
        console.log('PWA Service Worker registered:', registration.scope);
        
        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', (event) => {
            if (event.target.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('New content available! Refresh to update.');
            }
          });
        });
      })
      .catch((error) => {
        console.error('PWA Service Worker registration failed:', error);
      });
  });
}

// Online/Offline status indicator
function updateOnlineStatus(online) {
  if (typeof document === 'undefined') return;
  const statusEl = document.getElementById('online-status');
  if (!statusEl) return;
  
  const dot = document.createElement('span');
  dot.className = `status-indicator ${online ? 'online' : 'offline'}`;
  dot.setAttribute('aria-label', online ? 'Online' : 'Offline');
  statusEl.innerHTML = '';
  statusEl.appendChild(dot);
  statusEl.append(` ${online ? 'Online' : 'Offline'}`);
}

window.addEventListener('online', () => {
  console.log('[PWA] Connection restored - back online');
  updateOnlineStatus(true);
});

window.addEventListener('offline', () => {
  console.log('[PWA] Connection lost - using cached version');
  updateOnlineStatus(false);
});

// Initialize status on load
if (typeof document !== 'undefined') {
  updateOnlineStatus(navigator.onLine);
}
