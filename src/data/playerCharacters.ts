// Each campaign's own player characters, kept by the DM on this device (DC-114, D61). Not in
// the campaign file, so a re-import keeps them. Without a stored list a campaign has its
// starting list (D59): the demo campaigns' seed players, none for an imported campaign.

import type { PlayerCharacter } from '../domain/campaign';

// The version is part of the key, as for sessions and imported campaigns.
const keyFor = (campaignId: string) => `dm-sidekick:v1:players:${campaignId}`;

/**
 * The stored list as text, or null when there is none or storage is blocked. The text lets
 * `campaigns.ts` see whether the list changed without parsing it on every render.
 */
export function storedPlayersText(campaignId: string): string | null {
  try {
    return localStorage.getItem(keyFor(campaignId));
  } catch {
    return null;
  }
}

/** The players in a stored text, or undefined when it isn't a valid list (bad data). */
export function playersFrom(text: string): PlayerCharacter[] | undefined {
  try {
    const value: unknown = JSON.parse(text);
    // Only the fields a player has; anything else stored by hand is dropped.
    return isPlayerList(value) ? value.map(({ id, name }) => ({ id, name })) : undefined;
  } catch {
    return undefined;
  }
}

/** Stores a campaign's list. Returns false when storage is full or blocked. */
export function savePlayers(campaignId: string, players: PlayerCharacter[]): boolean {
  try {
    localStorage.setItem(keyFor(campaignId), JSON.stringify(players));
    return true;
  } catch {
    return false;
  }
}

/** Forgets a campaign's list, when the campaign is deleted (DC-113). */
export function deletePlayers(campaignId: string): void {
  try {
    localStorage.removeItem(keyFor(campaignId));
  } catch {
    // Storage blocked: there is nothing stored to remove.
  }
}

/**
 * A list of `{ id, name }` that editing could have made (D60): unique ids, names that aren't
 * empty and are unique ignoring case.
 */
function isPlayerList(value: unknown): value is PlayerCharacter[] {
  if (!Array.isArray(value)) return false;
  const ids = new Set<string>();
  const names = new Set<string>();
  for (const item of value as unknown[]) {
    if (typeof item !== 'object' || item === null) return false;
    const { id, name } = item as Record<string, unknown>;
    if (typeof id !== 'string' || typeof name !== 'string' || name.trim() === '') return false;
    const key = name.trim().toLowerCase();
    if (ids.has(id) || names.has(key)) return false;
    ids.add(id);
    names.add(key);
  }
  return true;
}
