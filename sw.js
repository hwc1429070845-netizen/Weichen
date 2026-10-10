const CACHE_NAME = "polski-daily-v2";
const CORE_FILES = [
  "./",
  "./index.html",
  "./manifest.json",
  "./offline.html",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    for (const file of CORE_FILES) {
      try {
        const response = await fetch(file, {cache:"reload"});
        if (response.ok) await cache.put(file, response);
      } catch (e) {}
    }
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith("polski-daily-") && k !== CACHE_NAME).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return;

  if (req.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const res = await fetch(req);
        if (res && res.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(req, res.clone()).catch(() => {});
        }
        return res;
      } catch (e) {
        const cache = await caches.open(CACHE_NAME);
        return (await cache.match(req)) ||
               (await cache.match("./index.html")) ||
               (await cache.match("./")) ||
               (await cache.match("./offline.html")) ||
               new Response("当前离线且首页尚未缓存。请先联网打开一次 Polski Daily。", {headers:{"Content-Type":"text/plain; charset=utf-8"}});
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(req);
    if (cached) return cached;
    try {
      const res = await fetch(req);
      if (res && res.ok) cache.put(req, res.clone()).catch(() => {});
      return res;
    } catch (e) {
      return new Response("", {status:504,statusText:"Offline"});
    }
  })());
});
