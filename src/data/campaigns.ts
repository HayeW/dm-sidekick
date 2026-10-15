import type { Campaign } from '../domain/campaign';
import { loadImportedCampaign, loadImportedCampaigns } from './importedCampaigns';
import { playersFrom, storedPlayersText } from './playerCharacters';

// Single access point for campaign data. The UI never reads the stored campaigns directly,
// so the source can change without touching screens. The app has no campaigns of its own
// (D76): every campaign is imported.

/** The imported campaigns, by name (D48). */
export function getCampaigns(): Campaign[] {
  return loadImportedCampaigns().map(withOwnPlayers);
}

export function getCampaign(id: string): Campaign | undefined {
  const campaign = loadImportedCampaign(id);
  return campaign && withOwnPlayers(campaign);
}

/**
 * The campaigns with the DM's own player list, by the campaign they came from: the same
 * stored list gives the same object on every render, as `importedCampaigns.ts` does.
 */
const withPlayers = new WeakMap<Campaign, { text: string; campaign: Campaign }>();

/**
 * The campaign with the DM's own player characters (DC-114, D61). Without a stored list, or
 * with one that can't be read, it keeps the file's list, which is empty: the campaign itself.
 */
function withOwnPlayers(campaign: Campaign): Campaign {
  const text = storedPlayersText(campaign.id);
  if (text === null) return campaign;
  const cached = withPlayers.get(campaign);
  if (cached?.text === text) return cached.campaign;

  const players = playersFrom(text);
  const result = players ? { ...campaign, playerCharacters: players } : campaign;
  withPlayers.set(campaign, { text, campaign: result });
  return result;
}
