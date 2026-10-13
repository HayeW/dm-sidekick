# DM Cockpit — Implementation plan: fourth slice (Healing)

Status: **approved 2026-10-13.** D36–D42 confirmed by the product owner (D39–D42: all
proposals).
Source: `requirements.md` (Epic 7: DC-062). Builds on the earlier slices; their architecture,
decisions D1–D35 and working agreement still apply.

## 1. Goal

During combat the DM heals a combatant with as few taps as damage, without crowding the
row that already holds `−1 −5 −10`:

```
Combat → Heal → tap +5 on Goblin Boss (16 → 21/21) → Done healing
```

| Story  | Title             | Priority | Notes                                    |
| ------ | ----------------- | -------- | ---------------------------------------- |
| DC-062 | Healing toepassen | P1       | Its open point is answered by D36 – D38. |

**Not in this slice:** temporary HP, custom amounts, healing player characters (they have
no HP, D3), undo.

## 2. Domain

```ts
// src/domain/combat.ts, next to applyDamage
export const HEAL_AMOUNTS = [1, 5, 10] as const; // D38
export function applyHealing(combat: Combat, combatantId: string, amount: number): Combat;
export function isFullHp(combatant: Combatant): boolean; // disables the heal buttons (D36)
```

- HP goes up by `amount`, never above `maxHp` (D36). Returns a new combat; order unchanged.
- Healing a combatant at 0 HP brings it back: DEAD is derived from HP, so no extra state
  (D37).
- Combatants without HP (player characters, D3; added without HP, D8) are left unchanged.

## 3. Combat screen

- **Heal mode (D39):** a third mode next to normal and reorder, in the URL as
  `?mode=heal` (like `?mode=reorder`, D17), so a refresh keeps it and switching replaces the
  history entry.
- In heal mode every row with HP shows green `+1 +5 +10` instead of `−1 −5 −10`. The
  buttons of a combatant at full HP are disabled. A DEAD combatant's buttons are enabled,
  so it can be revived.
- A hint under the heading, like reorder mode's: "Healing: tap +1, +5 or +10, then tap
  Done healing below."
- **Buttons below the list (D40):** `+ Add combatant`, `Heal`, `Reorder`. In heal mode
  `Heal` becomes a filled green `Done healing`; in reorder mode `Reorder` becomes `Done`
  as now.

## 4. Build order

Each step is small, ends with `npm run check` green and a working app, and is one commit.

**Progress:** step 1 (DC-062 domain) ✅ done · **next: step 2**.

| Step | Content                                                       | Stories | Tests                                                                                              |
| ---- | ------------------------------------------------------------- | ------- | -------------------------------------------------------------------------------------------------- |
| 1    | `applyHealing`, `HEAL_AMOUNTS`, `isFullHp`                    | DC-062  | Heals by the amount; caps at max HP; revives from 0; PCs and no-HP combatants unchanged; immutable |
| 2    | Heal mode on the combat screen: toggle, green +1/+5/+10, hint | DC-062  | One tap heals; disabled at full HP; revives DEAD; mode survives refresh; Back still one tap; saved |
| 3    | Mobile check on a real phone                                  | DC-100  | Manual check                                                                                       |

## 5. Decisions

Numbering continues from the third slice. Answers in **bold**. **Status: all confirmed on
2026-10-13 by the product owner.**

- **D36 — Healing stops at maximum HP** (product owner, 2026-10-13). **Yes**, as in D&D;
  the heal buttons are disabled at full HP.
- **D37 — Healing revives the dead** (product owner, 2026-10-13). **Yes**: healing a
  combatant at 0 HP brings it back; DEAD is derived from HP.
- **D38 — Amounts** (product owner, 2026-10-13): **+1, +5, +10**, the same as damage. This
  answers DC-062's open point.
- **D39 — Heal mode** (product owner, 2026-10-13: a mode toggle, not per-row healing or a
  long press). Decision: **a third mode in the URL (`?mode=heal`), exclusive with
  reorder mode; it stays on until the DM taps Done healing**, so several combatants can be
  healed in a row.
- **D40 — Where the Heal button goes.** Decision: **below the list, between
  `+ Add combatant` and `Reorder`**, in thumb reach and away from Quick (like D29).
- **D41 — Making heal mode unmistakable.** Decision: **green heal buttons, a green filled
  `Done healing` button, and the hint text**, so the DM never heals by accident thinking
  it is damage.
- **D42 — Heal mode when leaving combat.** Decision: **like reorder mode: kept in the URL,
  so Back and a refresh keep it; Resume combat and the Quick Access Combat item open normal
  mode.**

**Open follow-ups from earlier slices that stay open:** resume per encounter / "New
combat" (D1, D16), Undo after removing a combatant (D18), screen readers on a phone cannot
reorder (D21), no auto-scroll while dragging (D21).

## 6. Working agreement

Same as the earlier slices (CLAUDE.md): one step at a time, `npm run check` green after
every step, no dependencies or features outside the step without asking.
