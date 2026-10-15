// The campaigns the tests play with: the former demo campaigns, now campaign files in
// src/test/campaigns/ (D76). Screen tests import them the way the DM does, and add the DM's
// own player characters.
import type { Campaign, PlayerCharacter } from '../domain/campaign';
import { parseCampaign } from '../domain/campaignMarkdown';
import { saveImportedCampaign } from '../data/importedCampaigns';
import { savePlayers } from '../data/playerCharacters';
// Vite reads the files as text; no Node APIs needed.
import millbrookFile from './campaigns/shadows-over-millbrook.md?raw';
import sunkenBellFile from './campaigns/the-sunken-bell.md?raw';

export { millbrookFile, sunkenBellFile };

const millbrookPlayers: PlayerCharacter[] = [
  { id: 'pc-alice', name: 'Alice' },
  { id: 'pc-bob', name: 'Bob' },
  { id: 'pc-cora', name: 'Cora' },
  { id: 'pc-dain', name: 'Dain' },
];
const sunkenBellPlayers: PlayerCharacter[] = [
  { id: 'pc-esme', name: 'Esme' },
  { id: 'pc-finn', name: 'Finn' },
];

function campaignOf(text: string, playerCharacters: PlayerCharacter[]): Campaign {
  const result = parseCampaign(text);
  if ('errors' in result) throw new Error(`Test campaign: ${JSON.stringify(result.errors)}`);
  return { ...result.campaign, playerCharacters };
}

/** "Shadows over Millbrook" as the app shows it after `importTestCampaigns()`. */
export const millbrook = campaignOf(millbrookFile, millbrookPlayers);
/** "The Sunken Bell": one scene with one description, as the app shows it after import. */
export const sunkenBell = campaignOf(sunkenBellFile, sunkenBellPlayers);

/** Imports both test campaigns, each with its player characters, as the DM would. */
export function importTestCampaigns(): void {
  for (const [text, campaign] of [
    [millbrookFile, millbrook],
    [sunkenBellFile, sunkenBell],
  ] as const) {
    if (!saveImportedCampaign(text)) throw new Error(`Could not import ${campaign.name}`);
    savePlayers(campaign.id, campaign.playerCharacters);
  }
}
