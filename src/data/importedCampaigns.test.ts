import { afterEach, describe, expect, it, vi } from 'vitest';
import { getCampaign, getCampaigns } from './campaigns';
import { getActiveCombat, setActiveCombat } from './combats';
import {
  clearImportedCampaignCache,
  deleteImportedCampaign,
  loadImportedCampaign,
  loadImportedCampaigns,
  saveImportedCampaign,
} from './importedCampaigns';
import { loadSession, saveSession } from './storage';

/** A small valid campaign file with this name. */
const fileNamed = (name: string, scene = 'Road') =>
  [`# ${name}`, '', `## Scene: ${scene}`, '', '### DM notes', 'Quiet.'].join('\n');

const keyOf = (id: string) => `dm-sidekick:v1:campaign:${id}`;

describe('DC-110 — Campaign importeren: bewaren', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('stores the file under its campaign id and reads it back after a reload', () => {
    const saved = saveImportedCampaign(fileNamed('Hollowmere'));

    expect(saved?.id).toBe('imported-hollowmere');
    // The Markdown text itself is stored (D46).
    expect(localStorage.getItem(keyOf('imported-hollowmere'))).toBe(fileNamed('Hollowmere'));
    clearImportedCampaignCache(); // reload: only the stored text is left
    expect(loadImportedCampaign('imported-hollowmere')).toEqual(saved);
  });

  it('gives the same object for the same stored text, for stable renders', () => {
    saveImportedCampaign(fileNamed('Hollowmere'));

    expect(getCampaign('imported-hollowmere')).toBe(getCampaign('imported-hollowmere'));
  });

  it('replaces an earlier import with the same id (D54)', () => {
    saveImportedCampaign(fileNamed('Hollowmere', 'Road'));
    saveImportedCampaign(fileNamed('hollowmere', 'Bridge'));

    expect(loadImportedCampaigns()).toHaveLength(1);
    expect(getCampaign('imported-hollowmere')?.scenes[0]!.title).toBe('Bridge');
  });

  it('does not store a file with errors', () => {
    expect(saveImportedCampaign('# Broken')).toBeUndefined();
    expect(loadImportedCampaigns()).toEqual([]);
  });

  it('has no campaigns of its own (D76)', () => {
    expect(getCampaigns()).toEqual([]);
  });

  it('lists the imported campaigns by name (D48)', () => {
    saveImportedCampaign(fileNamed('Zarnath'));
    saveImportedCampaign(fileNamed('amber keep'));
    saveImportedCampaign(fileNamed('Bellhaven'));

    expect(getCampaigns().map((campaign) => campaign.name)).toEqual([
      'amber keep',
      'Bellhaven',
      'Zarnath',
    ]);
  });

  it('accepts the names of the former demo campaigns (D76)', () => {
    expect(saveImportedCampaign(fileNamed('Shadows over Millbrook'))?.id).toBe(
      'imported-shadows-over-millbrook',
    );
  });

  it('reports a full or blocked storage as not saved', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('full');
    });

    expect(saveImportedCampaign(fileNamed('Hollowmere'))).toBeUndefined();
  });
});

describe('DC-110 — Campaign importeren: onleesbare opgeslagen data', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('skips a stored text that no longer reads as a campaign, without crashing', () => {
    saveImportedCampaign(fileNamed('Hollowmere'));
    localStorage.setItem(keyOf('imported-broken'), '# Broken\n## Monsters');

    expect(loadImportedCampaigns().map((campaign) => campaign.name)).toEqual(['Hollowmere']);
    expect(getCampaign('imported-broken')).toBeUndefined();
  });

  it('skips a stored text under a key that is not its id', () => {
    localStorage.setItem(keyOf('imported-other'), fileNamed('Hollowmere'));

    expect(loadImportedCampaigns()).toEqual([]);
    expect(getCampaign('imported-other')).toBeUndefined();
  });

  it('ignores other data in storage', () => {
    saveSession({ campaignId: 'imported-hollowmere', currentSceneId: 'scene-road' });

    expect(loadImportedCampaigns()).toEqual([]);
  });

  it('shows no campaigns when storage is blocked', () => {
    saveImportedCampaign(fileNamed('Hollowmere'));
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'key').mockImplementation(() => {
      throw new Error('blocked');
    });

    expect(getCampaigns()).toEqual([]);
    expect(getCampaign('imported-hollowmere')).toBeUndefined();
  });
});

describe('DC-113 — Campaign verwijderen: de data', () => {
  it('removes the campaign and its session', () => {
    saveImportedCampaign(fileNamed('Hollowmere'));
    saveImportedCampaign(fileNamed('Bellhaven'));
    saveSession({ campaignId: 'imported-hollowmere', currentSceneId: 'scene-road' });
    saveSession({ campaignId: 'imported-bellhaven', currentSceneId: 'scene-road' });

    deleteImportedCampaign('imported-hollowmere');

    expect(getCampaign('imported-hollowmere')).toBeUndefined();
    expect(loadSession('imported-hollowmere')).toBeUndefined();
    expect(getCampaign('imported-bellhaven')).toBeDefined();
    expect(loadSession('imported-bellhaven')).toBeDefined();
  });

  it('also ends its active combat, so a re-import in the same visit starts clean', () => {
    saveImportedCampaign(fileNamed('Hollowmere'));
    setActiveCombat({
      campaignId: 'imported-hollowmere',
      sceneId: 'scene-road',
      encounterId: null,
      combatants: [],
    });

    deleteImportedCampaign('imported-hollowmere');
    saveImportedCampaign(fileNamed('Hollowmere'));

    expect(getActiveCombat('imported-hollowmere')).toBeUndefined();
  });
});
