const CACHE_NAME = "tiens-bon-v1";
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
  "./resources/images/The-view-of-the-Mont-Blanc-scaled.jpg"
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

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request).then((response) => {
        if (response.ok && (url.origin === self.location.origin || url.hostname === "unpkg.com")) {
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response.clone()));
        }
        return response;
      });
      return cached || network.catch(() => caches.match("./index.html"));
    })
  );
});
