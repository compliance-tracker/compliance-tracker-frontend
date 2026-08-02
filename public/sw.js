// Compliance Tracker service worker (issue #31) - deliberately minimal: enough to satisfy PWA
// installability criteria (a browser requires a registered fetch handler before it'll offer to
// install an app) and give the app shell real offline resilience, not a full offline-first data
// layer. This app's actual data (deadlines, businesses) always needs a live, authenticated
// backend - caching /api/* responses would serve stale or wrong compliance data while offline,
// which is worse than a clear "you're offline" failure, not better. Only the shell itself
// (index.html, the built JS/CSS/fonts) is ever cached.

const CACHE_NAME = "compliance-tracker-shell-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

// Network-first, falling back to cache only when the network genuinely fails - a cached response
// is never preferred over a live one, so a returning-online user always sees a fresh app, not a
// stale cached shell that happens to still be sitting there. Same-origin GET requests only, and
// never /api/* - both restrictions matter: caching a cross-origin or POST/PUT/DELETE request
// would be actively wrong, and caching an API GET would reintroduce the stale-data problem this
// worker is deliberately scoped to avoid.
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        const responseCopy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, responseCopy));
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached ?? caches.match("/index.html"))),
  );
});
