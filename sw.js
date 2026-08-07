// Hockey Masters Trainer — offline fallback service worker.
//
// Strategy: network-first. Every GET request tries the network first; a successful response both
// answers the request AND refreshes the cache with that fresh copy. Only when the network fails
// (genuinely offline, e.g. no signal at a field or gym) does it fall back to whatever was last cached.
//
// This deliberately avoids the classic PWA staleness trap (cache-first serving an old version forever,
// requiring users to know how to manually clear cache). Because every online visit re-caches the latest
// file, there's no need to bump CACHE_NAME on every content change — only bump it if the *set of files*
// being cached changes (e.g. adding a new asset to APP_SHELL below).
const CACHE_NAME = 'hmt-cache-v1';
const APP_SHELL = ['./', './index.html'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch(() => {}) // don't let a caching hiccup block install
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)).catch(() => {});
        return response;
      })
      .catch(() =>
        caches.match(event.request).then((cached) => cached || caches.match('./index.html'))
      )
  );
});
