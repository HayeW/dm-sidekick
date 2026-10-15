import { describe, expect, it } from 'vitest';
import { PUBLIC_FILES, cacheName, precacheUrls, staleCaches } from './precache';

describe('DC-100 — Mobile-first: offline precache list (D72)', () => {
  it('caches every built file and every public file under the base path', () => {
    expect(
      precacheUrls(
        '/dm-sidekick/',
        ['index.html', 'assets/index-abc.js', 'assets/index-def.css'],
        ['manifest.webmanifest', 'icons/icon.svg'],
      ),
    ).toEqual([
      '/dm-sidekick/assets/index-abc.js',
      '/dm-sidekick/assets/index-def.css',
      '/dm-sidekick/icons/icon.svg',
      '/dm-sidekick/index.html',
      '/dm-sidekick/manifest.webmanifest',
    ]);
  });

  it('leaves out the worker itself, the 404 fallback page and source maps', () => {
    expect(
      precacheUrls('/', ['index.html', 'sw.js', '404.html', 'assets/index-abc.js.map'], []),
    ).toEqual(['/index.html']);
  });

  it('lists each file once', () => {
    expect(
      precacheUrls('/', ['index.html', 'manifest.webmanifest'], ['manifest.webmanifest']),
    ).toEqual(['/index.html', '/manifest.webmanifest']);
  });

  it('names every file in public/, and only those', () => {
    const inFolder = Object.keys(import.meta.glob('../../public/**/*')).map((path) =>
      path.replace('../../public/', ''),
    );

    expect([...PUBLIC_FILES].sort()).toEqual(inFolder.sort());
  });
});

describe('DC-100 — Mobile-first: updates take effect at the next start (D73)', () => {
  it('gives every build its own cache', () => {
    expect(cacheName('2026-10-15T18:30:00.000Z')).toBe('dm-sidekick-2026-10-15T18:30:00.000Z');
  });

  it("drops the caches of earlier builds, but never another site's caches", () => {
    const current = cacheName('b2');

    expect(
      staleCaches([cacheName('b1'), current, 'other-site-v1', cacheName('b0')], current),
    ).toEqual([cacheName('b1'), cacheName('b0')]);
  });
});
