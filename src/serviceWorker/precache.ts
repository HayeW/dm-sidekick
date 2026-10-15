// What the service worker caches (D72). Pure: used by vite.config.ts at build time, which
// writes the result into sw.js, and by the worker itself for its cache names.

/** The service worker's file, at the root of the built app. */
export const SERVICE_WORKER_FILE = 'sw.js';

/**
 * Files in `public/` that the build copies as they are. The bundle doesn't list them, so they
 * are named here; a test keeps this list in step with the folder.
 */
export const PUBLIC_FILES = [
  'icons/apple-touch-icon.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon.svg',
  'manifest.webmanifest',
];

/** Every cache of this app starts with this. Other GitHub Pages sites share the origin. */
export const CACHE_PREFIX = 'dm-sidekick-';

/** Built files the app never loads itself: the worker, and the fallback page for GitHub Pages. */
const NOT_CACHED = new Set([SERVICE_WORKER_FILE, '404.html']);

/**
 * The URLs the service worker caches on install: every file the app loads, under the base
 * path, so the app starts and runs without a network.
 */
export function precacheUrls(
  base: string,
  builtFiles: readonly string[],
  publicFiles: readonly string[] = PUBLIC_FILES,
): string[] {
  const files = builtFiles.filter((file) => !NOT_CACHED.has(file) && !file.endsWith('.map'));
  return [...new Set([...files, ...publicFiles])].sort().map((file) => base + file);
}

/**
 * One cache per build (D73): a new version installs its files in a new cache next to the old
 * one, and the old one is dropped once the new worker takes over.
 */
export function cacheName(buildId: string): string {
  return CACHE_PREFIX + buildId;
}

/** The caches of earlier builds of this app; never another site's caches. */
export function staleCaches(cacheNames: readonly string[], current: string): string[] {
  return cacheNames.filter((name) => name.startsWith(CACHE_PREFIX) && name !== current);
}
