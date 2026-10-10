# DM Cockpit — instructions for Claude

Mobile-first web app for a Dungeon Master during a D&D session. One DM, one device,
no backend. Goal: as few taps as possible during play ("look → tap → continue").

## Read first

- `requirements.md` — product requirements, domain model and user stories (Dutch).
  Story IDs look like `DC-001`. The requirements are the source of truth.
- `docs/implementation-plan-slice-1.md` — the current plan: architecture, routes,
  confirmed decisions (D1–D10) and the step-by-step build order with a **Progress** line.

When asked to "do the next step", take the next step from the plan's build order.

## Stack

React 19 + TypeScript (strict) + Vite, React Router, plain CSS / CSS modules,
Vitest + React Testing Library, ESLint + Prettier. Persistence: `localStorage`. No backend.

## Commands

```
npm test            # all tests once
npm run typecheck
npm run lint
npm run build       # typecheck + production build
npm run dev         # dev server, http://localhost:5173
```

The user is on Windows. The terminal may be PowerShell; use commands that work there.

## Architecture rules

- `src/domain/` — pure TypeScript game logic and types. No React, no storage, no browser APIs.
  All rules (combat ordering, damage, initiative) live here and are unit-tested.
- `src/data/` — seed data and persistence. Screens get campaigns via `src/data/campaigns.ts`,
  never by importing `seed.ts` directly.
- `src/ui/` — screens (`routes/`) and components. They call domain functions and render results.
- Order is array order (scenes, tiles, combatants). No `order` fields.
- A combatant is not the same object as a PlayerCharacter; combat never changes campaign data.
- Player characters have no HP (decision D3).
- Randomness (dice) is injectable so tests are deterministic.

## UX rules

- Mobile-first; touch targets at least 44 px; dark theme (variables in `src/index.css`).
- Frequent actions are one tap, directly in context: no confirmation dialogs, no forms in between.
- Every screen has its own URL so back button and refresh work.
- UI text is English (decision D10).

## Working agreement

1. Work on **one step / story at a time**. Don't build features outside the story.
2. Before writing code for a step, give a short plan (files you'll touch, tests you'll add)
   and wait for approval if anything in the story is ambiguous.
3. Domain logic gets unit tests; UI behaviour gets at least one component test.
   Name test `describe` blocks after the story, e.g. `DC-001 — Campaigns tonen`.
4. A step is done only when `npm test`, `npm run typecheck` and `npm run lint` all pass.
   Run them yourself and fix failures before reporting.
5. No new dependencies without asking.
6. If a requirement is unclear or contradicts the plan, stop and ask; don't guess.
   Record new decisions in the plan's decisions section.
7. At the end of a step: summarise what changed, update the plan's **Progress** line,
   and propose a commit message. Don't commit unless asked.
