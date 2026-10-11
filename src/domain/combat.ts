// Combat: runtime session state, separate from campaign data. Starting or running a combat
// never changes the campaign (docs/implementation-plan-slice-1.md, §4).

import type { Campaign, Encounter } from './campaign';
import { rollD20, type RandomSource } from './dice';

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
  /** Array order is the combat order. Initiative is not stored. */
  combatants: Combatant[];
};

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

/** What the DM fills in to add a combatant during combat (decision D8). */
export type NewCombatant = {
  name: string;
  /** Optional: null when the DM doesn't track this combatant's HP. */
  hp: number | null;
};

/**
 * Adds a combatant at the bottom of the combat order, without an initiative roll (DC-065).
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
 * every enemy gets its own initiative roll and the enemies are sorted by it (DC-050), then
 * all player characters of the campaign are appended in campaign order (DC-051, decision D2).
 */
export function startCombat(
  campaign: Campaign,
  sceneId: string,
  encounter: Encounter,
  random: RandomSource,
): Combat {
  const enemies = expandEnemies(encounter).map((enemy) => ({
    ...enemy,
    initiative: rollD20(random) + enemy.initiativeBonus,
    tieBreaker: random(),
  }));

  // Higher initiative first; ties: higher bonus first, then random (decision D6).
  enemies.sort(
    (a, b) =>
      b.initiative - a.initiative ||
      b.initiativeBonus - a.initiativeBonus ||
      b.tieBreaker - a.tieBreaker,
  );

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
    combatants: [...enemies.map(({ combatant }) => combatant), ...players],
  };
}

/**
 * One combatant per enemy, in encounter order. Enemies that share a name are numbered
 * ("Goblin 1", "Goblin 2"); a single enemy keeps its plain name ("Goblin Boss") (decision D5).
 */
function expandEnemies(encounter: Encounter): { combatant: Combatant; initiativeBonus: number }[] {
  const totalByName = new Map<string, number>();
  for (const group of encounter.enemies) {
    totalByName.set(group.name, (totalByName.get(group.name) ?? 0) + group.count);
  }

  const numberedByName = new Map<string, number>();
  const enemies: { combatant: Combatant; initiativeBonus: number }[] = [];
  for (const group of encounter.enemies) {
    for (let i = 0; i < group.count; i++) {
      const number = (numberedByName.get(group.name) ?? 0) + 1;
      numberedByName.set(group.name, number);
      const numbered = (totalByName.get(group.name) ?? 0) > 1;
      enemies.push({
        combatant: {
          id: `enemy:${enemies.length + 1}`,
          name: numbered ? `${group.name} ${number}` : group.name,
          type: 'ENEMY',
          hp: group.hp,
          maxHp: group.hp,
        },
        initiativeBonus: group.initiativeBonus,
      });
    }
  }
  return enemies;
}
