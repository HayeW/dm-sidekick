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
