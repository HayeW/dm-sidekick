import type { Campaign } from '../domain/campaign';
import { seedCampaigns } from './seed';

// Single access point for campaign data. The UI never imports the seed directly,
// so the source can change later (e.g. localStorage) without touching screens.

export function getCampaigns(): Campaign[] {
  return seedCampaigns;
}

export function getCampaign(id: string): Campaign | undefined {
  return seedCampaigns.find((campaign) => campaign.id === id);
}
