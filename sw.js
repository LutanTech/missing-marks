const CACHE_NAME = "mu-missing-marks-v1";

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.addAll([
        "/manifest.json",
        "/assets/icons/logo-2.png",
        "/assets/icons/icon.png",
        "/assets/icons/icon-192-1.png",
        "/assets/icons/icon-512-1.png"
      ])
    )
  );
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
