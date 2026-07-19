// Service worker — makes CivFlow installable, and keeps previously-visited
// pages usable when signal drops on site.
//
// Strategy:
//  - API routes and Supabase requests are NEVER cached — data must stay
//    live, and offline writes (uploads) should fail fast and visibly rather
//    than silently queue (no background-sync queue exists yet — see the
//    README roadmap for that as a future, bigger feature).
//  - Hashed Next.js build assets (/_next/static/*) are cache-first — they're
//    immutable, safe to serve straight from cache.
//  - Page navigations are network-first, falling back to a cached copy of
//    that page, and finally to /offline.html if it's never been visited.
//  - Everything else is network-first with a cache fallback.

const CACHE_VERSION = "civflow-v2";
const OFFLINE_URL = "/offline.html";
const PRECACHE_URLS = ["/", OFFLINE_URL, "/favicon.svg", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
      .catch(() => {
        // Precaching is best-effort (e.g. offline during install) — don't
        // block installation on it.
      })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return; // never intercept uploads/writes

  const url = new URL(request.url);

  // Data must always be live — let these hit the network untouched.
  if (url.pathname.startsWith("/api/") || url.hostname.endsWith(".supabase.co")) {
    return;
  }

  // Immutable hashed build assets: cache-first.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const clone = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, clone));
            return response;
          })
      )
    );
    return;
  }

  // Page navigations: network-first, cached page, then the offline page.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match(OFFLINE_URL)))
    );
    return;
  }

  // Everything else: network-first, cache fallback.
  event.respondWith(fetch(request).catch(() => caches.match(request)));
});
