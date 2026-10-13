import { describe, expect, it } from 'vitest';
import type { Campaign } from './campaign';
import { findLocation, findNote, findNpc, findNpcs } from './entities';

const campaign: Campaign = {
  id: 'c-1',
  name: 'Test campaign',
  scenes: [],
  playerCharacters: [],
  encounters: [],
  npcs: [
    { id: 'npc-marta', name: 'Marta', description: 'Innkeeper' },
    { id: 'npc-fenn', name: 'Fenn', description: 'Old farmer' },
  ],
  locations: [{ id: 'loc-inn', name: 'The Inn', description: 'Smoky' }],
  notes: [{ id: 'note-1', title: 'Rumours', text: 'The miller is missing.' }],
};

describe('DC-033 — NPC hergebruiken in scenes (campaign-level entities, D25)', () => {
  it('finds an NPC by id', () => {
    expect(findNpc(campaign, 'npc-fenn')?.name).toBe('Fenn');
  });

  it('finds several NPCs in the order the scene lists them', () => {
    expect(findNpcs(campaign, ['npc-fenn', 'npc-marta']).map((npc) => npc.name)).toEqual([
      'Fenn',
      'Marta',
    ]);
  });

  it('leaves out NPC ids that refer to nothing', () => {
    expect(findNpcs(campaign, ['npc-gone', 'npc-marta']).map((npc) => npc.name)).toEqual(['Marta']);
    expect(findNpc(campaign, 'npc-gone')).toBeUndefined();
  });

  it('finds a location by id, and nothing for an unknown id', () => {
    expect(findLocation(campaign, 'loc-inn')?.name).toBe('The Inn');
    expect(findLocation(campaign, 'loc-gone')).toBeUndefined();
  });

  it('finds a campaign note by id, and nothing for an unknown id', () => {
    expect(findNote(campaign, 'note-1')?.title).toBe('Rumours');
    expect(findNote(campaign, 'note-gone')).toBeUndefined();
  });
});
