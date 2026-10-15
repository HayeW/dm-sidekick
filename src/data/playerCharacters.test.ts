import { afterEach, describe, expect, it, vi } from 'vitest';
import { getCampaign, getCampaigns } from './campaigns';
import { deleteImportedCampaign, saveImportedCampaign } from './importedCampaigns';
import { deletePlayers, savePlayers } from './playerCharacters';
import { seedCampaigns } from './seed';

const demo = seedCampaigns[0]!;
const key = (campaignId: string) => `dm-cockpit:v1:players:${campaignId}`;
const names = (campaignId: string) =>
  getCampaign(campaignId)?.playerCharacters.map((player) => player.name);

/** A small campaign file; files have no player characters (DC-114). */
const hollowmere = (scene = 'The Gate') =>
  ['# Hollowmere', `## Scene: ${scene}`, '### DM notes', 'Fog.'].join('\n');

describe('DC-114 — Eigen Player Characters: bewaren', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('gives a demo campaign its seed players until the DM changes them (D59)', () => {
    expect(names(demo.id)).toEqual(['Alice', 'Bob', 'Cora', 'Dain']);
    expect(getCampaign(demo.id)).toBe(demo);
  });

  it('gives an imported campaign no players until the DM adds them (D59)', () => {
    saveImportedCampaign(hollowmere());

    expect(names('imported-hollowmere')).toEqual([]);
  });

  it('uses the stored list, also after a reload', () => {
    expect(savePlayers(demo.id, [{ id: 'pc-1', name: 'Mira' }])).toBe(true);

    expect(localStorage.getItem(key(demo.id))).toBe('[{"id":"pc-1","name":"Mira"}]');
    expect(names(demo.id)).toEqual(['Mira']);
    expect(getCampaigns().find((campaign) => campaign.id === demo.id)?.playerCharacters).toEqual([
      { id: 'pc-1', name: 'Mira' },
    ]);
  });

  it('keeps an empty list: the DM removed every player', () => {
    savePlayers(demo.id, []);

    expect(names(demo.id)).toEqual([]);
  });

  it('keeps one list per campaign, and the rest of the campaign as it is', () => {
    savePlayers(demo.id, [{ id: 'pc-1', name: 'Mira' }]);

    expect(names(seedCampaigns[1]!.id)).toEqual(['Esme', 'Finn']);
    expect(getCampaign(demo.id)).toEqual({
      ...demo,
      playerCharacters: [{ id: 'pc-1', name: 'Mira' }],
    });
    expect(demo.playerCharacters.map((player) => player.name)).toEqual([
      'Alice',
      'Bob',
      'Cora',
      'Dain',
    ]);
  });

  it('gives the same object on every render while the list is unchanged', () => {
    savePlayers(demo.id, [{ id: 'pc-1', name: 'Mira' }]);
    const first = getCampaign(demo.id);

    expect(getCampaign(demo.id)).toBe(first);
    savePlayers(demo.id, [{ id: 'pc-1', name: 'Mirabel' }]);
    expect(getCampaign(demo.id)).not.toBe(first);
    expect(names(demo.id)).toEqual(['Mirabel']);
  });

  it('gives the same imported campaign object on every render, also in the list', () => {
    saveImportedCampaign(hollowmere());
    savePlayers('imported-hollowmere', [{ id: 'pc-1', name: 'Mira' }]);
    const fromList = () => getCampaigns().find((campaign) => campaign.id === 'imported-hollowmere');

    expect(getCampaign('imported-hollowmere')).toBe(getCampaign('imported-hollowmere'));
    expect(fromList()).toBe(fromList());
    expect(fromList()).toBe(getCampaign('imported-hollowmere'));
  });

  it('keeps only the fields a player has', () => {
    localStorage.setItem(key(demo.id), '[{"id":"pc-1","name":"Mira","hp":12}]');

    expect(getCampaign(demo.id)?.playerCharacters).toEqual([{ id: 'pc-1', name: 'Mira' }]);
  });

  it('keeps the list when the campaign is imported again (DC-111)', () => {
    saveImportedCampaign(hollowmere('The Gate'));
    savePlayers('imported-hollowmere', [{ id: 'pc-1', name: 'Mira' }]);

    saveImportedCampaign(hollowmere('The Bridge'));

    expect(getCampaign('imported-hollowmere')?.scenes[0]!.title).toBe('The Bridge');
    expect(names('imported-hollowmere')).toEqual(['Mira']);
  });

  it('removes the list with the campaign (DC-113), so a new import starts empty', () => {
    saveImportedCampaign(hollowmere());
    savePlayers('imported-hollowmere', [{ id: 'pc-1', name: 'Mira' }]);

    deleteImportedCampaign('imported-hollowmere');

    expect(localStorage.getItem(key('imported-hollowmere'))).toBeNull();
    saveImportedCampaign(hollowmere());
    expect(names('imported-hollowmere')).toEqual([]);
  });

  it('goes back to the starting list when the stored list is removed', () => {
    savePlayers(demo.id, [{ id: 'pc-1', name: 'Mira' }]);

    deletePlayers(demo.id);

    expect(getCampaign(demo.id)).toBe(demo);
  });

  it('reports a full or blocked storage as not saved', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('full');
    });

    expect(savePlayers(demo.id, [])).toBe(false);
  });
});

describe('DC-114 — Eigen Player Characters: onleesbare opgeslagen data', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    ['invalid JSON', '[{'],
    ['not a list', '{"id":"pc-1","name":"Mira"}'],
    ['a player without a name', '[{"id":"pc-1"}]'],
    ['an empty name', '[{"id":"pc-1","name":"  "}]'],
    ['a number as id', '[{"id":1,"name":"Mira"}]'],
    ['an id twice', '[{"id":"pc-1","name":"Mira"},{"id":"pc-1","name":"Tok"}]'],
    ['a name twice', '[{"id":"pc-1","name":"Mira"},{"id":"pc-2","name":"MIRA"}]'],
  ])('falls back to the starting list for %s, without crashing', (_, text) => {
    localStorage.setItem(key(demo.id), text);

    expect(getCampaign(demo.id)).toBe(demo);
  });

  it('falls back to the starting list when storage is blocked', () => {
    savePlayers(demo.id, [{ id: 'pc-1', name: 'Mira' }]);
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    expect(getCampaign(demo.id)).toBe(demo);
  });
});
