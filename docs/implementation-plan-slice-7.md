# DM Cockpit — Implementation plan: seventh slice (Ending a combat)

Status: **approved 2026-10-15.** D63 – D67 confirmed by the product owner (all proposals).
Source: `requirements.md` (§16 and Epic 8: DC-072, DC-073). Builds on the earlier slices;
their architecture, decisions D1 – D62 and working agreement still apply.

## 1. Goal

Found in the slice 6 phone check: once a combat is started, it can never be ended, and no
other encounter can be started (the open follow-up from D1 and D16). Now:

```
Combat → End combat → "End the combat against Ambush on the mill road?" → End combat
  → back on the scene; every encounter tile shows Start combat again

Scene with another encounter → Start combat → "A combat against Ambush on the mill road is
  running. Start this one instead?" → Start combat → the new combat
```

| Story  | Title                                      | Priority |
| ------ | ------------------------------------------ | -------- |
| DC-072 | Combat beëindigen                          | P1       |
| DC-073 | Ander encounter starten tijdens een combat | P1       |

This closes the open follow-ups "New combat" (D1) and "Resume is per campaign, not per
encounter" (D16).

**Not in this slice:** Undo after removing a combatant (D18), hosting (slice 8, see §6).

## 2. Architecture

```
src/data/combats.ts              endActiveCombat(campaignId): forgets the combat in memory
                                 and in the session; the current scene stays (D66)
src/ui/routes/CombatPage.tsx     End combat button and its confirmation panel (D63, D64)
src/ui/components/SceneTile.tsx  Resume combat only on the running encounter's tile; Start
                                 combat with a confirmation on the others (D65)
```

- Starting a combat already replaces the active one (`setActiveCombat`, D1: one per
  campaign), so DC-073 needs no new data code, only the confirmation.
- Combat ids: there are none (D15). "Running encounter" means `combat.encounterId`.

## 3. Screens

- **Combat screen:** an **End combat** button at the bottom, below the list and its
  controls, small and quiet like Delete on the campaign list. It opens a panel at the top
  of the screen: "End the combat against Ambush on the mill road? HP and order are lost."
  with `Cancel` and `End combat` (red). After ending, the screen goes to the combat's scene.
- **Encounter tile** while another encounter's combat is running: `Start combat`, which
  opens a confirmation inside the tile: "A combat against Ambush on the mill road is
  running. Start this one instead? It replaces that combat." with `Cancel` and
  `Start combat`. The running encounter's own tile keeps `Resume combat`.

## 4. Build order

Each step is small, ends with `npm run check` green and a working app, and is one commit.

**Progress:** step 1 (ending in the data) ✅ done · **next: step 2**.

| Step | Content                                                                        | Stories | Tests                                                                                                       |
| ---- | ------------------------------------------------------------------------------ | ------- | ----------------------------------------------------------------------------------------------------------- |
| 1    | Data: end the active combat, in memory and in the session; keep the scene      | DC-072  | Gone after a reload; the current scene stays; other campaigns' combats stay                                 |
| 2    | Combat screen: End combat, confirmation panel, back to the scene               | DC-072  | End / cancel; tiles show Start combat again; Quick Access shows Combat disabled; gone after a refresh       |
| 3    | Encounter tile: Resume only for the running encounter; Start with confirmation | DC-073  | Running tile resumes; another tile asks first; confirm replaces; cancel keeps; no question without a combat |
| 4    | Real-phone check                                                               | DC-100  | Manual check                                                                                                |

## 5. Decisions

Numbering continues from the sixth slice. **Status: D63 – D67 confirmed on 2026-10-15 by the product owner (all proposals).**
Already decided in DC-072 and DC-073 (product owner, 2026-10-15): an End combat action on the
combat screen; another encounter's tile offers Start combat while a combat runs, replacing
it; both ask for confirmation first.

- **D63 — Where End combat is: at the bottom of the combat screen**, small and quiet, as
  Delete on the campaign list (D51): ending is rare, damage is what the screen is for.
  Decision: **yes.** Alternative: next to Heal and Reorder at the top, closer to hand but
  easy to hit by mistake.
- **D64 — The confirmations are panels, not dialogs**, as for import and delete (D50, D51):
  the End combat panel at the top of the combat screen, the Start combat question inside
  the encounter tile. Decision: **yes.**
- **D65 — After ending, the app goes to the combat's scene**; if that scene no longer exists
  (after a re-import, D49), to the campaign, which opens the current scene. Decision:
  **yes.** Alternative: stay on the combat screen, which then says "No active combat".
- **D66 — Ending keeps the current scene.** Only the combat is forgotten; the session keeps
  the DM's place in the campaign (DC-080). Decision: **yes.**
- **D67 — A combat without a known encounter** (stored before encounters had ids, or whose
  encounter was removed by a re-import) is "the current combat" in the questions, and no
  tile shows Resume combat for it; Quick Access still opens it. Decision: **yes.**

## 6. Next: hosting

Unchanged from slice 5, §6: publish the app and make it work offline at the table. With
this slice, that becomes slice 8.

## 7. Working agreement

Same as the earlier slices (CLAUDE.md): one step at a time, `npm run check` green after
every step, no dependencies or features outside the step without asking.
