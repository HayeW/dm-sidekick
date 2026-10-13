import { describe, expect, it } from 'vitest';
import { findLocation, findNpcs } from '../domain/entities';
import { findEncounter } from '../domain/scene';
import { getCampaign, getCampaigns } from './campaigns';

describe('campaign data', () => {
  it('provides at least one campaign', () => {
    expect(getCampaigns().length).toBeGreaterThan(0);
  });

  it('gives every campaign a non-empty name and a unique id', () => {
    const campaigns = getCampaigns();
    for (const campaign of campaigns) {
      expect(campaign.name.trim()).not.toBe('');
    }
    const ids = campaigns.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('finds a campaign by id', () => {
    const first = getCampaigns()[0]!;
    expect(getCampaign(first.id)).toBe(first);
  });

  it('returns undefined for an unknown id', () => {
    expect(getCampaign('does-not-exist')).toBeUndefined();
  });

  // Tiles refer to encounters, locations and NPCs by id (D25): a typo in the seed would
  // silently show "not found" on a scene, so every reference must resolve.
  it('refers only to encounters, locations and NPCs that exist in the same campaign', () => {
    for (const campaign of getCampaigns()) {
      for (const block of campaign.scenes.flatMap((scene) => scene.blocks)) {
        if (block.type === 'encounter') {
          expect(findEncounter(campaign, block.encounterId), block.id).toBeDefined();
        }
        if (block.type === 'location') {
          expect(findLocation(campaign, block.locationId), block.id).toBeDefined();
        }
        if (block.type === 'npcs') {
          expect(findNpcs(campaign, block.npcIds), block.id).toHaveLength(block.npcIds.length);
        }
      }
    }
  });

  it('gives NPCs, locations and notes ids that are unique within their campaign', () => {
    for (const campaign of getCampaigns()) {
      for (const list of [campaign.npcs, campaign.locations, campaign.notes]) {
        const ids = list.map((item) => item.id);
        expect(new Set(ids).size).toBe(ids.length);
      }
    }
  });
});
