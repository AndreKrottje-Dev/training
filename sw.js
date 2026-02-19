/* Simple cache-first service worker for offline PWA usage. */
const CACHE_NAME = "andre-coach-v1";

// Keep this list short and stable; dynamic data is stored in localStorage.
const PRECACHE_URLS = [
  "/",
  "/index.html",
  "/css/styles.css",
  "/js/app.js",
  "/manifest.webmanifest",
  "/assets/icon-192.png",
  "/assets/icon-512.png",
  "/assets/apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(PRECACHE_URLS);
      self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => (k === CACHE_NAME ? null : caches.delete(k))));
      self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle same-origin.
  if (url.origin !== self.location.origin) return;

  // SPA navigation fallback to index.html (so deep links still work offline).
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match("/index.html");
        if (cached) return cached;
        return fetch(req);
      })()
    );
    return;
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(req);
      if (cached) return cached;
      try {
        const res = await fetch(req);
        // Cache only successful GETs.
        if (req.method === "GET" && res.ok) cache.put(req, res.clone());
        return res;
      } catch (e) {
        // Best-effort offline.
        return cached || new Response("Offline", { status: 503, statusText: "Offline" });
      }
    })()
  );
});

