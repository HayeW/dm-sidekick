// A campaign's own player characters, kept by the DM in the app (DC-114, D60, D61). Pure
// rules on a list: every change returns a new list, or says why it can't be made. No
// storage, no randomness: ids are the next free number (D19).

import type { PlayerCharacter } from './campaign';

/** The new list, or why the change was refused (shown next to the name field, D60). */
export type PlayerChange = { players: PlayerCharacter[] } | { error: string };

/** Adds a player at the end of the list, with a new id (DC-030). */
export function addPlayer(players: PlayerCharacter[], name: string): PlayerChange {
  const problem = nameProblem(players, name);
  if (problem) return { error: problem };
  return { players: [...players, { id: nextId(players), name: name.trim() }] };
}

/** Renames a player; it keeps its id and its place (D61). */
export function renamePlayer(players: PlayerCharacter[], id: string, name: string): PlayerChange {
  if (!players.some((player) => player.id === id)) return { players };
  const problem = nameProblem(
    players.filter((player) => player.id !== id),
    name,
  );
  if (problem) return { error: problem };
  return {
    players: players.map((player) =>
      player.id === id ? { ...player, name: name.trim() } : player,
    ),
  };
}

/** Removes a player; an unknown id changes nothing. */
export function removePlayer(players: PlayerCharacter[], id: string): PlayerCharacter[] {
  return players.filter((player) => player.id !== id);
}

/** Why a name can't be used among these players, or undefined when it can (D60). */
function nameProblem(players: PlayerCharacter[], name: string): string | undefined {
  const trimmed = name.trim();
  if (trimmed === '') return 'Enter a name.';
  const taken = players.find((player) => player.name.toLowerCase() === trimmed.toLowerCase());
  if (taken) return `“${taken.name}” is already a player.`;
  return undefined;
}

/**
 * `pc-<n>`, one higher than the highest number in use (D61), so it is unique in the list.
 * Other ids, like the demo campaigns' `pc-alice`, don't count.
 */
function nextId(players: PlayerCharacter[]): string {
  const numbers = players.map((player) => /^pc-(\d+)$/.exec(player.id)?.[1]).map(Number);
  const highest = Math.max(0, ...numbers.filter((n) => Number.isInteger(n)));
  return `pc-${highest + 1}`;
}
