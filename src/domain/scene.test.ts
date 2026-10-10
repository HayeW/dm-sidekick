import { describe, expect, it } from 'vitest';
import type { Campaign, Encounter } from './campaign';
import { enemySummary, findEncounter, findScene, openingScene } from './scene';

const encounter: Encounter = {
  id: 'enc-1',
  name: 'Ambush',
  enemies: [
    { name: 'Goblin', count: 3, hp: 7, initiativeBonus: 2 },
    { name: 'Goblin Boss', count: 1, hp: 21, initiativeBonus: 2 },
  ],
};

const campaign: Campaign = {
  id: 'c-1',
  name: 'Test campaign',
  playerCharacters: [],
  encounters: [encounter],
  scenes: [
    { id: 's-1', title: 'First', blocks: [] },
    { id: 's-2', title: 'Second', blocks: [] },
  ],
};

describe('DC-002 — Campaign openen', () => {
  it('opens the first scene of a campaign', () => {
    expect(openingScene(campaign)?.id).toBe('s-1');
  });

  it('has no scene to open for a campaign without scenes', () => {
    expect(openingScene({ ...campaign, scenes: [] })).toBeUndefined();
  });
});

describe('DC-010 — Scene tonen', () => {
  it('finds a scene by id', () => {
    expect(findScene(campaign, 's-2')?.title).toBe('Second');
    expect(findScene(campaign, 'nope')).toBeUndefined();
  });

  it('finds an encounter by id', () => {
    expect(findEncounter(campaign, 'enc-1')).toBe(encounter);
    expect(findEncounter(campaign, 'nope')).toBeUndefined();
  });

  it('summarises the enemies of an encounter compactly', () => {
    expect(enemySummary(encounter)).toBe('3 × Goblin, 1 × Goblin Boss');
  });
});
