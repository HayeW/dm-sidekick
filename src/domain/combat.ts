// Combat: runtime session state, separate from campaign data. Starting or running a combat
// never changes the campaign (docs/implementation-plan-slice-1.md, §4).

import type { Campaign, Encounter } from './campaign';

export type CombatantType = 'PLAYER' | 'ENEMY' | 'NPC';

export type Combatant = {
  id: string;
  /** e.g. "Goblin 2" (decision D5). */
  name: string;
  type: CombatantType;
  /** Null for player characters: their HP is not tracked (decision D3). */
  hp: number | null;
  maxHp: number | null;
};

export type Combat = {
  campaignId: string;
  sceneId: string;
  encounterId: string | null;
  /** Array order is the combat order. There is no initiative (D19). */
  combatants: Combatant[];
};

/** Compares names alphabetically: case-insensitive, numbers in natural order (D19). */
const byName = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });

/** The damage buttons on every combatant with HP (DC-061). */
export const DAMAGE_AMOUNTS = [1, 5, 10] as const;

/**
 * Lowers a combatant's HP by `amount`, never below 0 (DC-061, decision D4). Returns a new
 * combat; the order stays the same. Player characters have no HP and are left unchanged (D3).
 */
export function applyDamage(combat: Combat, combatantId: string, amount: number): Combat {
  return {
    ...combat,
    combatants: combat.combatants.map((combatant) =>
      combatant.id === combatantId && combatant.hp !== null
        ? { ...combatant, hp: Math.max(0, combatant.hp - amount) }
        : combatant,
    ),
  };
}

/**
 * Moves a combatant one place up or down in the combat order by swapping it with its
 * neighbour (DC-064, DC-052). At the top or bottom nothing changes. Returns a new combat.
 */
export function moveCombatant(
  combat: Combat,
  combatantId: string,
  direction: 'up' | 'down',
): Combat {
  const from = combat.combatants.findIndex((combatant) => combatant.id === combatantId);
  const to = direction === 'up' ? from - 1 : from + 1;
  if (from === -1 || to < 0 || to >= combat.combatants.length) return combat;

  const combatants = [...combat.combatants];
  [combatants[from], combatants[to]] = [combatants[to]!, combatants[from]!];
  return { ...combat, combatants };
}

/**
 * Moves a combatant to position `to` in the combat order, as when it is dragged there
 * (DC-064, DC-052, decision D21). The others keep their order. A position outside the list
 * is clamped to the top or bottom. Returns a new combat.
 */
export function moveCombatantTo(combat: Combat, combatantId: string, to: number): Combat {
  const from = combat.combatants.findIndex((combatant) => combatant.id === combatantId);
  if (from === -1) return combat;

  const combatants = [...combat.combatants];
  const [moved] = combatants.splice(from, 1);
  combatants.splice(Math.max(0, Math.min(to, combatants.length)), 0, moved!);
  return { ...combat, combatants };
}

/** What the DM fills in to add a combatant during combat (decision D8). */
export type NewCombatant = {
  name: string;
  /** Optional: null when the DM doesn't track this combatant's HP. */
  hp: number | null;
};

/**
 * Adds a combatant at the bottom of the combat order, not in its alphabetical place (DC-065).
 * It is an enemy by default (D8). Its id `added:<n>` cannot collide with the ids from
 * `startCombat` (D15). A blank name changes nothing; HP that is not a whole number above 0
 * counts as no HP. Returns a new combat.
 */
export function addCombatant(combat: Combat, newCombatant: NewCombatant): Combat {
  const name = newCombatant.name.trim();
  if (name === '') return combat;
  const hp =
    newCombatant.hp !== null && Number.isInteger(newCombatant.hp) && newCombatant.hp > 0
      ? newCombatant.hp
      : null;

  const highest = Math.max(
    0,
    ...combat.combatants.map((combatant) =>
      combatant.id.startsWith('added:') ? Number(combatant.id.slice('added:'.length)) || 0 : 0,
    ),
  );
  return {
    ...combat,
    combatants: [
      ...combat.combatants,
      { id: `added:${highest + 1}`, name, type: 'ENEMY', hp, maxHp: hp },
    ],
  };
}

/** Takes a combatant out of the combat; the others keep their order (DC-067). */
export function removeCombatant(combat: Combat, combatantId: string): Combat {
  return {
    ...combat,
    combatants: combat.combatants.filter((combatant) => combatant.id !== combatantId),
  };
}

/**
 * DEAD is derived from HP, not stored: a combatant at 0 HP (DC-063). A dead combatant stays
 * in the combat at its position. Player characters are never dead (D3).
 */
export function isDead(combatant: Combatant): boolean {
  return combatant.hp === 0;
}

/**
 * Starts a combat from an encounter, without any configuration step (DC-043):
 * the enemies in alphabetical order (DC-050), then all player characters of the campaign in
 * campaign order (DC-051, decision D2). No dice are rolled (decision D19).
 */
export function startCombat(campaign: Campaign, sceneId: string, encounter: Encounter): Combat {
  // Alphabetical, ignoring case, numbers in natural order: "Goblin 2" before "Goblin 10".
  // The sort is stable, so equal names keep encounter order (D19).
  const enemies = expandEnemies(encounter).sort((a, b) => byName.compare(a.name, b.name));

  const players: Combatant[] = campaign.playerCharacters.map((pc) => ({
    id: `pc:${pc.id}`,
    name: pc.name,
    type: 'PLAYER',
    hp: null,
    maxHp: null,
  }));

  return {
    campaignId: campaign.id,
    sceneId,
    encounterId: encounter.id,
    combatants: [...enemies, ...players],
  };
}

/**
 * One combatant per enemy, in encounter order. Enemies that share a name are numbered
 * ("Goblin 1", "Goblin 2"); a single enemy keeps its plain name ("Goblin Boss") (decision D5).
 */
function expandEnemies(encounter: Encounter): Combatant[] {
  const totalByName = new Map<string, number>();
  for (const group of encounter.enemies) {
    totalByName.set(group.name, (totalByName.get(group.name) ?? 0) + group.count);
  }

  const numberedByName = new Map<string, number>();
  const enemies: Combatant[] = [];
  for (const group of encounter.enemies) {
    for (let i = 0; i < group.count; i++) {
      const number = (numberedByName.get(group.name) ?? 0) + 1;
      numberedByName.set(group.name, number);
      const numbered = (totalByName.get(group.name) ?? 0) > 1;
      enemies.push({
        id: `enemy:${enemies.length + 1}`,
        name: numbered ? `${group.name} ${number}` : group.name,
        type: 'ENEMY',
        hp: group.hp,
        maxHp: group.hp,
      });
    }
  }
  return enemies;
}
