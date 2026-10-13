# DM Cockpit

Mobile-first web app for a Dungeon Master during a D&D session.

- Requirements: [`requirements.md`](requirements.md)
- Current plan: [`docs/implementation-plan-slice-1.md`](docs/implementation-plan-slice-1.md)

## Requirements

- [Node.js](https://nodejs.org/) 20.19+ or 22.12+ (LTS recommended)

## Getting started

```bash
npm install        # once, and after dependencies change
npm run dev        # start the dev server at http://localhost:5173
```

To try it on your phone: run `npm run dev:phone`, then open the "Network" URL it prints
on a phone connected to the same Wi-Fi.

## Scripts

| Command              | What it does                                  |
| -------------------- | --------------------------------------------- |
| `npm run dev`        | Dev server with instant reload                |
| `npm run dev:phone`  | Same, reachable from other devices on the LAN |
| `npm test`           | Run all tests once                            |
| `npm run test:watch` | Re-run tests on every save                    |
| `npm run typecheck`  | TypeScript type check                         |
| `npm run lint`       | ESLint                                        |
| `npm run check`      | Prettier check + type check + lint + tests    |
| `npm run format`     | Format all files with Prettier                |
| `npm run build`      | Type check + production build into `dist/`    |

## Project structure

```
src/
  domain/   pure TypeScript game logic, no React (from DC-001 on)
  data/     seed data and localStorage persistence
  ui/       screens and components
  test/     test setup
```
