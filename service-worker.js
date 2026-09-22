const CACHE_NAME = "mont-blanc-touring-v16";
const APP_SHELL = [
  "./",
  "./index.html",
  "./field-guide.css",
  "./app-data.js",
  "./app.js",
  "./tmb-map-data.js",
  "./manifest.webmanifest",
  "./resources/icons/icon-192.png",
  "./resources/icons/icon-512.png",
  "./resources/icons/icon-maskable-512.png",
  "./resources/icons/apple-touch-icon.png",
  "./resources/images/mountains1.jpg",
  "./resources/images/mountains2.jpg",
  "./resources/images/signs.jpg",
  "./resources/images/hovel.jpg",
  "./resources/images/window.jpg",
  "./resources/images/The-view-of-the-Mont-Blanc-scaled.jpg",
  "./resources/images/places/les-houches.jpg",
  "./resources/images/places/col-du-tricot.jpg",
  "./resources/images/places/col-du-bonhomme.jpg",
  "./resources/images/places/col-de-la-seigne.jpg",
  "./resources/images/places/grand-col-ferret.jpg",
  "./resources/images/places/alp-bovine.jpg",
  "./resources/images/places/aiguillette-des-posettes.jpg",
  "./resources/images/crew/rachel.webp",
  "./resources/images/crew/david.webp",
  "./resources/images/crew/colleen.webp",
  "./resources/images/crew/marcel.webp",
  "./resources/images/crew/arin.webp",
  "./resources/images/crew/john.webp"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  const isMapTile = url.hostname === "tile.openstreetmap.org";

  if (isMapTile) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        const response = await fetch(event.request);
        cache.put(event.request, response.clone());
        return response;
      }).catch(() => new Response("", { status: 503 }))
    );
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response.clone()));
          }
          return response;
        })
        .catch(() => caches.match(event.request, { ignoreSearch: true }).then((cached) => (
          cached || (event.request.mode === "navigate"
            ? caches.match("./index.html")
            : new Response("", { status: 503 }))
        )))
    );
    return;
  }

  if (url.hostname === "unpkg.com") {
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
        if (response.ok) caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response.clone()));
        return response;
      }))
    );
  }
});
