# DM Cockpit — Implementation plan: third slice (Spare NPCs)

Status: **approved 2026-10-13.** Decisions D30–D35 confirmed by the product owner: all
proposals.
Source: `requirements.md` (§6 Quick Access, Epic 10 as changed on 2026-10-13: DC-090).
Builds on the first two slices (`docs/implementation-plan-slice-1.md`,
`docs/implementation-plan-slice-2.md`): their architecture, decisions D1–D29 and working
agreement still apply.

## 1. Goal

When the story suddenly needs an NPC, the DM finds one in two taps from any screen:

```
Any screen in a campaign → Quick → Spare NPCs → read name, race, description → Back
```

| Story  | Title                        | Priority | Notes                                 |
| ------ | ---------------------------- | -------- | ------------------------------------- |
| DC-090 | Kant-en-klare NPC's bekijken | P1       | Shown in the UI as "Spare NPCs" (D30) |

DC-091 and DC-092 are dropped in the requirements.

**Not in this slice:** randomness of any kind, adding a spare NPC to a campaign, marking one
as used, editing the selection in the app, search or filters.

## 2. What exists today

- Quick Access (`/c/:campaignId/quick`) with four items: Combat, Campaign NPCs, Locations,
  Campaign Notes. Each item follows the D23 history rules through one helper.
- Shared list screens (`EntityList`, `ListRow`): one-line detail, a tap opens a detail
  screen. Spare NPCs need more than one line and no detail screen (D33).
- All content is bundled seed data, read through `src/data/` (never `seed.ts` directly).

## 3. Domain and data

```ts
// src/domain/spareNpc.ts — pure type, no logic needed yet
type SpareNpc = {
  id: string;
  name: string; // "Brannoc Tull"
  race: string; // "Dwarf" — free text, not an enum (D32)
  description: string; // one or two sentences
};
```

- `src/data/spareNpcs.ts` holds about 20 original NPCs; screens get them through
  `getSpareNpcs()` in the same file, like `getCampaigns()`. Not part of `Campaign`: the
  selection is the same in every campaign (DC-090).
- Array order is list order (D31). Mixed races and roles (innkeeper, guard, merchant,
  priest, child, thief, …), so there is one for most situations.
- A data test checks: unique ids, no empty fields, and every description at most
  160 characters (DC-090: "very short").

## 4. Screen and route

| Route                       | Screen     | Stories | Step |
| --------------------------- | ---------- | ------- | ---- |
| `/c/:campaignId/spare-npcs` | Spare NPCs | DC-090  | 2    |

- Under the campaign, although the data is global, so the shared top bar, Back and the
  Quick button keep working exactly like the other Quick Access screens.
- **Each row (D33):** name in bold with the race next to it, the description in full
  underneath. Rows are not tappable: there is nothing to open.
- **Quick Access item (D34):** "Spare NPCs", detail "20 NPCs", directly below Campaign NPCs.

## 5. Build order

Each step is small, ends with `npm run check` green and a working app, and is one commit.

**Progress:** step 1 (DC-090 data) ✅ done · step 2 (DC-090 screen) ✅ done · **next: step 3**.

| Step | Content                                                            | Stories | Tests                                                                                             |
| ---- | ------------------------------------------------------------------ | ------- | ------------------------------------------------------------------------------------------------- |
| 1    | `SpareNpc` type, ~20 original spare NPCs, `getSpareNpcs()`         | DC-090  | Unique ids, no empty fields, descriptions ≤ 160 characters, at least 15 NPCs                      |
| 2    | Spare NPCs screen and route; Quick Access item below Campaign NPCs | DC-090  | Two taps from a scene; every NPC shows name, race, description; same list in both campaigns; Back |
| 3    | Mobile check on a real phone                                       | DC-100  | Manual check                                                                                      |

## 6. Decisions

Numbering continues from the second slice. Answers in **bold**. **Status: all confirmed on
2026-10-13 by the product owner.**

- **D30 — Name in the UI** (product owner, 2026-10-13): **"Spare NPCs".** The requirements
  use the Dutch "Kant-en-klare NPC's".
- **D31 — Order of the list.** Decision: **the order in the data file (array order), not
  sorted.** Lets the most useful ones go first. Alternative: alphabetical by name.
- **D32 — Race is free text.** Decision: **a plain string** ("Human", "Half-elf",
  "Tiefling"), not a fixed list: no rules engine (requirements §18), and it is only read.
- **D33 — No detail screen; the row shows everything** (from DC-090: the DM doesn't have to
  open anything). Decision: **a new non-tappable row with name, race and the full
  description**, instead of the shared `ListRow` (which cuts the detail off after one line
  and always opens something).
- **D34 — Position in Quick Access.** Decision: **directly below Campaign NPCs**, so the two
  NPC items sit together. This moves Locations and Campaign Notes down one row.
  Alternative: last, so the existing rows keep their place.
- **D35 — Route under the campaign** (`/c/:campaignId/spare-npcs`) although the data is
  global. Decision: **yes**, so the top bar, Quick and Back work as everywhere else, and
  Back from a direct open goes to the campaign.

**Open follow-ups from earlier slices that stay open:** resume per encounter / "New combat"
(D1, D16), Undo after removing a combatant (D18), screen readers on a phone cannot reorder
(D21), no auto-scroll while dragging (D21).

## 7. Working agreement

Same as the earlier slices (CLAUDE.md): one step at a time, `npm run check` green after every
step, no dependencies or features outside the step without asking.
