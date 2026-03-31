// Service Worker — Monitoreo QA/QC
const CACHE_NAME = "monitoreo-qaqc-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./icons/icon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

// Install — pre-cache all assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[SW] Pre-caching assets");
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => {
            console.log("[SW] Removing old cache:", key);
            return caches.delete(key);
          })
      )
    )
  );
  self.clients.claim();
});

// Fetch — cache-first strategy
self.addEventListener("fetch", (event) => {
  // Skip non-GET requests
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request)
        .then((networkResponse) => {
          // Cache the new response for future
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // If offline and not cached, return a fallback for navigation
          if (event.request.mode === "navigate") {
            return caches.match("./index.html");
          }
        });
    })
  );
});
