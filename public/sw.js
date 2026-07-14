// Minimal service worker — makes CivFlow installable to the home screen.
// This intentionally does NOT cache API/Supabase responses yet.
// Real offline capture queuing is a later milestone (see README "Roadmap").

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  // Network-first, no caching — placeholder so the app qualifies as an
  // installable PWA. Extend this with a cache-first app-shell strategy
  // and a background-sync queue for offline diary capture later.
  event.respondWith(fetch(event.request));
});
