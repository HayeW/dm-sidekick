# DM Cockpit — Implementation plan: sixth slice (Own player characters)

Status: **approved 2026-10-15.** D57 – D62 confirmed by the product owner (all proposals).
Source: `requirements.md` (Epic 12: DC-114). Builds on the earlier slices; their
architecture, decisions D1 – D56 and working agreement still apply.

## 1. Goal

A campaign file can be shared between DMs; each DM plays it with their own players:

```
Import a shared campaign.md → Quick Access → Player characters → add "Mira", "Tok"
  → start combat: the enemies, then Mira and Tok
```

| Story  | Title                                             | Priority |
| ------ | ------------------------------------------------- | -------- |
| DC-114 | Eigen Player Characters bij een gedeelde campaign | P1       |

Also covered: DC-030 (create a player character) and DC-031 (view the player characters)
from Epic 4, which this story includes.

**Not in this slice:** reordering player characters (the DM reorders them in combat, DC-052),
hosting (see §6).

## 2. Architecture

```
src/domain/playerCharacters.ts   addPlayer / renamePlayer / removePlayer: pure rules
                                 (name not empty, unique ignoring case, ids)
src/data/playerCharacters.ts     store / load / delete a campaign's list in localStorage
src/data/campaigns.ts            getCampaign(): the campaign with the DM's list (D61)
src/domain/campaignMarkdown.ts   "## Player characters" is an error (D62)
src/ui/routes/PlayersPage.tsx    /c/:campaignId/players: view, add, rename, remove (D58, D60)
```

- **Combat doesn't change.** `startCombat` already takes `campaign.playerCharacters`; the
  data layer fills that field with the DM's list, so combat, and every screen that reads it,
  works as before. A running combat is a copy (D15), so editing the list doesn't change it.
- Screens keep getting campaigns through `src/data/campaigns.ts` only.

## 3. Screens

- **Quick Access** gets an item **Player characters** ("4 players"), below Spare NPCs. It
  opens `/c/:campaignId/players` (D58).
- **Player characters** (`/c/:campaignId/players`): the names in order. Below them an
  **Add player** field with an Add button. Tap a name to rename it in place (Save / Cancel).
  Each row has a **Remove** button, one tap, no confirmation (D60).
- With no players, the screen says "No player characters yet." and combat starts with only
  the enemies.

## 4. Build order

Each step is small, ends with `npm run check` green and a working app, and is one commit.

**Progress:** step 1 (no players in the file) ✅ done · step 2 (rules) ✅ done · step 3 (storing) ✅ done · step 4 (view) ✅ done · step 5 (editing) ✅ done · step 6 (real-phone check) ✅ done · **slice 6 done**.

| Step | Content                                                                                           | Stories        | Tests                                                                                                      |
| ---- | ------------------------------------------------------------------------------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------- |
| 1    | Parser: "## Player characters" is an error; imported campaigns have no players; format doc update | DC-114, DC-112 | The error and its line; the format example (without players) still gives the demo seed, apart from players |
| 2    | Domain rules: add, rename, remove; name checks; ids                                               | DC-114         | Each rule; empty and duplicate names; ids stay unique after removes                                        |
| 3    | Store a campaign's list; `getCampaign()` uses it; starting lists (D59); delete with the campaign  | DC-114, DC-113 | Survives a reload; bad stored data falls back to the starting list; re-import keeps the list               |
| 4    | Player characters screen (view) and its Quick Access item                                         | DC-031         | The list for demo and imported campaigns; empty list; the Quick Access count                               |
| 5    | Add, rename and remove on that screen                                                             | DC-030, DC-114 | Add / rename / remove; refused names; a new combat has the new players; a running combat is unchanged      |
| 6    | Real-phone check: share a file, add own players, play a combat                                    | DC-100         | Manual check                                                                                               |

## 5. Decisions

Numbering continues from the fifth slice. **Status: D57 – D62 confirmed on 2026-10-15 by the product owner (all proposals).**
Already decided in DC-114 (product owner, 2026-10-15): every campaign has its own list, also
the demo campaigns; add, rename and remove; a file with "## Player characters" is an error;
a re-import keeps the list; deleting a campaign deletes its list.

- **D57 — This slice comes before hosting.** Decision: **yes**; hosting moves to slice 7. So
  shared campaign files work before the app is published.
- **D58 — Where the list lives: a Quick Access item "Player characters"**, a screen with its
  own URL (`/c/:campaignId/players`), next to the other campaign lists (D24). Decision:
  **yes.** Alternative: a button on the campaign list's card, which is further from play.
- **D59 — Starting lists.** Decision: **an imported campaign starts with no players; a demo
  campaign starts with its seed players** (Alice, Bob, Cora, Dain; Esme, Finn), until the DM
  changes them. The demo then still shows a full combat right away. Alternative: demo
  campaigns start empty too.
- **D60 — Editing.** Decision: **add** with a name field and an Add button below the list;
  **rename** by tapping a name (an inline field with Save / Cancel); **remove** with one tap
  and **no confirmation**, as for combatants (D18): a player is only a name, so re-adding is
  quick. A name may not be empty or the same as another player's in that campaign (ignoring
  case); the field then says why and nothing changes.
- **D61 — Storage.** Decision: one entry per campaign, `dm-cockpit:v1:players:<campaignId>`,
  with the list as JSON (`{ id, name }[]`). No entry means the starting list (D59). Ids are
  `pc-1`, `pc-2`, … (the next free number), so no randomness is needed (D19) and a renamed
  player keeps its id. Unreadable stored data falls back to the starting list, not a crash.
- **D62 — The error for "## Player characters"** (DC-112): `"## Player characters" can't be
in a campaign file: each DM adds their own player characters in the app.` The section is
  removed from `docs/campaign-format.md` and its example.

## 6. Next: hosting

Unchanged from slice 5, §6: publish the app and make it work offline at the table. With
D57, that becomes slice 7.

## 7. Working agreement

Same as the earlier slices (CLAUDE.md): one step at a time, `npm run check` green after
every step, no dependencies or features outside the step without asking.
