const CACHE_NAME = "chaap-admin-cache-v87"; // 🔥 version update

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

  // 🔥 Always fresh HTML (no cache)
  if (request.destination === "document") {
    event.respondWith(
      fetch(request)
        .then(response => response)
        .catch(() => caches.match("/offline.html"))
    );
    return;
  }

  // 🚫 Skip API calls (VERY IMPORTANT)
  if (
    request.url.includes("script.google.com") ||
    request.url.includes("/exec")
  ) {
    return;
  }

  // 🟢 Cache First Strategy
  event.respondWith(
    caches.match(request).then(cached => {

      if (cached) return cached;

      return fetch(request)
        .then(networkResponse => {

          // ✅ Cache only valid GET responses
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
        })
        .catch(() => {

          // 🔥 Handle image failures (403 / blocked)
          if (request.destination === "image") {
            return new Response("", { status: 200 });
          }

          // 🔥 Fallback to cache
          return caches.match(request);

        });

    })
  );

});
