/// <reference lib="webworker" />
// The service worker (D72): keeps the whole app in a cache so it starts and runs without a
// network. Built into sw.js by vite.config.ts, which fills in __PRECACHE__.
import { staleCaches } from './precache';

declare const self: ServiceWorkerGlobalScope;

/** This build's cache name and the URLs to cache; written into sw.js at build time. */
declare const __PRECACHE__: { cacheName: string; urls: string[] };

const { cacheName, urls } = __PRECACHE__;

// Every navigation inside the app is answered with the app itself; the router takes the URL.
const indexUrl = new URL('index.html', self.registration.scope).href;

self.addEventListener('install', (event) => {
  // Take over at once rather than wait until every window is closed: an installed app on
  // Android may never close. The open page is not reloaded; it keeps running the version it
  // started with, and the next start or refresh runs the new one (D73).
  event.waitUntil(
    caches
      .open(cacheName)
      // 'reload' skips the browser's HTTP cache: GitHub Pages lets it keep files for 10
      // minutes, so a second deploy soon after the first could cache the old index.html,
      // which points at script files that no longer exist.
      .then((cache) => cache.addAll(urls.map((url) => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(staleCaches(names, cacheName).map((name) => caches.delete(name))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    event.respondWith(fromCache(indexUrl, request));
  } else if (urls.includes(url.pathname)) {
    event.respondWith(fromCache(request, request));
  }
});

/**
 * The cached response, or the network when it is not cached (after the cache was cleared).
 * `ignoreVary`: a server's `Vary: Origin` would otherwise keep the module script, requested
 * with an Origin header, from matching the copy cached on install. Each file is fixed per build.
 */
async function fromCache(key: RequestInfo, request: Request): Promise<Response> {
  const cached = await caches.match(key, { cacheName, ignoreVary: true });
  return cached ?? fetch(request);
}
