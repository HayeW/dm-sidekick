import { describe, expect, it } from 'vitest';
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
});
