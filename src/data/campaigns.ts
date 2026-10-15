import type { Campaign } from '../domain/campaign';
import { loadImportedCampaign, loadImportedCampaigns } from './importedCampaigns';
import { seedCampaigns } from './seed';

// Single access point for campaign data. The UI never imports the seed or the stored
// campaigns directly, so the sources can change without touching screens.

/** The demo campaigns first, then the imported ones by name (D48). */
export function getCampaigns(): Campaign[] {
  return [...seedCampaigns, ...loadImportedCampaigns()];
}

export function getCampaign(id: string): Campaign | undefined {
  return seedCampaigns.find((campaign) => campaign.id === id) ?? loadImportedCampaign(id);
}
