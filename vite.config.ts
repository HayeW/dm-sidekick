import { defineConfig, type Plugin } from 'vitest/config';
import react from '@vitejs/plugin-react';
import packageJson from './package.json';

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

export default defineConfig(({ command, isPreview }) => ({
  // The dev server and the tests stay at '/'; the build and `npm run preview` use the Pages path.
  base: command === 'build' || isPreview ? pagesBase : '/',
  plugins: [react(), spaFallback()],
  // The version line on the campaign list (D74); see src/buildInfo.d.ts. The build date is
  // the UTC date, as on GitHub Actions, which builds the version the phone runs.
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
    __BUILD_DATE__: JSON.stringify(new Date().toISOString().slice(0, 10)),
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
}));
