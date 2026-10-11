# DM Cockpit — Implementation plan: first vertical slice

Status: **draft for review** — no code has been written yet.
Source: `requirements.md` (product requirements, domain model, user stories).

## 1. Goal

Deliver the end-to-end flow from the requirements:

```
Campaign → Scene → Encounter → Start Combat → Damage → Add / move combatant → Leave combat → Return to combat
```

Stories in this slice (all from the "Eerste aanbevolen implementatievolgorde"):

| Story  | Title                                           |
| ------ | ----------------------------------------------- |
| DC-001 | Campaigns tonen                                 |
| DC-002 | Campaign openen                                 |
| DC-010 | Scene tonen                                     |
| DC-011 | Descriptions tile openen                        |
| DC-015 | Vorige scene                                    |
| DC-016 | Volgende scene                                  |
| DC-017 | Swipen tussen beschrijvingen (added 2026-10-10) |
| DC-043 | Combat starten                                  |
| DC-050 | Initiële enemy-volgorde (D19)                   |
| DC-051 | Players toevoegen                               |
| DC-053 | Combatvolgorde tonen                            |
| DC-060 | HP tonen                                        |
| DC-061 | Damage toepassen                                |
| DC-063 | Dead markeren                                   |
| DC-064 | Combatant verplaatsen                           |
| DC-065 | Combatant toevoegen                             |
| DC-067 | Combatant verwijderen                           |
| DC-071 | Combat-state herstellen                         |

Implicitly also covered because the slice depends on them: DC-003 (last used scene),
DC-080/081/082 (local persistence), DC-100 (mobile-first layout).

**Not in this slice:** creating/editing campaigns, scenes, NPCs, locations, encounters or
player characters; opening Location/NPC/Notes tiles (P1); Quick Access; Random NPC;
healing; conditions.

## 2. Tech stack

| Concern         | Choice                                | Why                                                                               |
| --------------- | ------------------------------------- | --------------------------------------------------------------------------------- |
| Language        | TypeScript (strict mode)              | Type safety for the domain model.                                                 |
| UI              | React                                 | Mainstream, well supported, good fit for list-heavy UI.                           |
| Build / dev     | Vite                                  | Fast dev loop, static build, no server needed.                                    |
| Routing         | React Router                          | Every screen gets a URL, so the phone's back button and refresh behave naturally. |
| Styling         | Plain CSS (CSS modules), mobile-first | No extra framework to learn; the UI is small.                                     |
| State           | React state + a small session store   | No state library until we need one.                                               |
| Persistence     | `localStorage`                        | Requirements say local persistence is enough for v1.                              |
| Unit tests      | Vitest                                | Shares Vite config.                                                               |
| Component tests | React Testing Library                 | Tests behaviour the DM sees, not implementation.                                  |
| Lint/format     | ESLint + Prettier                     | Consistent code.                                                                  |

No backend.

## 3. Architecture

Three layers, with dependencies pointing inward only:

```
src/
  domain/        Pure TypeScript. Types + functions. No React, no storage.
    campaign.ts    Campaign, Scene, ContentBlock, PlayerCharacter, Encounter types
    scene.ts       ordering, previous/next scene, which scene to open
    combat.ts      startCombat, applyDamage, move, add, remove
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
  scenes: Scene[]; // array order = scene order
  playerCharacters: PlayerCharacter[];
  encounters: Encounter[];
};

type Scene = {
  id: string;
  title: string;
  blocks: ContentBlock[]; // array order = tile order
};

type ContentBlock =
  | { id: string; type: 'descriptions'; descriptions: Description[] } // array order (D11)
  | { id: string; type: 'encounter'; encounterId: string }
  | { id: string; type: 'location'; title: string; text: string } // shown, not openable yet
  | { id: string; type: 'npcs'; names: string[] } // shown, not openable yet
  | { id: string; type: 'notes'; text: string }; // shown, not openable yet

type Description = { id: string; title: string; text: string }; // e.g. "Intro"

type PlayerCharacter = { id: string; name: string }; // no HP (decision D3)

type Encounter = {
  id: string;
  name: string;
  enemies: EnemyGroup[];
};

type EnemyGroup = { name: string; count: number; hp: number };

// Runtime / session state — separate from campaign data
type Combatant = {
  id: string;
  name: string; // "Goblin 1", "Goblin 2", ...
  type: 'PLAYER' | 'ENEMY' | 'NPC';
  hp: number | null; // null for PLAYER: HP not tracked (D3)
  maxHp: number | null;
};

type Combat = {
  // no id: one active combat per campaign (D15)
  campaignId: string;
  sceneId: string;
  encounterId: string | null;
  combatants: Combatant[]; // array order = combat order
};

type SessionState = {
  // one per campaign
  campaignId: string;
  currentSceneId: string;
  activeCombat: Combat | null;
};
```

Modelling choices (following the requirements' domain model):

- **Order is the array order**, no `order` field. Move up/down = swap neighbours.
- **No initiative** (D19). Enemies start in alphabetical order; after that the list order counts.
- **DEAD is derived** from `hp === 0` rather than stored. One source of truth; healing a
  combatant later automatically "revives" it. Easy to change to an explicit state if needed.
- **Combatant ≠ PlayerCharacter.** Combat copies names/HP; it never mutates campaign data.

## 5. Screens and routes

| Route                                                   | Screen                                                           | Stories                 |
| ------------------------------------------------------- | ---------------------------------------------------------------- | ----------------------- |
| `/`                                                     | Campaign list                                                    | DC-001                  |
| `/c/:campaignId`                                        | Redirects to the current (or first) scene                        | DC-002, DC-003          |
| `/c/:campaignId/s/:sceneId`                             | Scene: tiles + previous/next                                     | DC-010, DC-015, DC-016  |
| `/c/:campaignId/s/:sceneId/b/:blockId`                  | Tile detail (Descriptions only in this slice): first description | DC-011                  |
| `/c/:campaignId/s/:sceneId/b/:blockId/d/:descriptionId` | Tile detail: a specific description                              | DC-011                  |
| `/c/:campaignId/combat`                                 | Combat list                                                      | DC-053 – DC-067, DC-071 |

UX details:

- **Scene screen:** title at the top, tiles in a single column, a fixed bottom bar with
  `◀ Previous` / `Next ▶` (large touch targets). At the first/last scene the button is
  disabled.
- **Encounter tile:** shows `3 × Goblin, 1 × Goblin Boss` and a `START COMBAT` button
  directly on the tile (requirement §5). If a combat is already active, the tile shows
  `RESUME COMBAT` instead (see D1).
- **Persistent "Combat" indicator:** while a combat is active, a small bar on the scene
  screen links back to it, so leaving and returning costs one tap (DC-070/071).
- **Combat row:** `Goblin 2   7/7 HP   [−1] [−5] [−10]`; in reorder mode ▲ ▼ ✕ replace the
  damage buttons (D17, D18). Dead combatants stay in place, greyed out with a `DEAD` label.
  Player character rows show only name, a `PC` marker and, in reorder mode, ▲ ▼ ✕ — no HP.
- **Add combatant:** a button below the list opens a small inline form (name + HP),
  appended at the bottom, not alphabetically. Then the screen switches to reorder mode (D18).

## 6. Persistence

- Key per campaign: `dm-cockpit:v1:session:<campaignId>`, value = `SessionState` as JSON.
- Saved on **every** change (scene change, every HP tap, every move). The data is tiny.
- Loaded at startup / when a campaign is opened. If the stored JSON is invalid or the
  schema version doesn't match, it is discarded and the app starts fresh for that campaign.
- Campaign data itself comes from `seed.ts` in this slice and is not stored.
- Step 5 stores only `campaignId` and `currentSceneId`; `activeCombat` is added in step 7a
  (optional field). Data without it means "no active combat", so no new key version is needed.
  Saving the current scene keeps the active combat and vice versa.

## 7. Seed data

One or two demo campaigns, e.g. _"The Lost Mine"_ with:

- 3 scenes, each with a Descriptions tile (some with more than one description), plus Location/NPCs/Notes tiles for visual variety;
- one scene with an Encounter tile (`3 × Goblin`, `1 × Goblin Boss`);
- 4 player characters.

This is enough to demo and test the whole slice.

## 8. Build order

Each step is small, ends with green tests and a working app, and is one commit.

**Progress:** step 0 ✅ done · step 1 (DC-001) ✅ done · step 2 (DC-002, DC-010) ✅ done · step 3 (DC-011) ✅ done · step 4 (DC-015, DC-016) ✅ done · step 4a (DC-017) ✅ done · step 5 (DC-003, DC-080) ✅ done · step 6 (DC-043, DC-050, DC-051) ✅ done · step 7 (DC-053, DC-060) ✅ done · step 7a (DC-081) ✅ done · step 8 (DC-061, DC-063) ✅ done · step 9 (DC-064, DC-052) ✅ done · step 10 (DC-065, DC-066, DC-067) ✅ done · **next: step 11**.
Update this line when a step is finished and committed.

| Step | Content                                                                                                                       | Stories                        | Tests                                                                                        |
| ---- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------ | -------------------------------------------------------------------------------------------- |
| 0    | Scaffold: Vite + React + TS, Vitest, RTL, ESLint, Prettier, React Router, git init, README                                    | —                              | Smoke test runs                                                                              |
| 1    | Domain types + seed data; campaign list screen; tap navigates to `/c/:id` (placeholder)                                       | DC-001                         | List renders names; tap navigates                                                            |
| 2    | Scene screen with compact tiles of all five types                                                                             | DC-002, DC-010                 | Opening a campaign shows its first scene; tiles render                                       |
| 3    | Descriptions detail screen with one-tap back; previous/next description (D11)                                                 | DC-011                         | Text shown; back returns to scene; navigation + edge cases                                   |
| 4    | Previous/next navigation, disabled at the edges                                                                               | DC-015, DC-016                 | Navigation + edge cases                                                                      |
| 4a   | Swipe left/right between descriptions on the detail screen                                                                    | DC-017                         | Swipe direction rules (distance, mostly horizontal); swipe navigates like the buttons        |
| 5    | Session storage: current scene remembered across refresh                                                                      | DC-003, DC-080                 | Storage round-trip; reopening goes to last scene                                             |
| 6    | `startCombat` domain function: enemies expanded + numbered, sorted alphabetically (D19; was an initiative roll), PCs appended | DC-043, DC-050, DC-051         | Alphabetical, natural order, case-insensitive                                                |
| 7    | Encounter tile + START COMBAT → combat screen showing order and HP (non-PCs only)                                             | DC-053, DC-060                 | One tap from tile to combat list; PCs show no HP                                             |
| 7a   | Persist the active combat, so a refresh keeps it (added 2026-10-11, see D16)                                                  | DC-081                         | Combat and RESUME COMBAT survive a reload; scene and combat saves don't overwrite each other |
| 8    | Damage buttons (non-PCs only), DEAD display                                                                                   | DC-061, DC-063                 | HP decreases, clamps at 0, dead stays in place                                               |
| 9    | Move up/down for any combatant                                                                                                | DC-064, DC-052                 | Swap logic incl. top/bottom edges                                                            |
| 10   | Add combatant (bottom of list), move it into place, remove combatant                                                          | DC-065, DC-066, DC-067         | Appended at the bottom, not sorted; movable; removed                                         |
| 11   | Every combat change saved; leave/return and refresh keep state; "Combat" bar on scene screen                                  | DC-070, DC-071, DC-081, DC-082 | State identical after navigation and reload                                                  |
| 12   | Mobile polish pass: touch targets ≥ 44 px, test on a real phone                                                               | DC-100                         | Manual check                                                                                 |

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
  _Replaced by D19: there is no initiative anymore._
- **D7 — Remove combatant UX.** Proposal: **remove via the `⋯` menu, no confirmation dialog,
  with a short "Undo" toast.** (Undo can be dropped if it adds too much for this slice.)
  _Replaced by D18: ✕ in reorder mode, no Undo for now._
- **D8 — Add combatant fields.** Proposal: **name (required) and HP (optional), type ENEMY
  by default.**
- **D9 — No previous/next scene.** Proposal: **button disabled.**
- **D10 — Language of the UI.** Requirements are in Dutch, examples in English
  ("START COMBAT"). Proposal: **English UI text.**
- **D11 — Descriptions tile replaces the Intro tile** (product owner, 2026-10-10). A
  `descriptions` block holds an ordered list of descriptions, each with its own title and
  text (e.g. "Intro", "Arriving at the end"). On the scene the tile shows the count and a
  preview of the first description; one tap opens the first description. The detail screen
  has `◀ Previous` / `Next ▶` buttons (disabled at the edges, hidden when there is only one).
  Previous/next replace the history entry, so one tap on Back always returns to the scene.
- **D12 — Back button goes back scene by scene** (product owner, 2026-10-10). Previous/next
  scene adds a history entry, so the phone's back button returns to the previously viewed
  scene. Unlike descriptions (D11), which replace the entry so Back returns to the scene in
  one tap. Both use one fixed bottom bar (`StepNav`).
- **D13 — Scroll position** (2026-10-10, from code review). A newly opened screen (link,
  previous/next, swipe) starts at the top. Going back keeps the browser's scroll position,
  so the DM returns to where they were on the previous screen.
- **D14 — No swipe while zoomed in** (2026-10-10, from code review; refines DC-017). While
  the page is zoomed in, one finger pans the text, so it is not treated as a swipe.
- **D15 — Combat has no id** (2026-10-11, step 6). There is only one active combat per
  campaign (D1) and it is stored under the campaign's session, so nothing needs a combat id.
  Combatant ids are unique within a combat: `enemy:<n>` for encounter enemies and
  `pc:<playerCharacterId>` for player characters. Combatants added later (DC-065) must use
  their own scheme so they cannot collide with these.
- **D16 — Active combat persisted early** (product owner, 2026-10-11, steps 7 and 7a). Step 7
  kept the active combat in memory only, so a refresh lost it. Because a phone can reload a
  page on its own mid-session, saving it (DC-081) was moved forward into step 7a: the combat
  is stored in the campaign's session; an in-memory copy keeps it working for the rest of the
  visit when storage is blocked. Steps 8–10 save each change as they are built.
  Known limitation: if a later save fails (e.g. storage full), memory has the newest state
  but storage keeps the older one, so a refresh brings back the older combat.
  The encounter tile already shows RESUME COMBAT while a combat is active (D1), so a second
  tap cannot wipe out a running combat. "New combat" and the Combat bar come later.
  Known limitation: "active" is per campaign, so while a combat runs every encounter tile in
  the campaign shows RESUME COMBAT; starting a combat for another encounter needs "New
  combat" (not built yet) or a refresh. Fine for now: the seed has one encounter.
- **D17 — Reorder mode** (product owner, 2026-10-11, step 9). Damage buttons and ▲ ▼ don't
  both fit on one row on a phone, so moving happens in a reorder mode: a `Reorder` / `Done`
  button next to the heading swaps the damage buttons for ▲ ▼ on every row (▲ disabled at
  the top, ▼ at the bottom). A new combat opens in reorder mode, because placing the PCs is
  the first thing to do; RESUME COMBAT opens normal mode. The mode is in the URL
  (`/combat?mode=reorder`) so a refresh keeps it; switching replaces the history entry, so
  Back still returns to the scene in one tap. This replaces the single-row layout in §5.
- **D18 — Add and remove combatants** (product owner, 2026-10-11, step 10; replaces D7's
  `⋯` menu). Reorder mode is the "edit the list" mode: every row there shows ▲ ▼ ✕, and ✕
  removes the combatant with one tap, no confirmation. Normal mode only has damage buttons,
  so a remove cannot happen by accident during play. The Undo toast from D7 is dropped for
  now (see open follow-ups). `+ Add combatant` below the list opens an inline form (name
  required, HP optional, type ENEMY, D8); the combatant is appended at the bottom, not
  sorted, and the screen switches to reorder mode to move it into place
  (DC-066). Enter in the name field moves on to HP instead of adding. Added combatants get
  ids `added:<n>` (D15). An added combatant without HP shows its name only: no HP, no
  damage buttons, never DEAD, and it is not a PC (PC = type `PLAYER`).
- **D19 — No dice: enemies start in alphabetical order** (product owner, 2026-10-11, after
  step 10; replaces DC-050's initiative roll and D6). The app rolls no dice and has no
  initiative. At combat start the enemies are sorted alphabetically, ignoring case and accents, in
  natural order ("Goblin 2" before "Goblin 10"); equal names keep encounter order. PCs
  still follow in campaign order (D2). Added combatants still go to the bottom (DC-065).
  `EnemyGroup` loses `initiativeBonus`; `dice.ts` and the random source go. Dice in Quick
  Access is dropped from the requirements; Random NPC is left as it is until its epic.

Not blocking for this slice: combat lifetime/cleanup (old combat simply stays until replaced),
healing controls, Quick Access contents, campaign editing.

**Open follow-ups** (accepted for now, to be fixed later):

- **Resume is per campaign, not per encounter** (from D16, accepted by the product owner on
  2026-10-11). While a combat runs, every encounter tile in the campaign shows RESUME COMBAT,
  so a combat for another encounter can only start after a refresh. Fix together with the
  "New combat" option from D1, e.g. by letting a tile for a different encounter offer to
  start a new combat.
- **No Undo after removing a combatant** (from D18, accepted by the product owner on
  2026-10-11). A mis-tap on ✕ in reorder mode loses that combatant and its HP; the DM can
  add it again by hand. Revisit in step 12 (more room between ▼ and ✕) or with an Undo toast.

## 10. Working agreement

- One step from §8 at a time; I stop after each step for review.
- Every step: domain logic covered by unit tests; UI behaviour by at least one component test.
- No dependencies beyond the ones in §2 without asking.
- No features from outside the story being implemented.
- `npm run dev`, `npm test` and `npm run build` must work after every step.
