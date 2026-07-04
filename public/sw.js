/*
 * SportFits service worker (Flow 8, PRD §8): after the first load the app works
 * fully offline. Strategy is stale-while-revalidate over same-origin GETs, so
 * pages, chunks, and assets are served from cache and refreshed in the
 * background. Navigations that miss fall back to a cached shell, and any
 * /fit/* navigation falls back to a cached results shell (the id is read from
 * the URL client-side).
 */
const CACHE = "sportfits-v1";
// FIT_SHELL is a real render of the dynamic /fit/[id] route. Offline, it is
// served for any /fit/* navigation; the client reads the id from the URL and
// loads the fit from storage (Flow 8).
const FIT_SHELL = "/cycling/fit/offline-shell";
const PRECACHE = ["/", "/cycling", "/cycling/fit/new", "/cycling/drills", "/fits", "/settings", "/method", FIT_SHELL];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await Promise.all(
        PRECACHE.map((url) =>
          cache.add(url).catch(() => {
            /* best effort */
          }),
        ),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(req);

      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200 && res.type === "basic") {
            cache.put(req, res.clone());
          }
          return res;
        })
        .catch(() => null);

      // Stale-while-revalidate: serve cache immediately, refresh in background.
      if (cached) {
        void network;
        return cached;
      }

      const fresh = await network;
      if (fresh) return fresh;

      // Offline and uncached. For navigations, fall back to a shell.
      if (req.mode === "navigate") {
        // Old BikeFit-era wizard URL: redirects need the network, so map it
        // straight to the cached canonical wizard.
        if (url.pathname === "/fit/new") {
          const wizard = await cache.match("/cycling/fit/new");
          if (wizard) return wizard;
        }
        if (url.pathname.startsWith("/cycling/fit/") || url.pathname.startsWith("/fit/")) {
          const shell = await cache.match(FIT_SHELL);
          if (shell) return shell;
        }
        const home = await cache.match("/");
        if (home) return home;
      }
      return new Response("Offline", {
        status: 503,
        statusText: "Offline",
      });
    })(),
  );
});
