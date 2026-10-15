import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getCampaign, getCampaigns } from './campaigns';
import {
  deleteImportedCampaign,
  loadImportedCampaign,
  saveImportedCampaign,
} from './importedCampaigns';
import { deletePlayers, savePlayers } from './playerCharacters';

const key = (campaignId: string) => `dm-sidekick:v1:players:${campaignId}`;
const names = (campaignId: string) =>
  getCampaign(campaignId)?.playerCharacters.map((player) => player.name);

/** A small campaign file; files have no player characters (DC-114). */
const hollowmere = (scene = 'The Gate') =>
  ['# Hollowmere', `## Scene: ${scene}`, '### DM notes', 'Fog.'].join('\n');
const id = 'imported-hollowmere';
/** The campaign as read from its file, without the DM's own list. */
const imported = () => loadImportedCampaign(id);

describe('DC-114 — Eigen Player Characters: bewaren', () => {
  beforeEach(() => {
    saveImportedCampaign(hollowmere());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('gives a campaign no players until the DM adds them (D59)', () => {
    expect(names(id)).toEqual([]);
    expect(getCampaign(id)).toBe(imported());
  });

  it('uses the stored list, also after a reload', () => {
    expect(savePlayers(id, [{ id: 'pc-1', name: 'Mira' }])).toBe(true);

    expect(localStorage.getItem(key(id))).toBe('[{"id":"pc-1","name":"Mira"}]');
    expect(names(id)).toEqual(['Mira']);
    expect(getCampaigns().find((campaign) => campaign.id === id)?.playerCharacters).toEqual([
      { id: 'pc-1', name: 'Mira' },
    ]);
  });

  it('keeps an empty list: the DM removed every player', () => {
    savePlayers(id, []);

    expect(names(id)).toEqual([]);
  });

  it('keeps one list per campaign, and the rest of the campaign as it is', () => {
    saveImportedCampaign(['# Bellhaven', '## Scene: Docks', '### DM notes', 'Gulls.'].join('\n'));
    savePlayers('imported-bellhaven', [{ id: 'pc-1', name: 'Tok' }]);
    savePlayers(id, [{ id: 'pc-1', name: 'Mira' }]);

    expect(names('imported-bellhaven')).toEqual(['Tok']);
    expect(getCampaign(id)).toEqual({
      ...imported(),
      playerCharacters: [{ id: 'pc-1', name: 'Mira' }],
    });
    expect(imported()?.playerCharacters).toEqual([]);
  });

  it('gives the same object on every render while the list is unchanged', () => {
    savePlayers(id, [{ id: 'pc-1', name: 'Mira' }]);
    const first = getCampaign(id);

    expect(getCampaign(id)).toBe(first);
    savePlayers(id, [{ id: 'pc-1', name: 'Mirabel' }]);
    expect(getCampaign(id)).not.toBe(first);
    expect(names(id)).toEqual(['Mirabel']);
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
    localStorage.setItem(key(id), '[{"id":"pc-1","name":"Mira","hp":12}]');

    expect(getCampaign(id)?.playerCharacters).toEqual([{ id: 'pc-1', name: 'Mira' }]);
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

  it('goes back to no players when the stored list is removed', () => {
    savePlayers(id, [{ id: 'pc-1', name: 'Mira' }]);

    deletePlayers(id);

    expect(getCampaign(id)).toBe(imported());
  });

  it('reports a full or blocked storage as not saved', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('full');
    });

    expect(savePlayers(id, [])).toBe(false);
  });
});

describe('DC-114 — Eigen Player Characters: onleesbare opgeslagen data', () => {
  beforeEach(() => {
    saveImportedCampaign(hollowmere());
  });

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
  ])('falls back to no players for %s, without crashing', (_, text) => {
    localStorage.setItem(key(id), text);

    expect(getCampaign(id)).toBe(imported());
  });

  it('falls back to no players when storage is blocked', () => {
    savePlayers(id, [{ id: 'pc-1', name: 'Mira' }]);
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    expect(getCampaign(id)).toBe(imported());
  });
});
