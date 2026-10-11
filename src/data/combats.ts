import type { Combat } from '../domain/combat';

// The active combat of each campaign: one at most (decision D1). Kept in memory only for
// now, so it survives leaving and returning to the combat screen but not a page refresh.
// Persisting it is step 11 (DC-081).

const activeCombats = new Map<string, Combat>();

export function getActiveCombat(campaignId: string): Combat | undefined {
  return activeCombats.get(campaignId);
}

/** Makes this the campaign's active combat, replacing any previous one. */
export function setActiveCombat(combat: Combat): void {
  activeCombats.set(combat.campaignId, combat);
}

/** Forgets all active combats, like a page refresh does. For tests. */
export function clearActiveCombats(): void {
  activeCombats.clear();
}
