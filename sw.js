const CACHE_NAME = "chaap-admin-cache-v6";

const URLS_TO_CACHE = [
  "/",
  "/index.html",
  "/manifest.json",
  "/offline.html"
];

// ==========================
// INSTALL
// ==========================
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(URLS_TO_CACHE);
    })
  );

  // Activate immediately
  self.skipWaiting();
});


// ==========================
// ACTIVATE
// ==========================
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );

  self.clients.claim();
});


// ==========================
// FETCH
// ==========================
self.addEventListener("fetch", event => {

  const request = event.request;

  // 🔥 Always get latest HTML from network (prevents stale admin UI)
  if (request.destination === "document") {
    event.respondWith(
      fetch(request)
        .then(response => response)
        .catch(() => caches.match("/offline.html"))
    );
    return;
  }

  // 🚫 Never cache Google Apps Script APIs
  if (request.url.includes("/exec") || request.url.includes("?api=")) {
    event.respondWith(fetch(request));
    return;
  }

  // 🟢 Static assets → Cache First
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;

      return fetch(request).then(networkResponse => {

        // Cache only GET successful responses
        if (
          request.method === "GET" &&
          networkResponse &&
          networkResponse.status === 200
        ) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, clone);
          });
        }

        return networkResponse;
      });
    })
  );

});
