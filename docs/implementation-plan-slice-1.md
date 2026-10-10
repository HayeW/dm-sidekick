# DM Cockpit — Implementation plan: first vertical slice

Status: **draft for review** — no code has been written yet.
Source: `requirements.md` (product requirements, domain model, user stories).

## 1. Goal

Deliver the end-to-end flow from the requirements:

```
Campaign → Scene → Encounter → Start Combat → Damage → Add / move combatant → Leave combat → Return to combat
```

Stories in this slice (all from the "Eerste aanbevolen implementatievolgorde"):

| Story  | Title                          |
|--------|--------------------------------|
| DC-001 | Campaigns tonen                |
| DC-002 | Campaign openen                |
| DC-010 | Scene tonen                    |
| DC-011 | Intro tile openen              |
| DC-015 | Vorige scene                   |
| DC-016 | Volgende scene                 |
| DC-043 | Combat starten                 |
| DC-050 | Enemy initiative               |
| DC-051 | Players toevoegen              |
| DC-053 | Combatvolgorde tonen           |
| DC-060 | HP tonen                       |
| DC-061 | Damage toepassen               |
| DC-063 | Dead markeren                  |
| DC-064 | Combatant verplaatsen          |
| DC-065 | Combatant toevoegen            |
| DC-067 | Combatant verwijderen          |
| DC-071 | Combat-state herstellen        |

Implicitly also covered because the slice depends on them: DC-003 (last used scene),
DC-080/081/082 (local persistence), DC-100 (mobile-first layout).

**Not in this slice:** creating/editing campaigns, scenes, NPCs, locations, encounters or
player characters; opening Location/NPC/Notes tiles (P1); Quick Access; Random NPC;
healing; conditions.

## 2. Tech stack

| Concern        | Choice                                   | Why |
|----------------|------------------------------------------|-----|
| Language       | TypeScript (strict mode)                 | Type safety for the domain model. |
| UI             | React                                    | Mainstream, well supported, good fit for list-heavy UI. |
| Build / dev    | Vite                                     | Fast dev loop, static build, no server needed. |
| Routing        | React Router                             | Every screen gets a URL, so the phone's back button and refresh behave naturally. |
| Styling        | Plain CSS (CSS modules), mobile-first    | No extra framework to learn; the UI is small. |
| State          | React state + a small session store      | No state library until we need one. |
| Persistence    | `localStorage`                           | Requirements say local persistence is enough for v1. |
| Unit tests     | Vitest                                   | Shares Vite config. |
| Component tests| React Testing Library                    | Tests behaviour the DM sees, not implementation. |
| Lint/format    | ESLint + Prettier                        | Consistent code. |

No backend.

## 3. Architecture

Three layers, with dependencies pointing inward only:

```
src/
  domain/        Pure TypeScript. Types + functions. No React, no storage.
    campaign.ts    Campaign, Scene, ContentBlock, PlayerCharacter, Encounter types
    scene.ts       ordering, previous/next scene, which scene to open
    combat.ts      startCombat, applyDamage, move, add, remove
    dice.ts        d20 with an injectable random source (deterministic tests)
  data/
    seed.ts        Bundled demo campaigns (read-only in this slice)
    storage.ts     load/save SessionState + Combat to localStorage, with schema version
  ui/
    routes/        One component per screen
    components/    Tiles, CombatantRow, SceneNav, etc.
  main.tsx, App.tsx
```

Principle: **all game logic lives in `domain/` and is unit-tested without a browser.**
UI components call domain functions and render the result.

## 4. Domain model for this slice

Only the fields this slice needs. Everything else waits for a story.

```ts
type Campaign = {
  id: string;
  name: string;
  scenes: Scene[];               // array order = scene order
  playerCharacters: PlayerCharacter[];
  encounters: Encounter[];
};

type Scene = {
  id: string;
  title: string;
  blocks: ContentBlock[];        // array order = tile order
};

type ContentBlock =
  | { id: string; type: 'intro'; text: string }
  | { id: string; type: 'encounter'; encounterId: string }
  | { id: string; type: 'location'; title: string; text: string }   // shown, not openable yet
  | { id: string; type: 'npcs'; names: string[] }                    // shown, not openable yet
  | { id: string; type: 'notes'; text: string };                     // shown, not openable yet

type PlayerCharacter = { id: string; name: string };   // no HP (decision D3)

type Encounter = {
  id: string;
  name: string;
  enemies: EnemyGroup[];
};

type EnemyGroup = { name: string; count: number; hp: number; initiativeBonus: number };

// Runtime / session state — separate from campaign data
type Combatant = {
  id: string;
  name: string;                  // "Goblin 1", "Goblin 2", ...
  type: 'PLAYER' | 'ENEMY' | 'NPC';
  hp: number | null;             // null for PLAYER: HP not tracked (D3)
  maxHp: number | null;
};

type Combat = {
  id: string;
  campaignId: string;
  sceneId: string;
  encounterId: string | null;
  combatants: Combatant[];       // array order = combat order
};

type SessionState = {            // one per campaign
  campaignId: string;
  currentSceneId: string;
  activeCombat: Combat | null;
};
```

Modelling choices (following the requirements' domain model):

- **Order is the array order**, no `order` field. Move up/down = swap neighbours.
- **Initiative is not stored.** Used once to sort enemies at combat start.
- **DEAD is derived** from `hp === 0` rather than stored. One source of truth; healing a
  combatant later automatically "revives" it. Easy to change to an explicit state if needed.
- **Combatant ≠ PlayerCharacter.** Combat copies names/HP; it never mutates campaign data.

## 5. Screens and routes

| Route                                  | Screen | Stories |
|----------------------------------------|--------|---------|
| `/`                                    | Campaign list | DC-001 |
| `/c/:campaignId`                       | Redirects to the current (or first) scene | DC-002, DC-003 |
| `/c/:campaignId/s/:sceneId`            | Scene: tiles + previous/next | DC-010, DC-015, DC-016 |
| `/c/:campaignId/s/:sceneId/b/:blockId` | Tile detail (Intro only in this slice) | DC-011 |
| `/c/:campaignId/combat`                | Combat list | DC-053 – DC-067, DC-071 |

UX details:

- **Scene screen:** title at the top, tiles in a single column, a fixed bottom bar with
  `◀ Previous` / `Next ▶` (large touch targets). At the first/last scene the button is
  disabled.
- **Encounter tile:** shows `3 × Goblin, 1 × Goblin Boss` and a `START COMBAT` button
  directly on the tile (requirement §5). If a combat is already active, the tile shows
  `RESUME COMBAT` instead (see D1).
- **Persistent "Combat" indicator:** while a combat is active, a small bar on the scene
  screen links back to it, so leaving and returning costs one tap (DC-070/071).
- **Combat row:** `Goblin 2   7/7 HP   [−1] [−5] [−10]   [▲] [▼]  [⋯]`
  `⋯` reveals *Remove*. Dead combatants stay in place, greyed out with a `DEAD` label.
  Player character rows show only name, a `PC` marker and the move/remove controls — no HP.
- **Add combatant:** a button below the list opens a small inline form (name + HP),
  appended at the bottom. No initiative roll.

## 6. Persistence

- Key per campaign: `dm-cockpit:v1:session:<campaignId>`, value = `SessionState` as JSON.
- Saved on **every** change (scene change, every HP tap, every move). The data is tiny.
- Loaded at startup / when a campaign is opened. If the stored JSON is invalid or the
  schema version doesn't match, it is discarded and the app starts fresh for that campaign.
- Campaign data itself comes from `seed.ts` in this slice and is not stored.

## 7. Seed data

One or two demo campaigns, e.g. *"The Lost Mine"* with:
- 3 scenes, each with an Intro tile, plus Location/NPCs/Notes tiles for visual variety;
- one scene with an Encounter tile (`3 × Goblin`, `1 × Goblin Boss`);
- 4 player characters.

This is enough to demo and test the whole slice.

## 8. Build order

Each step is small, ends with green tests and a working app, and is one commit.

**Progress:** step 0 ✅ done · step 1 (DC-001) ✅ done · step 2 (DC-002, DC-010) ✅ done · **next: step 3**.
Update this line when a step is finished and committed.

| Step | Content | Stories | Tests |
|------|---------|---------|-------|
| 0 | Scaffold: Vite + React + TS, Vitest, RTL, ESLint, Prettier, React Router, git init, README | — | Smoke test runs |
| 1 | Domain types + seed data; campaign list screen; tap navigates to `/c/:id` (placeholder) | DC-001 | List renders names; tap navigates |
| 2 | Scene screen with compact tiles of all five types | DC-002, DC-010 | Opening a campaign shows its first scene; tiles render |
| 3 | Intro detail screen with one-tap back | DC-011 | Text shown; back returns to scene |
| 4 | Previous/next navigation, disabled at the edges | DC-015, DC-016 | Navigation + edge cases |
| 5 | Session storage: current scene remembered across refresh | DC-003, DC-080 | Storage round-trip; reopening goes to last scene |
| 6 | `startCombat` domain function: enemies expanded + numbered, initiative rolled and sorted, PCs appended | DC-043, DC-050, DC-051 | Deterministic tests with a fixed random source |
| 7 | Encounter tile + START COMBAT → combat screen showing order and HP (non-PCs only) | DC-053, DC-060 | One tap from tile to combat list; PCs show no HP |
| 8 | Damage buttons (non-PCs only), DEAD display | DC-061, DC-063 | HP decreases, clamps at 0, dead stays in place |
| 9 | Move up/down for any combatant | DC-064, DC-052, DC-066 | Swap logic incl. top/bottom edges |
| 10 | Add combatant (bottom of list), remove combatant | DC-065, DC-067 | Appended without initiative; removed |
| 11 | Persist combat; leave/return and refresh keep state; "Combat" bar on scene screen | DC-070, DC-071, DC-081, DC-082 | State identical after navigation and reload |
| 12 | Mobile polish pass: touch targets ≥ 44 px, test on a real phone | DC-100 | Manual check |

## 9. Decisions needed before or during the slice

These are open questions from `requirements.md` that actually block this slice. Answers in
**bold**. **Status: all confirmed on 2026-10-10; D3 changed by the product owner.**

- **D1 — Starting combat while one is active.** Proposal: **the encounter tile shows
  RESUME COMBAT; a small "New combat" option on the combat screen replaces it.** Only one
  active combat per campaign.
- **D2 — Where PCs go in the initial order.** PCs have no initiative. Proposal: **append
  PCs after the sorted enemies; the DM moves them into place** (DC-052).
- **D3 — PC hit points.** Decision: **HP is not tracked for player characters at all.**
  `PlayerCharacter` has no HP field; PC combatants have `hp: null`, show no HP and no damage
  buttons, and can never be DEAD. DC-060 in `requirements.md` has been updated accordingly.
- **D4 — HP below 0.** Proposal: **clamp at 0.**
- **D5 — Duplicate enemies.** Proposal: **number them: "Goblin 1", "Goblin 2", "Goblin 3".**
  A group of one keeps its plain name ("Goblin Boss").
- **D6 — Initiative ties.** Proposal: **higher bonus first, then random.**
- **D7 — Remove combatant UX.** Proposal: **remove via the `⋯` menu, no confirmation dialog,
  with a short "Undo" toast.** (Undo can be dropped if it adds too much for this slice.)
- **D8 — Add combatant fields.** Proposal: **name (required) and HP (optional), type ENEMY
  by default.**
- **D9 — No previous/next scene.** Proposal: **button disabled.**
- **D10 — Language of the UI.** Requirements are in Dutch, examples in English
  ("START COMBAT"). Proposal: **English UI text.**

Not blocking for this slice: combat lifetime/cleanup (old combat simply stays until replaced),
healing controls, Quick Access contents, campaign editing.

## 10. Working agreement

- One step from §8 at a time; I stop after each step for review.
- Every step: domain logic covered by unit tests; UI behaviour by at least one component test.
- No dependencies beyond the ones in §2 without asking.
- No features from outside the story being implemented.
- `npm run dev`, `npm test` and `npm run build` must work after every step.
