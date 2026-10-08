/* global __BUILD__, __ASSETS__, __ROUTES__ */
const CACHE_PREFIX = "home-esp32-shell-";
const CACHE = CACHE_PREFIX + __BUILD__;
const ASSETS = __ASSETS__;
const ROUTES = __ROUTES__;
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await cache.addAll(
        ASSETS.map((url) => new Request(url, { cache: "reload" })),
      );
    })(),
  );
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  // Never cache sensor/API traffic, cross-origin requests or React server payloads.
  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    request.headers.get("RSC") === "1" ||
    url.searchParams.has("_rsc")
  )
    return;
  if (request.mode === "navigate" && ROUTES.includes(url.pathname)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 4000);
          let response;
          try {
            response = await fetch(request, { signal: controller.signal });
          } finally {
            clearTimeout(timeout);
          }
          if (!response.ok) throw new Error("Shell unavailable");
          await cache.put(url.pathname, response.clone());
          return response;
        } catch {
          return (await cache.match(url.pathname)) || Response.error();
        }
      })(),
    );
    return;
  }
  if (
    url.pathname.startsWith("/_next/static/") ||
    (ASSETS.includes(url.pathname) && !ROUTES.includes(url.pathname))
  ) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        const stored = await cache.match(request);
        if (stored) return stored;
        const response = await fetch(request);
        if (response.ok) await cache.put(request, response.clone());
        return response;
      })(),
    );
  }
});
