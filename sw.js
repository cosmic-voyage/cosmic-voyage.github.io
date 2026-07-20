/* Cosmic Voyage service worker — full offline support.
   Everything the app needs is cached on install; the page itself uses
   stale-while-revalidate so updates still arrive when online.
   All sky math runs client-side, so a cached app stays fully live:
   positions/times recompute from the device clock + location every frame. */
const CACHE = "cosmic-voyage-v1";
const CORE = [
  "./", "index.html", "manifest.json", "icon-192.png", "icon-512.png", "mw-band.jpg",
];
const ART = [
  "const-art/andromeda.png", "const-art/aquarius.png", "const-art/aquila.png", "const-art/argonavis.png",
  "const-art/aries.png", "const-art/auriga.png", "const-art/bootes.png", "const-art/cancer.png",
  "const-art/canis-major.png", "const-art/canis-minor.png", "const-art/capricornus.png", "const-art/cassiopeia.png",
  "const-art/centaurus.png", "const-art/cepheus.png", "const-art/cetus.png", "const-art/corona-borealis.png",
  "const-art/corvus.png", "const-art/crux.png", "const-art/cygnus.png", "const-art/delphinus.png",
  "const-art/draco.png", "const-art/gemini.png", "const-art/hercules.png", "const-art/hydra.png",
  "const-art/leo.png", "const-art/lepus.png", "const-art/libra.png", "const-art/lyra.png",
  "const-art/ophiuchus.png", "const-art/orion.png", "const-art/pegasus.png", "const-art/perseus.png",
  "const-art/pisces.png", "const-art/piscis-austrinus.png", "const-art/sagittarius.png", "const-art/scorpius.png",
  "const-art/taurus.png", "const-art/ursa-major.png", "const-art/ursa-minor.png", "const-art/virgo.png",
];

self.addEventListener("install", e => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(CORE);
    // artwork is best-effort: a single failed file shouldn't block install
    await Promise.allSettled(ART.map(u => cache.add(u)));
    self.skipWaiting();
  })());
});

self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return; // ISS feed / NASA images: network only
  // the page: serve cached instantly, refresh the cache in the background (updates land next open)
  if (e.request.mode === "navigate" || url.pathname.endsWith("index.html")) {
    e.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match("index.html") || await cache.match("./");
      const refresh = fetch(e.request).then(r => { if (r.ok) { cache.put("index.html", r.clone()); } return r; }).catch(() => null);
      return cached || (await refresh) || Response.error();
    })());
    return;
  }
  // everything else: cache-first, falling back to (and populating from) the network
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(e.request);
    if (cached) return cached;
    try {
      const r = await fetch(e.request);
      if (r.ok) cache.put(e.request, r.clone());
      return r;
    } catch (err) { return Response.error(); }
  })());
});
