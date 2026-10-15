# DM Sidekick — instructions for Claude

Mobile-first web app for a Dungeon Master during a D&D session. One DM, one device,
no backend. Goal: as few taps as possible during play ("look → tap → continue").

## Read first

- `requirements.md` — product requirements, domain model and user stories (Dutch).
  Story IDs look like `DC-001`. The requirements are the source of truth.
- `docs/implementation-plan-slice-7.md` — the current plan (Ending a combat): architecture,
  screens, decisions D63–D67 and the step-by-step build order with a **Progress** line.
- `docs/campaign-format.md` — the Markdown campaign file format the import reads.
- `docs/implementation-plan-slice-1.md` to `-slice-6.md` — the earlier slices, done:
  architecture and decisions D1–D62, which still apply.

When asked to "do the next step", take the next step from the plan's build order.

## Stack

React 19 + TypeScript (strict) + Vite, React Router, plain CSS / CSS modules,
Vitest + React Testing Library, ESLint + Prettier. Persistence: `localStorage`. No backend.

## Commands

```
npm run check       # everything a step needs: prettier --check, typecheck, lint, all tests
npm test            # all tests once
npx vitest run src/ui/routes/CombatPage.test.tsx   # one test file, while iterating
npm run format      # fix Prettier formatting
npm run build       # typecheck + production build
npm run dev         # dev server, http://localhost:5173
```

Screen tests live next to their screen (`src/ui/routes/<Screen>.test.tsx`) and render the
whole app at a URL; shared helpers are in `src/test/app.tsx`. Use its `setupUser()`
(user-event without delays) rather than `userEvent.setup()`. While iterating, run only the
relevant test file; run `npm run check` once at the end. `requirements.md` is excluded from
Prettier: it is the product owner's document, keep its formatting as is.

The user is on Windows. The terminal may be PowerShell; use commands that work there.

## Architecture rules

- `src/domain/` — pure TypeScript game logic and types. No React, no storage, no browser APIs.
  All rules (combat ordering, damage) live here and are unit-tested.
- `src/data/` — seed data and persistence. Screens get campaigns via `src/data/campaigns.ts`,
  never by importing `seed.ts` directly.
- `src/ui/` — screens (`routes/`) and components. They call domain functions and render results.
- Order is array order (scenes, tiles, combatants). No `order` fields.
- A combatant is not the same object as a PlayerCharacter; combat never changes campaign data.
- Player characters have no HP (decision D3).
- No dice and no initiative (decision D19). Any future randomness must be injectable so tests
  are deterministic.

## UX rules

- Mobile-first; touch targets at least 44 px; dark theme (variables in `src/index.css`).
- Frequent actions are one tap, directly in context: no confirmation dialogs, no forms in between.
- Every screen has its own URL so back button and refresh work.
- UI text is English (decision D10).

## Verifying in the browser

- For gesture and touch changes (drag, swipe, long press), verify in the desktop viewport
  only (`resize_window` preset `desktop`): the mobile preset scales the page, so mouse
  coordinates miss their target. The product owner tests the touch feel on a real phone.

## Working agreement

1. Work on **one step / story at a time**. Don't build features outside the story.
2. Before writing code for a step, give a short plan (files you'll touch, tests you'll add)
   and wait for approval if anything in the story is ambiguous.
3. Domain logic gets unit tests; UI behaviour gets at least one component test.
   Name test `describe` blocks after the story, e.g. `DC-001 — Campaigns tonen`.
4. A step is done only when `npm run check` passes (formatting, types, lint, all tests).
   Run it yourself and fix failures before reporting.
5. No new dependencies without asking. Never approve npm install scripts (`allowScripts`,
   `npm install-scripts approve`) without asking; npm blocks them by default as protection
   against supply-chain attacks. esbuild's blocked postinstall is known and harmless.
6. If a requirement is unclear or contradicts the plan, stop and ask; don't guess.
   Record new decisions in the current plan's decisions section.
7. When the checks pass, have the `code-reviewer` agent (`.claude/agents/code-reviewer.md`)
   review the uncommitted changes. Fix clear bugs and test gaps it finds and re-run the checks;
   report the remaining findings to the user with a recommendation instead of deciding alone.
8. At the end of a step: summarise what changed (including the review outcome), update the
   plan's **Progress** line, and propose a commit message. Don't commit unless asked.
