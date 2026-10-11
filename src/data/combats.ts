import type { Combat } from '../domain/combat';
import { loadSession, saveActiveCombat } from './storage';

// The active combat of each campaign: one at most (decision D1). Saved in the campaign's
// session (DC-081), so it survives a refresh. Also kept in memory, so the combat keeps working
// for the rest of the visit when the browser blocks storage.

const activeCombats = new Map<string, Combat>();

export function getActiveCombat(campaignId: string): Combat | undefined {
  return activeCombats.get(campaignId) ?? loadSession(campaignId)?.activeCombat;
}

/** Makes this the campaign's active combat, replacing any previous one. */
export function setActiveCombat(combat: Combat): void {
  activeCombats.set(combat.campaignId, combat);
  saveActiveCombat(combat);
}

/** Forgets the in-memory copies, like a page refresh does. Saved combats stay. For tests. */
export function clearActiveCombats(): void {
  activeCombats.clear();
}
