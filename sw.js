// sw.js — compatible GitHub Pages (projet) ET offline
const CACHE_NAME = "ssflow-ghp-v1"; // ↑ incrémente à chaque déploiement

// Construit des URL absolues sous le scope du SW (ex: /tonrepo/)
const U = (p) => new URL(p.replace(/^\/+/, ""), self.registration.scope).toString();

const PRECACHE_ASSETS = [
  U("./"),                 // la racine du projet (redirige vers index.html)
  U("index.html"),
  U("manifest.webmanifest"),
  U("icons/icon-180.png"),
  U("icons/icon-192.png"),
  U("icons/icon-512.png"),

  // ← AJOUTE ICI TOUT CE QUE TU UTILISES (images, CSS, JS, sons…)
  // Exemples :
  // U("SWISS_ServiceFlow_v14zf.html"),
  // U("assets/css/app.css"),
  // U("assets/js/app.js"),
  // U("assets/img/ui.png"),
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(PRECACHE_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Aide : renvoyer un HTML depuis le cache
const cachedHTML = async (path) => {
  const url = U(path);
  const cache = await caches.open(CACHE_NAME);
  const hit = await cache.match(url);
  if (hit) return hit;
  const res = await fetch(url);
  cache.put(url, res.clone());
  return res;
};

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // 1) Navigations → renvoyer index.html depuis le cache (SPA/offline)
  if (req.mode === "navigate") {
    event.respondWith(cachedHTML("index.html"));
    return;
  }

  // 2) Même origine → cache-first
  const url = new URL(req.url);
  const sameOrigin = url.origin === new URL(self.registration.scope).origin;

  if (sameOrigin && req.method === "GET") {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, clone));
          return res;
        }).catch(async () => {
          if (req.destination === "document") return cachedHTML("index.html");
          return new Response("Offline", { status: 503 });
        });
      })
    );
  }
});
