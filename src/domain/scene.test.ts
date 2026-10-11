import { describe, expect, it } from 'vitest';
import type {
  Campaign,
  ContentBlock,
  Description,
  DescriptionsBlock,
  Encounter,
  Scene,
} from './campaign';
import {
  canOpenTile,
  enemySummary,
  findBlock,
  findDescription,
  findEncounter,
  findScene,
  neighbours,
  openingScene,
} from './scene';

const encounter: Encounter = {
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

describe('DC-003 — Laatst gebruikte scene onthouden', () => {
  it('opens the last used scene', () => {
    expect(openingScene(campaign, 's-2')?.id).toBe('s-2');
  });

  it('opens the first scene when the last used scene no longer exists', () => {
    expect(openingScene(campaign, 'deleted-scene')?.id).toBe('s-1');
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

describe('DC-011 — Descriptions tile openen', () => {
  const intro: Description = { id: 'd-intro', title: 'Intro', text: 'Read this aloud.' };
  const middle: Description = { id: 'd-middle', title: 'Halfway', text: 'Then this.' };
  const end: Description = { id: 'd-end', title: 'Arriving at the end', text: 'And this.' };
  const descriptions: DescriptionsBlock = {
    id: 'b-descriptions',
    type: 'descriptions',
    descriptions: [intro, middle, end],
  };
  const notes: ContentBlock = { id: 'b-notes', type: 'notes', text: 'Secret.' };
  const scene: Scene = { id: 's-1', title: 'First', blocks: [descriptions, notes] };

  it('finds a block in a scene by id', () => {
    expect(findBlock(scene, 'b-notes')).toBe(notes);
    expect(findBlock(scene, 'nope')).toBeUndefined();
  });

  it('can open a Descriptions tile', () => {
    expect(canOpenTile(descriptions)).toBe(true);
  });

  it('cannot open an empty Descriptions tile', () => {
    expect(canOpenTile({ ...descriptions, descriptions: [] })).toBe(false);
  });

  it('cannot open other tiles yet', () => {
    expect(canOpenTile(notes)).toBe(false);
    expect(canOpenTile({ id: 'b-enc', type: 'encounter', encounterId: 'enc-1' })).toBe(false);
  });

  it('shows the first description when none is chosen', () => {
    expect(findDescription(descriptions)).toBe(intro);
  });

  it('finds a description by id', () => {
    expect(findDescription(descriptions, 'd-end')).toBe(end);
    expect(findDescription(descriptions, 'nope')).toBeUndefined();
  });

  it('gives the previous and next description', () => {
    expect(neighbours(descriptions.descriptions, 'd-middle')).toEqual({
      previous: intro,
      next: end,
    });
  });

  it('has no previous description at the first and no next at the last', () => {
    expect(neighbours(descriptions.descriptions, 'd-intro')).toEqual({
      previous: undefined,
      next: middle,
    });
    expect(neighbours(descriptions.descriptions, 'd-end')).toEqual({
      previous: middle,
      next: undefined,
    });
  });

  it('has no neighbours for an unknown id', () => {
    expect(neighbours(descriptions.descriptions, 'nope')).toEqual({
      previous: undefined,
      next: undefined,
    });
  });
});

describe('DC-015 / DC-016 — Vorige en volgende scene', () => {
  const [first, second] = campaign.scenes;

  it('gives the next scene from the first scene, and no previous one', () => {
    expect(neighbours(campaign.scenes, 's-1')).toEqual({ previous: undefined, next: second });
  });

  it('gives the previous scene from the last scene, and no next one', () => {
    expect(neighbours(campaign.scenes, 's-2')).toEqual({ previous: first, next: undefined });
  });
});
