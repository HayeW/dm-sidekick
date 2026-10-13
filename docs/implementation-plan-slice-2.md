# DM Cockpit — Implementation plan: second slice (Quick Access)

Status: **done 2026-10-13.** Decisions D22–D28 confirmed by the product owner: all
proposals, with option C for D25. All steps built; checked on a real phone by the product
owner.
Source: `requirements.md` (§6 Quick Access, Epic 3, domain model §2, §5, §6, §13).
Builds on the first slice (`docs/implementation-plan-slice-1.md`): its architecture,
decisions D1–D21 and working agreement still apply.

## 1. Goal

Give the DM one universal escape hatch, reachable from every screen inside a campaign, for
things that are not part of the current scene (requirements §6):

```
Scene / Tile / Combat → Quick Access → Combat | Campaign NPCs | Locations | Campaign Notes → Back
```

Stories in this slice:

| Story  | Title                    | Priority | Notes                                            |
| ------ | ------------------------ | -------- | ------------------------------------------------ |
| DC-020 | Quick Access openen      | P1       | Core                                             |
| DC-021 | Quick Access items tonen | P1       | Combat, Campaign NPCs, Locations, Campaign Notes |
| DC-012 | Location tile openen     | P1       | Same screen as the Locations list (D25)          |
| DC-013 | NPC tile openen          | P1       | Same screen as the Campaign NPCs list (D25)      |
| DC-014 | Notes tile openen        | P1       | Scene's own notes, full text (D28)               |

Also closes the open follow-up from D20: **no one-tap way back to combat from another
scene**. With Quick Access it is two taps from any screen (Quick Access → Combat).

**Not in this slice:** Random NPC (Epic 10; it will become a Quick Access item later),
Rules / references and Global Notes (no story yet), creating or editing NPCs, locations or
notes (Epic 4), healing (DC-062), "New combat" (D1), resume per encounter.

## 2. What exists today

- Routes: campaign list, campaign redirect, scene, tile detail (Descriptions only), combat.
- Scene screen: back link to the campaign list at the top, tiles, a fixed bottom bar with
  `◀ Previous` / `Next ▶` (`StepNav`). Tile detail uses the same bottom bar. The combat
  screen has a back link to its scene and no bottom bar.
- Domain: `Campaign` has `scenes`, `playerCharacters` and `encounters`. NPCs, locations and
  notes exist only inside scene tiles: `{ type: 'npcs'; names: string[] }`,
  `{ type: 'location'; title; text }`, `{ type: 'notes'; text }`. They are shown on the
  scene but cannot be opened.
- Campaign data comes from `seed.ts` (read-only); only session state and the active combat
  are stored.

## 3. Screens and routes

| Route                                  | Screen                          | Stories        | Step |
| -------------------------------------- | ------------------------------- | -------------- | ---- |
| `/c/:campaignId/quick`                 | Quick Access                    | DC-020, DC-021 | 1    |
| `/c/:campaignId/npcs`                  | Campaign NPCs (list)            | DC-021         | 5    |
| `/c/:campaignId/npcs/:npcId`           | One NPC                         | DC-013         | 5    |
| `/c/:campaignId/locations`             | Campaign Locations (list)       | DC-021         | 6    |
| `/c/:campaignId/locations/:locationId` | One location                    | DC-012         | 6    |
| `/c/:campaignId/notes`                 | Campaign Notes (list)           | DC-021         | 7    |
| `/c/:campaignId/notes/:noteId`         | One campaign note               | DC-021         | 7    |
| (existing tile route)                  | A scene's Notes tile, full text | DC-014         | 7    |

UX details (see decisions):

- **Opening (D22):** a `Quick` button in a shared top bar on every screen inside a campaign:
  scene, tile detail, combat, and the new list/detail screens. The back link stays on the
  left of the top bar, Quick Access goes on the right. Not on the campaign list (there is
  no campaign yet).
- **Quick Access screen (D23):** a full-screen list of large rows (≥ 44 px, one tap each) with
  a `✕ Close` button that does the same as the phone's Back. It has its own URL, so Back
  closes it and refresh keeps it open.
- **Items (D24):** in this order: `Combat`, `Campaign NPCs`, `Locations`, `Campaign Notes`.
  The Combat row shows the encounter name of the active combat; without an active combat it
  is shown but disabled, with "No active combat" (D27), so the rows never shift position.
- **History:** tapping an item replaces the Quick Access entry (like descriptions, D11). So
  scene → Quick Access → Combat, then Back, returns to the scene in one tap.

## 4. Domain model changes (D25)

Following the requirements' domain model (§2, §5, §6, §13): NPCs, locations and notes become
campaign data, and scene tiles refer to them by id, as the encounter tile already does.

```ts
type Campaign = {
  // existing: id, name, scenes, playerCharacters, encounters
  npcs: Npc[]; // array order = list order
  locations: CampaignLocation[];
  notes: Note[]; // campaign notes, not tied to a scene (D28)
};

type Npc = { id: string; name: string; description: string }; // D26
type CampaignLocation = { id: string; name: string; description: string }; // D26; not `Location` (browser/router type)
type Note = { id: string; title: string; text: string };

type ContentBlock =
  | DescriptionsBlock
  | { id: string; type: 'encounter'; encounterId: string }
  | { id: string; type: 'location'; locationId: string } // was title + text
  | { id: string; type: 'npcs'; npcIds: string[] } // was names; one NPC in many scenes (DC-033)
  | { id: string; type: 'notes'; text: string }; // unchanged: the scene's own DM notes (D28)
```

- The seed data moves its NPC and location texts into `campaign.npcs` / `campaign.locations`
  and gets a few campaign notes. The scene screen must look the same as before, with one
  accepted exception (product owner, 2026-10-13): the NPC tile shows names only ("Marta
  Hollow, Old Fenn"); roles like "innkeeper" moved into the NPC's description.
- An id that refers to nothing (bad seed data) never crashes: an unknown NPC is left out of
  the NPCs tile ("No NPCs" when none is left), an unknown location shows "Location not
  found", like "Encounter not found". Covered by unit tests, and a seed test checks that
  every reference resolves.
- No persistence changes: campaign data is still seed data; session and combat storage are
  untouched.

## 5. Build order

Each step is small, ends with green checks (`npm run check`) and a working app, and is one
commit.

**Progress:** step 1 (DC-020) ✅ done · step 2 (DC-020) ✅ done · step 3 (DC-021) ✅ done · step 4 (entities) ✅ done · step 5 (DC-021, DC-013) ✅ done · step 6 (DC-021, DC-012) ✅ done · step 7 (DC-021, DC-014) ✅ done · step 8 (phone check) ✅ done · **slice 2 complete**.

| Step | Content                                                                                  | Stories        | Tests                                                                                             |
| ---- | ---------------------------------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------- |
| 1    | Quick Access screen and route; shared top bar with the Quick button on the scene screen  | DC-020         | Opens with one tap; Close and Back return to the scene; refresh keeps it open; unknown campaign   |
| 2    | Quick button on tile detail and combat screens (same top bar)                            | DC-020         | Opens from each screen; Back returns to that screen; combat state unchanged after opening/closing |
| 3    | Combat item: to the active combat in normal mode; disabled with "No active combat"       | DC-021         | Scene → Quick → Combat; Back returns to the scene in one tap; disabled without combat             |
| 4    | domain + seed: campaign-level NPCs, locations, notes; tiles refer by id                  | (DC-033 model) | Lookup functions incl. unknown ids; scene tiles render the same names/titles as before            |
| 5    | NPC screen and Campaign NPCs list (Quick item); NPC names on the scene tile open the NPC | DC-021, DC-013 | List in campaign order; one tap from tile to NPC; Back returns to where it was opened             |
| 6    | Location screen and Locations list (Quick item); Location tile opens the location        | DC-021, DC-012 | Same as step 5                                                                                    |
| 7    | Campaign Notes list and note screen (Quick item); Notes tile opens its full text         | DC-021, DC-014 | Same as step 5                                                                                    |
| 8    | Mobile check on a real phone; update the open follow-ups                                 | DC-100         | Manual check                                                                                      |

## 6. Decisions

Numbering continues from the first slice. Answers in **bold**. **Status: all confirmed on
2026-10-13 by the product owner (D25: option C).**

- **D22 — Where Quick Access is opened** (requirements §20 open question). Decision:
  **a `Quick` button on the right of a shared top bar on every in-campaign screen.**
  Alternative: a middle button in the bottom bar between `◀ Previous` and `Next ▶`. That is
  easier to reach with a thumb, but the combat screen has no bottom bar and would need one.
- **D23 — Quick Access is a screen with its own URL** (`/c/:campaignId/quick`), not an
  overlay. Decision: **yes** — the UX rules say every screen has its own URL, so Back closes
  it and refresh works. Choosing an item replaces the Quick Access history entry. Two
  refinements (step 3): an item that leads back to the screen Quick Access was opened from
  just closes it (so Combat opened from combat in reorder mode stays in reorder mode), and
  when Quick Access was opened directly (new tab) an item adds an entry instead, so Back
  stays in the app.
- **D24 — Which items in v1** (requirements §20 open question; DC-021 says "the final list is
  still open"). Decision: **Combat, Campaign NPCs, Locations, Campaign Notes.** Not Random NPC
  (Epic 10, its own slice), Rules / references or Global Notes (no story).
- **D25 — Where the NPC / Location / Note lists get their data.** This decides the size of
  the slice.
  - **A — Combat item only.** Lists wait for Epic 4. Smallest slice, but Quick Access then
    has one item.
  - **B — Gather from scene tiles.** Lists show what the tiles contain (NPC names, location
    texts). No model change, but an NPC is just a name, and the work is thrown away when
    Epic 4 arrives.
  - **C — Campaign-level entities. Chosen.** Move NPCs, locations and notes to the
    campaign as in the requirements' domain model; tiles refer to them by id. The same
    detail screens then serve Quick Access and the tiles, so DC-012, DC-013 and DC-014 come
    almost for free, and Epic 4 later only adds editing.
- **D26 — Minimum fields for NPC and Location** (open in the requirements). Decision:
  **`name` + `description` (free text) for both.** More fields wait for a story.
- **D27 — Combat item without an active combat.** Decision: **shown, disabled, "No active
  combat"**, so the item positions never change. Alternative: hide it.
- **D28 — Campaign Notes versus a scene's DM Notes tile.** Decision: **two different things.**
  The Notes tile stays the scene's own text and opens full-screen (DC-014). Campaign Notes is
  a separate campaign-level list, not tied to a scene. Global Notes (across campaigns) stays
  out.
- **D29 — Reorder / Done below the combat list** (product owner, 2026-10-13, step 2; changes
  where D17 put the button). With Quick in the top bar, `Quick` sat right above `Reorder`: two
  outlined buttons, easy to mix up. Reorder / Done now sits to the right of `+ Add combatant`
  below the list, which also puts Done in thumb reach. An open add form takes its own line
  under these buttons.

**Resolved in this slice:** no one-tap way back to combat from another scene (D20) — Quick
Access → Combat from any screen (step 3).

**Open follow-ups from slice 1 that stay open:** resume per encounter / "New combat" (D1,
D16), Undo after removing a combatant (D18), screen readers on a phone cannot reorder (D21),
no auto-scroll while dragging (D21).

## 7. Working agreement

Same as the first slice (§10 there and CLAUDE.md): one step at a time, `npm run check` green
after every step, no dependencies or features outside the step without asking.
