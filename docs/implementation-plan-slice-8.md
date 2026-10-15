# DM Sidekick — Implementation plan: eighth slice (Hosting and offline use)

Status: **approved 2026-10-15.** D68 – D76 confirmed by the product owner (all proposals).
Source: `requirements.md` (§15 and §19: lokale persistence; Epic 11: DC-100; Epic 12: DC-110,
DC-113 and DC-114 for step 0). Follows up on slice 5, §6. Builds on the earlier slices; their architecture, decisions D1 – D67 and working
agreement still apply.

## 1. Goal

Until now the app only runs on the development PC (`npm run dev`, `npm run dev:phone`).
Before the first real session it must be on the phone at the table, without the PC and
without a network:

```
Push to main → GitHub builds and checks → https://hayew.github.io/dm-sidekick/
Phone: open the address → Add to Home Screen → DM Sidekick icon
At the table, flight mode: tap the icon → campaign list → play, refresh, import: all work
```

There is no new user story: this slice serves the product goal and DC-100 (mobile-first),
and §19's assumption that local persistence is enough. It changes no screen except that the
app gets an icon and opens full screen.

First, step 0: the app no longer ships with the two demo campaigns (D76). On the hosted app
the DM starts with an empty list and imports their own campaign file. The demo content stays
for the tests, as campaign files in `src/test/campaigns/`.

**Not in this slice:** exporting campaigns, moving data from the development address to the
hosted one (§6), a custom domain, update notifications, Undo after removing a combatant (D18).

## 2. Architecture

```
src/data/seed.ts                  removed: no demo campaigns (D76)
src/test/campaigns/*.md           the former demo campaigns as campaign files; the tests
src/test/testCampaigns.ts           import them with importTestCampaigns(), as the DM would
vite.config.ts                    base '/dm-sidekick/' for the build and `vite preview` (D69;
                                  dev server and tests stay at '/'); an inline plugin that
                                  emits 404.html as a copy of index.html; a small inline
                                  plugin that writes sw.js with the list of built files (D72)
src/main.tsx                      BrowserRouter basename from import.meta.env.BASE_URL;
                                  registers the service worker in production builds only
src/serviceWorker/precache.ts     pure: which built files to cache, and the cache name for
                                  this build (unit-tested)
src/serviceWorker/sw.ts           the service worker: precache on install, drop old caches
                                  on activate, answer from the cache first (D72, D73)
public/manifest.webmanifest       name, colours, standalone display, icons (D71)
public/icons/                     icon.svg and PNGs 192, 512 and apple-touch-icon 180 (D71)
.github/workflows/deploy.yml      on push to main: npm ci, npm run check, npm run build,
                                  publish dist/ to GitHub Pages (D68, D70)
```

- **Routes stay as they are.** Every screen keeps its URL (CLAUDE.md), now under
  `/dm-sidekick/`. `<Link to="/c/...">` works unchanged under the router's basename. The
  screen tests use `MemoryRouter` and need no change.
- **Refresh on a deep URL.** GitHub Pages knows only `index.html`; a refresh on
  `/dm-sidekick/c/imported-hollowmere/combat` would be a 404. The build copies `index.html` to `404.html`,
  so Pages serves the app there too (D69). Once the service worker runs, it answers every
  navigation with the cached `index.html`, online and offline.
- **No lazy chunks today.** The build is one JS and one CSS file plus `index.html`, so the
  precache list is small and complete from the first visit.
- **Storage stays `localStorage`.** Its keys already start with `dm-sidekick:` (commit
  ac695f5). `hayew.github.io` is shared by all GitHub Pages sites of that account; the prefix
  keeps them apart, and the service worker's scope is `/dm-sidekick/` only.

## 3. Screens

No screen changes beyond these. Visible differences on the phone:

- Without campaigns, the campaign list says "No campaigns yet. Import a campaign file to
  start." above the Import button (D76). Every campaign has a Delete button; the
  "· Imported" label is gone, since every campaign is imported.

- After **Add to Home Screen** the app has the DM Sidekick icon and name, and opens full
  screen without the browser's address bar (`display: standalone`).
- The campaign list shows the version in small, quiet text at the bottom, e.g.
  `Version 0.1.0 · 15 Oct 2026` (D74). That shows which build the phone runs.

## 4. Build order

Each step is small, ends with `npm run check` green and a working app, and is one commit.

**Progress:** step 0 (no demo campaigns) ✅ done · step 1 (base path) ✅ done · step 2
(GitHub Actions deploy): workflow written, waiting for GitHub Pages to be turned on and the
first deploy.

| Step | Content                                                                                  | Stories                | Tests                                                                                             |
| ---- | ---------------------------------------------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------- |
| 0    | No demo campaigns: the demo content moves to test campaign files; empty list message     | DC-110, DC-113, DC-114 | Empty list; Delete on every campaign; former demo names import; all screen tests on the files     |
| 1    | Base path `/dm-sidekick/`, router basename, `404.html`                                   | DC-100                 | Build; `npm run preview` in the browser: deep URL, refresh and back work under the base path      |
| 2    | GitHub Actions workflow: check, build, publish to Pages                                  | DC-100                 | First deploy; the hosted address opens a campaign, deep-URL refresh works                         |
| 3    | Installable: manifest, icons, meta tags, version on the campaign list                    | DC-100                 | Campaign-list test for the version text; manifest and icons load in the preview                   |
| 4    | Offline: service worker with precache list; registration in production only              | DC-100                 | Unit tests for the precache list and cache name; preview offline: reload and deep URLs still work |
| 5    | Ask the browser to keep the data (`navigator.storage.persist()`, D75)                    | DC-100                 | Unit test: asked once at start, missing API is no error                                           |
| 6    | Real-phone check: install, flight mode, refresh, import, combat, update to a new version | DC-100                 | Manual check                                                                                      |

Before step 2 the product owner turns on GitHub Pages in the repository (Settings → Pages →
Source: **GitHub Actions**); only the repository owner can. D68 needs the repository to be
public; if it is private, D68 changes to Netlify before step 2.

## 5. Decisions

Numbering continues from the seventh slice. **Status: D68 – D76 confirmed on 2026-10-15 by
the product owner (all proposals).**

- **D68 — Host: GitHub Pages**, built and published by GitHub Actions on every push to `main`.
  The repository is already on GitHub, it costs nothing and needs no extra account. On a free
  GitHub plan Pages needs a **public** repository. Alternative: Netlify (free, works with a
  private repository, needs a Netlify account linked to GitHub).
- **D69 — Address `https://hayew.github.io/dm-sidekick/`, with real URLs** (`BrowserRouter`
  with a basename, and `404.html` as a copy of `index.html`). Alternative: `HashRouter`
  (`.../#/c/imported-hollowmere`), which needs no `404.html` but gives every URL a `#`.
- **D70 — Every push to `main` deploys, but only if `npm run check` passes** in the workflow.
  A failing check leaves the previous version online. Alternative: deploy only by hand
  (a button in GitHub, "Run workflow").
- **D71 — Installable as a home-screen app**: a web app manifest, `display: standalone`,
  the dark theme colours from `src/index.css`, and a simple icon: a white d20 outline on the
  app's dark background, made as an SVG. The PNG sizes are drawn from that SVG once, in the
  browser, and committed, so no image tool or dependency is needed. Alternative: the product
  owner supplies an icon.
- **D72 — Offline with a hand-written service worker, no new dependency.** A small plugin in
  `vite.config.ts` writes `sw.js` with the list of built files; the worker caches them on
  install. Alternative: `vite-plugin-pwa` (Workbox), less code of our own but a large
  dependency tree (CLAUDE.md: no new dependencies without asking).
- **D73 — Updates take effect the next time the app is opened.** A new version is downloaded
  in the background while the DM plays; the open app is never reloaded in the middle of a
  combat. The next start (or a refresh) runs the new version. No "update available" message.
  Alternative: a quiet "New version — tap to reload" bar.
- **D74 — The campaign list shows the version** (`package.json` version and build date), small
  at the bottom. Alternative: no version shown.
- **D75 — Ask the browser to keep the data** (`navigator.storage.persist()`) at start. Chrome
  on Android then does not clear campaigns and combats when the phone is low on storage; on an
  iPhone, data of a home-screen app is kept anyway. No message to the DM either way.
  Alternative: don't ask.
- **D76 — No demo campaigns** (product owner, 2026-10-15). The app ships with no campaigns;
  the DM imports their own. Gone with them: the rule that an imported campaign may not take a
  demo campaign's name (D45), the rule that only imported campaigns can be deleted (DC-113),
  and the demo campaigns' starting player lists (D59: every campaign now starts with none).
  Imported campaign ids keep their `imported-` prefix (D47), so campaigns already stored on a
  device keep their current scene, combat and player characters. Data stored for the old demo
  campaigns (their scene, combat and player list) is no longer read; it does no harm. The demo content becomes the
  test campaigns: "Shadows over Millbrook" is the example in `docs/campaign-format.md`, and a
  test keeps the two the same.

## 6. Moving to the hosted app: what the DM needs to know

The browser keeps data per web address. Campaigns imported and player characters entered on
the development address (`http://<pc>:5173`) are **not** on the hosted address. On the
hosted app: import the campaign files again and enter the player characters again. Moving
that data is not in this slice (that would be export/import of everything, a later slice).

On an **iPhone**, a home-screen app has its own storage, separate from the same address in
Safari. So: add the app to the home screen first, then import the campaigns **from the
home-screen app**. Safari can clear data of a website that is not opened for a week; a
home-screen app is exempt. This goes in the real-phone check (step 6).

## 7. Working agreement

Same as the earlier slices (CLAUDE.md): one step at a time, `npm run check` green after
every step, no dependencies or features outside the step without asking. Pushing to GitHub
publishes the app (D70): Claude pushes only when asked.
