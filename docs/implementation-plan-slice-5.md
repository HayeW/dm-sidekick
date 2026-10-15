# DM Cockpit — Implementation plan: fifth slice (Campaign import)

Status: **approved 2026-10-13.** D43 – D51 confirmed by the product owner (D46 – D51: all
proposals).
Source: `requirements.md` (Epic 12: DC-110 – DC-113) and `docs/campaign-format.md`.
Builds on the earlier slices; their architecture, decisions D1 – D42 and working agreement
still apply.

## 1. Goal

Prepare a campaign on the PC, play it on the phone:

```
PC: write campaign.md → Drive / mail / cable → phone: Campaigns → Import campaign → pick the file
  → errors with line numbers, or: (replace "X"? → Replace) → the campaign is in the list
```

| Story  | Title                                        | Priority |
| ------ | -------------------------------------------- | -------- |
| DC-110 | Campaign importeren uit een Markdown-bestand | P1       |
| DC-111 | Bestaande campaign vervangen                 | P1       |
| DC-112 | Duidelijke foutmeldingen bij importeren      | P1       |
| DC-113 | Geïmporteerde campaign verwijderen           | P1       |

Also covered: DC-004 (a new campaign opens its first scene) — an imported campaign has no
stored session, so it opens on its first scene, as the demo campaigns do.

**Not in this slice:** exporting, editing in the app (Epic 4 and 5), Markdown formatting
(bold, italic), hosting and offline use (a separate slice, see §6).

## 2. Architecture

```
src/domain/campaignMarkdown.ts   parseCampaign(text): { campaign } | { errors: { line, message }[] }
                                 Pure, no browser APIs. All format rules live here (D47).
src/data/importedCampaigns.ts    store / load / delete imported campaigns in localStorage
src/data/campaigns.ts            getCampaigns(): demo campaigns + imported ones (D48)
src/ui/routes/CampaignListPage   Import button, error list, replace and delete confirmation
```

- The parser works line by line, so every error carries its line number (DC-112), and it
  collects all errors before reporting (no stop at the first).
- **Ids** are made from names, so a re-import keeps them stable (D47): the campaign id is
  `imported-<name as slug>`, a scene id comes from its title, NPC / location / encounter /
  note ids from their names, tile and description ids from their position in the scene.
  Because the ids stay the same, re-importing keeps the DM's current scene (D49).
- Screens keep getting campaigns through `src/data/campaigns.ts` only.

## 3. Screens

Everything happens on the campaign list (`/`):

- **Import campaign** button below the list; it opens the device's file picker
  (`.md`, plain text).
- **Errors (D50):** a panel above the list, "Could not import campaign.md", with every error
  and its line number, and a Close button. Nothing changed.
- **Replace (D50):** if an imported campaign with that name exists: a panel "Replace
  'Shadows over Hollowmere'? This overwrites the imported version." with `Cancel` and
  `Replace`.
- **Imported campaigns** show a small "Imported" label and a `Delete` button; delete asks
  for confirmation the same way (D51). Demo campaigns have neither.

## 4. Build order

Each step is small, ends with `npm run check` green and a working app, and is one commit.

**Progress:** step 1 (reading the structure) ✅ done · step 2 (reading the content) ✅ done ·
step 3 (storing) ✅ done · step 4 (import on the campaign list) ✅ done · step 5 (delete) ✅
done · **next: step 6** (real-phone check, by the product owner).

**For step 6:** the file picker only offers `.md`, `.markdown` and plain-text files. Some
Android pickers (Drive) label a `.md` file as `application/octet-stream`, which may grey it
out. If so, drop the filter: the parser rejects anything that isn't a campaign anyway.

| Step | Content                                                                                                                                              | Stories        | Tests                                                                                                            |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------- |
| 1    | Parser, structure: campaign name, sections, scenes, tiles, text, unknown/duplicate headings                                                          | DC-110, DC-112 | Every rule in the format; line numbers; all errors at once                                                       |
| 2    | Parser, content: enemies, references by name (case-insensitive), unique names, demo names, ids; read-aloud texts in a row form one Descriptions tile | DC-110, DC-112 | The format document's example (renamed) gives the same campaign as the demo seed; each error message; stable ids |
| 3    | Store imported campaigns; `getCampaigns()` includes them; delete also removes the session                                                            | DC-110, DC-113 | Survives a reload; bad stored data is skipped, not a crash; demo campaigns unchanged                             |
| 4    | Import on the campaign list: file picker, error panel, replace confirmation                                                                          | DC-110 – 112   | Import, open and play; errors shown, nothing imported; replace / cancel; current scene kept after re-import      |
| 5    | Delete an imported campaign on the campaign list, with confirmation                                                                                  | DC-113         | Delete / cancel; demo campaigns can't be deleted; its session is gone                                            |
| 6    | Real-phone check: import a file from Drive / mail                                                                                                    | DC-100         | Manual check                                                                                                     |

## 5. Decisions

Numbering continues from the fourth slice. Answers in **bold**. **Status: D43 – D51
confirmed on 2026-10-13, D52 – D54 on 2026-10-15, by the product owner.**

- **D43 — English section and tile names** (product owner, 2026-10-13): **yes**, matching
  the English UI (D10).
- **D44 — Unknown headings** (product owner, 2026-10-13): **an error**, so typos are caught.
- **D45 — A demo campaign's name** (product owner, 2026-10-13): **an error**, for simplicity.
- **D46 — What is stored: the Markdown text, read again at every start.** Decision: **yes.**
  The parser is then the only place that knows the format; a stored campaign can never be
  in a state the parser wouldn't accept, and a later format change applies to stored
  campaigns too. The cost (parsing a few kilobytes at start) is negligible. Alternative:
  store the parsed campaign as JSON, which needs its own validation on load.
- **D47 — Ids from names.** Decision: **yes, as in §2**, so a re-import keeps the same ids
  and the DM's place in the campaign. Consequence: renaming a scene in the file makes it a
  new scene for the app.
- **D48 — Demo campaigns first, then imported campaigns** in the campaign list, each group
  in its own order (demo: as now; imported: by name). Decision: **yes.**
- **D49 — What a re-import keeps.** Decision: **the current scene if it still exists**
  (otherwise the first scene, as DC-003 already does), **and the active combat**: a combat
  is a copy (D15) and keeps working; if its scene was removed, its back link goes to the
  campaign, as it already does.
- **D50 — Errors and the replace confirmation are panels on the campaign list, not separate
  screens.** Decision: **yes.** They only exist right after picking a file; a URL for them
  would show nothing after a refresh. This is a small exception to "every screen has its own
  URL".
- **D51 — Delete** is a small `Delete` button on an imported campaign's card in the list,
  with the same kind of confirmation panel. Decision: **yes.**
- **D52 — At most 99 enemies in one line** (product owner, 2026-10-15): **more is an
  error**, so a stray extra digit can't fill a combat with thousands of enemies.
- **D53 — An NPC listed twice in one `### NPCs` tile** (product owner, 2026-10-15): **an
  error**; the app shows each NPC once. Added to `docs/campaign-format.md`.
- **D54 — Campaign names that give the same id** ("Test" and "test", "A!" and "A?")
  (product owner, 2026-10-15): **the same campaign.** Imported campaigns are stored by id;
  importing a file with an existing id asks to replace it (DC-111). Sessions are stored by
  id too, so the two stay consistent. For step 3 and 4.

**Details settled while building (step 2, within D47):**

- Ids keep letters with accents (`npc-zoë`); a name without letters or digits gets
  `unnamed`. Two names in a section that differ only in punctuation ("Old-Fenn", "Old
  Fenn!") are allowed and get `-2`, `-3` in file order; swapping them in the file swaps
  their ids.
- Names are compared in Unicode NFC, so an accent typed either way matches.
- An enemy line whose name starts with a count (`- 3 Goblins, 7 HP`, `- 3xGoblin, 7 HP`)
  is an error, not one enemy called "3 Goblins".

**Open follow-ups from earlier slices that stay open:** resume per encounter / "New
combat" (D1, D16), Undo after removing a combatant (D18), screen readers on a phone cannot
reorder (D21), no auto-scroll while dragging (D21).

## 6. Next: hosting

After this slice, a small hosting slice before the first real session: publish the app (e.g.
Netlify or GitHub Pages) and make it work offline at the table (a service worker, which
needs a new dependency — to be asked). Data is stored per web address, so campaigns
imported on the development address must be imported again on the hosted one.

## 7. Working agreement

Same as the earlier slices (CLAUDE.md): one step at a time, `npm run check` green after
every step, no dependencies or features outside the step without asking.
