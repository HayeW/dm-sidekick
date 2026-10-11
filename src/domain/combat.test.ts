import { describe, expect, it } from 'vitest';
import type { Campaign, Encounter } from './campaign';
import type { Combat } from './combat';
import {
  addCombatant,
  applyDamage,
  isDead,
  moveCombatant,
  removeCombatant,
  startCombat,
} from './combat';

const ambush: Encounter = {
  id: 'enc-1',
  name: 'Ambush',
  enemies: [
    { name: 'Goblin', count: 3, hp: 7 },
    { name: 'Goblin Boss', count: 1, hp: 21 },
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
  it('adds every enemy of the encounter and every player character of the campaign', () => {
    const combat = startCombat(campaign, 's-1', ambush);

    expect(combat.combatants).toHaveLength(6);
    expect(combat.combatants.filter((c) => c.type === 'ENEMY')).toHaveLength(4);
    expect(combat.combatants.filter((c) => c.type === 'PLAYER')).toHaveLength(2);
  });

  it('records where the combat started', () => {
    const combat = startCombat(campaign, 's-1', ambush);

    expect(combat).toMatchObject({ campaignId: 'c-1', sceneId: 's-1', encounterId: 'enc-1' });
  });

  it('numbers enemies that share a name; a single enemy keeps its plain name (D5)', () => {
    const combat = startCombat(campaign, 's-1', ambush);

    expect(names(combat)).toEqual(
      expect.arrayContaining(['Goblin 1', 'Goblin 2', 'Goblin 3', 'Goblin Boss']),
    );
  });

  it('numbers across groups with the same name', () => {
    const encounter: Encounter = {
      id: 'enc-2',
      name: 'Two packs',
      enemies: [
        { name: 'Wolf', count: 1, hp: 11 },
        { name: 'Wolf', count: 1, hp: 11 },
      ],
    };
    const combat = startCombat(campaign, 's-1', encounter);

    expect(names(combat).slice(0, 2)).toEqual(['Wolf 1', 'Wolf 2']);
  });

  it('gives enemies full HP from their group', () => {
    const combat = startCombat(campaign, 's-1', ambush);
    const boss = combat.combatants.find((c) => c.name === 'Goblin Boss');

    expect(boss).toMatchObject({ hp: 21, maxHp: 21 });
  });

  it('gives every combatant a unique id', () => {
    const combat = startCombat(campaign, 's-1', ambush);
    const ids = combat.combatants.map((c) => c.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('never changes the campaign or the encounter', () => {
    const before = structuredClone(campaign);
    startCombat(campaign, 's-1', ambush);

    expect(campaign).toEqual(before);
  });
});

describe('DC-050 — Initiële enemy-volgorde', () => {
  const encounterOf = (...names: string[]): Encounter => ({
    id: 'enc-x',
    name: 'Mixed',
    enemies: names.map((name) => ({ name, count: 1, hp: 5 })),
  });

  it('sorts enemies alphabetically, without rolling dice (D19)', () => {
    const combat = startCombat(campaign, 's-1', encounterOf('Wolf', 'Bandit', 'Ogre'));

    expect(names(combat).slice(0, 3)).toEqual(['Bandit', 'Ogre', 'Wolf']);
  });

  it('puts numbered enemies in natural order: 2 before 10', () => {
    const encounter: Encounter = {
      id: 'enc-x',
      name: 'Swarm',
      enemies: [{ name: 'Rat', count: 10, hp: 1 }],
    };

    expect(names(startCombat(campaign, 's-1', encounter)).slice(0, 10)).toEqual([
      'Rat 1',
      'Rat 2',
      'Rat 3',
      'Rat 4',
      'Rat 5',
      'Rat 6',
      'Rat 7',
      'Rat 8',
      'Rat 9',
      'Rat 10',
    ]);
  });

  it('puts the numbered group before a longer name with the same start', () => {
    expect(names(startCombat(campaign, 's-1', ambush)).slice(0, 4)).toEqual([
      'Goblin 1',
      'Goblin 2',
      'Goblin 3',
      'Goblin Boss',
    ]);
  });

  it('ignores upper and lower case', () => {
    const combat = startCombat(campaign, 's-1', encounterOf('bandit', 'Archer', 'Cultist'));

    expect(names(combat).slice(0, 3)).toEqual(['Archer', 'bandit', 'Cultist']);
  });

  it('keeps encounter order for names that only differ in case', () => {
    const forward = startCombat(campaign, 's-1', encounterOf('orc', 'Orc'));
    const backward = startCombat(campaign, 's-1', encounterOf('Orc', 'orc'));

    expect(names(forward).slice(0, 2)).toEqual(['orc', 'Orc']);
    expect(names(backward).slice(0, 2)).toEqual(['Orc', 'orc']);
  });

  it('starts the same encounter in the same order every time', () => {
    expect(names(startCombat(campaign, 's-1', ambush))).toEqual(
      names(startCombat(campaign, 's-1', ambush)),
    );
  });
});

describe('DC-051 — Player Characters toevoegen aan combat', () => {
  it('appends all player characters after the enemies, in campaign order (D2)', () => {
    const combat = startCombat(campaign, 's-1', ambush);

    expect(names(combat).slice(4)).toEqual(['Aria', 'Dain']);
  });

  it('does not track HP for player characters (D3)', () => {
    const combat = startCombat(campaign, 's-1', ambush);
    const players = combat.combatants.filter((c) => c.type === 'PLAYER');

    expect(players.every((pc) => pc.hp === null && pc.maxHp === null)).toBe(true);
  });

  it('starts with only player characters for an encounter without enemies', () => {
    const empty: Encounter = { id: 'enc-0', name: 'Quiet', enemies: [] };
    const combat = startCombat(campaign, 's-1', empty);

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

describe('DC-065 / DC-066 — Combatant toevoegen', () => {
  const combat: Combat = {
    campaignId: 'c-1',
    sceneId: 's-1',
    encounterId: 'enc-1',
    combatants: [
      { id: 'enemy:1', name: 'Goblin', type: 'ENEMY', hp: 7, maxHp: 7 },
      { id: 'pc:pc-aria', name: 'Aria', type: 'PLAYER', hp: null, maxHp: null },
    ],
  };

  it('adds the combatant at the bottom, with full HP', () => {
    const after = addCombatant(combat, { name: 'Wolf', hp: 11 });

    expect(after.combatants.map((c) => c.name)).toEqual(['Goblin', 'Aria', 'Wolf']);
    expect(after.combatants[2]).toMatchObject({ type: 'ENEMY', hp: 11, maxHp: 11 });
  });

  it('adds a combatant without HP when none is given (D8)', () => {
    const added = addCombatant(combat, { name: 'Strange voice', hp: null }).combatants[2];

    expect(added).toMatchObject({ name: 'Strange voice', type: 'ENEMY', hp: null, maxHp: null });
    expect(isDead(added!)).toBe(false);
  });

  it('treats HP that is not a whole number above 0 as no HP', () => {
    for (const hp of [0, -3, 2.5, Number.NaN]) {
      expect(addCombatant(combat, { name: 'Wolf', hp }).combatants[2]?.hp).toBeNull();
    }
  });

  it('trims the name and ignores a blank name', () => {
    expect(addCombatant(combat, { name: '  Wolf ', hp: 11 }).combatants[2]?.name).toBe('Wolf');
    expect(addCombatant(combat, { name: '   ', hp: 11 })).toBe(combat);
  });

  it('gives every added combatant its own id that cannot collide with the others (D15)', () => {
    const twice = addCombatant(addCombatant(combat, { name: 'Wolf', hp: 11 }), {
      name: 'Wolf',
      hp: 11,
    });
    const ids = twice.combatants.map((c) => c.id);

    expect(ids.slice(2)).toEqual(['added:1', 'added:2']);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('does not reuse the id of an added combatant that is still in the combat', () => {
    const two = addCombatant(addCombatant(combat, { name: 'A', hp: 1 }), { name: 'B', hp: 1 });
    const afterRemove = removeCombatant(two, 'added:1');

    expect(addCombatant(afterRemove, { name: 'C', hp: 1 }).combatants.at(-1)?.id).toBe('added:3');
  });

  it('can be moved into place like any other combatant (DC-066)', () => {
    const after = moveCombatant(addCombatant(combat, { name: 'Wolf', hp: 11 }), 'added:1', 'up');

    expect(after.combatants.map((c) => c.name)).toEqual(['Goblin', 'Wolf', 'Aria']);
  });

  it('does not change the original combat', () => {
    const before = structuredClone(combat);
    addCombatant(combat, { name: 'Wolf', hp: 11 });

    expect(combat).toEqual(before);
  });
});

describe('DC-067 — Combatant verwijderen', () => {
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

  it('removes that combatant; the others keep their order', () => {
    expect(order(removeCombatant(combat, 'b'))).toEqual(['a', 'c']);
  });

  it('removes player characters too', () => {
    expect(order(removeCombatant(combat, 'c'))).toEqual(['a', 'b']);
  });

  it('does nothing for an unknown combatant', () => {
    expect(order(removeCombatant(combat, 'x'))).toEqual(['a', 'b', 'c']);
  });

  it('does not change the original combat', () => {
    const before = structuredClone(combat);
    removeCombatant(combat, 'a');

    expect(combat).toEqual(before);
  });
});
