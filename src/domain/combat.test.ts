import { describe, expect, it } from 'vitest';
import type { Campaign, Encounter } from './campaign';
import type { Combat } from './combat';
import { applyDamage, isDead, moveCombatant, startCombat } from './combat';
import type { RandomSource } from './dice';

/** Returns the given values in order; fails the test if more are asked for. */
function fixedRandom(values: number[]): RandomSource {
  const remaining = [...values];
  return () => {
    const value = remaining.shift();
    if (value === undefined) throw new Error('fixedRandom: out of values');
    return value;
  };
}

/** The random value that makes `rollD20` roll `result`. */
const d20 = (result: number) => (result - 0.5) / 20;

/** Random values for enemies in encounter order: per enemy a d20 result and a tie-breaker. */
const rolls = (...perEnemy: [roll: number, tieBreaker: number][]) =>
  fixedRandom(perEnemy.flatMap(([roll, tieBreaker]) => [d20(roll), tieBreaker]));

const ambush: Encounter = {
  id: 'enc-1',
  name: 'Ambush',
  enemies: [
    { name: 'Goblin', count: 3, hp: 7, initiativeBonus: 2 },
    { name: 'Goblin Boss', count: 1, hp: 21, initiativeBonus: 4 },
  ],
};

const campaign: Campaign = {
  id: 'c-1',
  name: 'Test campaign',
  scenes: [{ id: 's-1', title: 'Road', blocks: [] }],
  playerCharacters: [
    { id: 'pc-aria', name: 'Aria' },
    { id: 'pc-dain', name: 'Dain' },
  ],
  encounters: [ambush],
};

const names = (combat: ReturnType<typeof startCombat>) => combat.combatants.map((c) => c.name);

describe('DC-043 — Combat rechtstreeks starten', () => {
  const random = () => rolls([10, 0], [10, 0], [10, 0], [10, 0]);

  it('adds every enemy of the encounter and every player character of the campaign', () => {
    const combat = startCombat(campaign, 's-1', ambush, random());

    expect(combat.combatants).toHaveLength(6);
    expect(combat.combatants.filter((c) => c.type === 'ENEMY')).toHaveLength(4);
    expect(combat.combatants.filter((c) => c.type === 'PLAYER')).toHaveLength(2);
  });

  it('records where the combat started', () => {
    const combat = startCombat(campaign, 's-1', ambush, random());

    expect(combat).toMatchObject({ campaignId: 'c-1', sceneId: 's-1', encounterId: 'enc-1' });
  });

  it('numbers enemies that share a name; a single enemy keeps its plain name (D5)', () => {
    const combat = startCombat(campaign, 's-1', ambush, random());

    expect(names(combat)).toEqual(
      expect.arrayContaining(['Goblin 1', 'Goblin 2', 'Goblin 3', 'Goblin Boss']),
    );
  });

  it('numbers across groups with the same name', () => {
    const encounter: Encounter = {
      id: 'enc-2',
      name: 'Two packs',
      enemies: [
        { name: 'Wolf', count: 1, hp: 11, initiativeBonus: 2 },
        { name: 'Wolf', count: 1, hp: 11, initiativeBonus: 2 },
      ],
    };
    const combat = startCombat(campaign, 's-1', encounter, rolls([12, 0], [8, 0]));

    expect(names(combat).slice(0, 2)).toEqual(['Wolf 1', 'Wolf 2']);
  });

  it('gives enemies full HP from their group', () => {
    const combat = startCombat(campaign, 's-1', ambush, random());
    const boss = combat.combatants.find((c) => c.name === 'Goblin Boss');

    expect(boss).toMatchObject({ hp: 21, maxHp: 21 });
  });

  it('gives every combatant a unique id', () => {
    const combat = startCombat(campaign, 's-1', ambush, random());
    const ids = combat.combatants.map((c) => c.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('never changes the campaign or the encounter', () => {
    const before = structuredClone(campaign);
    startCombat(campaign, 's-1', ambush, random());

    expect(campaign).toEqual(before);
  });
});

describe('DC-050 — Enemy initiative rollen', () => {
  it('sorts enemies by d20 + initiative bonus, highest first', () => {
    // Goblin 1: 5+2=7, Goblin 2: 18+2=20, Goblin 3: 11+2=13, Boss: 10+4=14.
    // The bonus matters: on the raw roll alone Goblin 3 (11) would beat the Boss (10).
    const combat = startCombat(campaign, 's-1', ambush, rolls([5, 0], [18, 0], [11, 0], [10, 0]));

    expect(names(combat).slice(0, 4)).toEqual(['Goblin 2', 'Goblin Boss', 'Goblin 3', 'Goblin 1']);
  });

  it('rolls separately for every enemy', () => {
    const random = rolls([1, 0], [2, 0], [3, 0], [4, 0]);
    startCombat(campaign, 's-1', ambush, random);

    // All values used: one roll and one tie-breaker per enemy, nothing left over.
    expect(() => random()).toThrow('out of values');
  });

  it('puts the higher initiative bonus first on a tie (D6)', () => {
    // Goblin 1: 10+2=12, Boss: 8+4=12 → the Boss has the higher bonus.
    const combat = startCombat(campaign, 's-1', ambush, rolls([10, 0.9], [1, 0], [1, 0], [8, 0.1]));

    expect(names(combat).slice(0, 2)).toEqual(['Goblin Boss', 'Goblin 1']);
  });

  it('breaks a tie with the same bonus randomly (D6)', () => {
    // All goblins roll 10+2=12; the tie-breakers decide.
    const combat = startCombat(
      campaign,
      's-1',
      ambush,
      rolls([10, 0.2], [10, 0.7], [10, 0.5], [1, 0]),
    );

    expect(names(combat).slice(0, 3)).toEqual(['Goblin 2', 'Goblin 3', 'Goblin 1']);
  });
});

describe('DC-051 — Player Characters toevoegen aan combat', () => {
  it('appends all player characters after the enemies, in campaign order (D2)', () => {
    const combat = startCombat(campaign, 's-1', ambush, rolls([1, 0], [1, 0], [1, 0], [1, 0]));

    expect(names(combat).slice(4)).toEqual(['Aria', 'Dain']);
  });

  it('does not track HP for player characters (D3)', () => {
    const combat = startCombat(campaign, 's-1', ambush, rolls([1, 0], [1, 0], [1, 0], [1, 0]));
    const players = combat.combatants.filter((c) => c.type === 'PLAYER');

    expect(players.every((pc) => pc.hp === null && pc.maxHp === null)).toBe(true);
  });

  it('starts with only player characters for an encounter without enemies', () => {
    const empty: Encounter = { id: 'enc-0', name: 'Quiet', enemies: [] };
    const combat = startCombat(campaign, 's-1', empty, fixedRandom([]));

    expect(names(combat)).toEqual(['Aria', 'Dain']);
  });
});

describe('DC-061 — Damage toepassen', () => {
  const combat: Combat = {
    campaignId: 'c-1',
    sceneId: 's-1',
    encounterId: 'enc-1',
    combatants: [
      { id: 'enemy:1', name: 'Goblin 1', type: 'ENEMY', hp: 7, maxHp: 7 },
      { id: 'enemy:2', name: 'Goblin 2', type: 'ENEMY', hp: 7, maxHp: 7 },
      { id: 'pc:pc-aria', name: 'Aria', type: 'PLAYER', hp: null, maxHp: null },
    ],
  };
  const hpOf = (c: Combat, id: string) => c.combatants.find((x) => x.id === id)?.hp;

  it('lowers the HP of that combatant only', () => {
    const after = applyDamage(combat, 'enemy:2', 5);

    expect(hpOf(after, 'enemy:2')).toBe(2);
    expect(hpOf(after, 'enemy:1')).toBe(7);
  });

  it('adds up repeated damage', () => {
    const after = applyDamage(applyDamage(combat, 'enemy:1', 1), 'enemy:1', 1);

    expect(hpOf(after, 'enemy:1')).toBe(5);
  });

  it('never goes below 0 HP (D4)', () => {
    const after = applyDamage(combat, 'enemy:1', 10);

    expect(hpOf(after, 'enemy:1')).toBe(0);
    expect(hpOf(applyDamage(after, 'enemy:1', 1), 'enemy:1')).toBe(0);
  });

  it('keeps max HP and the combat order', () => {
    const after = applyDamage(combat, 'enemy:1', 5);

    expect(after.combatants.map((c) => c.id)).toEqual(combat.combatants.map((c) => c.id));
    expect(after.combatants[0]?.maxHp).toBe(7);
  });

  it('leaves player characters without HP (D3)', () => {
    const after = applyDamage(combat, 'pc:pc-aria', 5);

    expect(hpOf(after, 'pc:pc-aria')).toBeNull();
  });

  it('does not change the original combat', () => {
    const before = structuredClone(combat);
    applyDamage(combat, 'enemy:1', 5);

    expect(combat).toEqual(before);
  });
});

describe('DC-063 — Dead combatant markeren', () => {
  const goblin = { id: 'enemy:1', name: 'Goblin 1', type: 'ENEMY' as const, maxHp: 7 };

  it('is dead at 0 HP', () => {
    expect(isDead({ ...goblin, hp: 0 })).toBe(true);
  });

  it('is alive above 0 HP', () => {
    expect(isDead({ ...goblin, hp: 1 })).toBe(false);
  });

  it('never marks a player character dead (D3)', () => {
    expect(isDead({ id: 'pc:a', name: 'Aria', type: 'PLAYER', hp: null, maxHp: null })).toBe(false);
  });
});

describe('DC-064 / DC-052 — Combatant verplaatsen', () => {
  const combat: Combat = {
    campaignId: 'c-1',
    sceneId: 's-1',
    encounterId: 'enc-1',
    combatants: [
      { id: 'a', name: 'Goblin 1', type: 'ENEMY', hp: 7, maxHp: 7 },
      { id: 'b', name: 'Goblin 2', type: 'ENEMY', hp: 0, maxHp: 7 },
      { id: 'c', name: 'Aria', type: 'PLAYER', hp: null, maxHp: null },
    ],
  };
  const order = (c: Combat) => c.combatants.map((x) => x.id);

  it('moves a combatant one place up', () => {
    expect(order(moveCombatant(combat, 'c', 'up'))).toEqual(['a', 'c', 'b']);
  });

  it('moves a combatant one place down', () => {
    expect(order(moveCombatant(combat, 'a', 'down'))).toEqual(['b', 'a', 'c']);
  });

  it('moves player characters too (DC-052)', () => {
    expect(order(moveCombatant(moveCombatant(combat, 'c', 'up'), 'c', 'up'))).toEqual([
      'c',
      'a',
      'b',
    ]);
  });

  it('moves dead combatants too', () => {
    expect(order(moveCombatant(combat, 'b', 'up'))).toEqual(['b', 'a', 'c']);
  });

  it('does nothing when moving the top combatant up', () => {
    expect(order(moveCombatant(combat, 'a', 'up'))).toEqual(['a', 'b', 'c']);
  });

  it('does nothing when moving the bottom combatant down', () => {
    expect(order(moveCombatant(combat, 'c', 'down'))).toEqual(['a', 'b', 'c']);
  });

  it('does nothing for an unknown combatant', () => {
    expect(order(moveCombatant(combat, 'x', 'up'))).toEqual(['a', 'b', 'c']);
  });

  it('keeps HP and does not change the original combat', () => {
    const before = structuredClone(combat);
    const after = moveCombatant(combat, 'b', 'down');

    expect(after.combatants.find((x) => x.id === 'b')?.hp).toBe(0);
    expect(combat).toEqual(before);
  });
});
