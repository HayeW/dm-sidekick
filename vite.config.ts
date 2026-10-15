import { defineConfig, type Plugin } from 'vitest/config';
import react from '@vitejs/plugin-react';
import packageJson from './package.json';
import { SERVICE_WORKER_FILE, cacheName, precacheUrls } from './src/serviceWorker/precache';

// GitHub Pages serves the app at https://hayew.github.io/dm-sidekick/ (D69).
const pagesBase = '/dm-sidekick/';

// GitHub Pages knows only index.html; a refresh on a deep URL would be a 404. Pages serves
// 404.html for unknown paths, so a copy of index.html makes it load the app there too (D69).
function spaFallback(): Plugin {
  return {
    name: 'spa-fallback-404',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const index = bundle['index.html'];
      if (index?.type !== 'asset') return;
      this.emitFile({ type: 'asset', fileName: '404.html', source: index.source });
    },
  };
}

// The moment of this build: its date for the version line, and its id for the cache name.
const buildTime = new Date().toISOString();

// Writes the list of files to cache and this build's cache name into sw.js (D72, D73).
function precacheServiceWorker(): Plugin {
  let base = '/';
  return {
    name: 'precache-service-worker',
    enforce: 'post',
    configResolved(config) {
      base = config.base;
    },
    generateBundle(_options, bundle) {
      const worker = bundle[SERVICE_WORKER_FILE];
      if (worker?.type !== 'chunk') return;
      if (!worker.code.includes('__PRECACHE__')) {
        this.error(`${SERVICE_WORKER_FILE} has no __PRECACHE__ to fill in`);
      }
      // The worker is a classic script: it may not import a chunk it shares with the app.
      if (worker.imports.length > 0) {
        this.error(`${SERVICE_WORKER_FILE} imports ${worker.imports.join(', ')}; keep it one file`);
      }
      const precache = {
        cacheName: cacheName(buildTime),
        urls: precacheUrls(base, Object.keys(bundle)),
      };
      worker.code = worker.code.replaceAll('__PRECACHE__', JSON.stringify(precache));
    },
  };
}

export default defineConfig(({ command, isPreview }) => ({
  // The dev server and the tests stay at '/'; the build and `npm run preview` use the Pages path.
  base: command === 'build' || isPreview ? pagesBase : '/',
  plugins: [react(), spaFallback(), precacheServiceWorker()],
  build: {
    rollupOptions: {
      // The service worker is a second entry, at the root so its scope is the whole app.
      input: { index: 'index.html', sw: 'src/serviceWorker/sw.ts' },
      output: {
        entryFileNames: (chunk) =>
          chunk.name === 'sw' ? SERVICE_WORKER_FILE : 'assets/[name]-[hash].js',
      },
    },
  },
  // The version line on the campaign list (D74); see src/buildInfo.d.ts. The build date is
  // the UTC date, as on GitHub Actions, which builds the version the phone runs.
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
    __BUILD_DATE__: JSON.stringify(buildTime.slice(0, 10)),
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
}));
