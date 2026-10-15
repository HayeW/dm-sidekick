// Imported campaigns in localStorage (DC-110, DC-113), see docs/implementation-plan-slice-5.md.
// What is stored is the Markdown text, read again at every start (D46): the parser stays the
// only place that knows the format. One entry per campaign, keyed by its id (D54).

import type { Campaign } from '../domain/campaign';
import { parseCampaign, type ParseResult } from '../domain/campaignMarkdown';
import { seedCampaigns } from './seed';
import { forgetSession } from './combats';

// The version is part of the key, as for sessions: a new schema gets a new key.
const PREFIX = 'dm-cockpit:v1:campaign:';
/** Every imported campaign's id starts with this (D47), so it can't hide a demo campaign. */
const IMPORTED_ID_PREFIX = 'imported-';
const keyFor = (campaignId: string) => `${PREFIX}${campaignId}`;

/** Reads a campaign file; a demo campaign's name is an error (D45). */
export function readCampaignFile(text: string): ParseResult {
  return parseCampaign(
    text,
    seedCampaigns.map((campaign) => campaign.name),
  );
}

/**
 * Parsed campaigns by their text, so the same text is parsed once and gives the same object
 * on every render (screens may use the campaign as an effect dependency).
 */
const parsed = new Map<string, Campaign | undefined>();

/** The campaign in a stored text, or undefined when the text no longer reads as one. */
function campaignFrom(text: string): Campaign | undefined {
  if (!parsed.has(text)) {
    const result = readCampaignFile(text);
    parsed.set(text, 'campaign' in result ? result.campaign : undefined);
  }
  return parsed.get(text);
}

/**
 * Stores a campaign file under its campaign's id, replacing an earlier import with that id
 * (DC-111). Returns the campaign, or undefined when the file has errors or storage is full
 * or blocked.
 */
export function saveImportedCampaign(text: string): Campaign | undefined {
  const campaign = campaignFrom(text);
  if (!campaign) return undefined;
  try {
    localStorage.setItem(keyFor(campaign.id), text);
    return campaign;
  } catch {
    return undefined;
  }
}

/**
 * The imported campaign with this id, or undefined. A stored text that no longer reads as a
 * campaign (for example after a format change), or reads as another id, is skipped.
 */
export function loadImportedCampaign(id: string): Campaign | undefined {
  try {
    const text = localStorage.getItem(keyFor(id));
    if (text === null) return undefined;
    const campaign = campaignFrom(text);
    return campaign?.id === id ? campaign : undefined;
  } catch {
    // Storage blocked (e.g. some private modes): no imported campaigns.
    return undefined;
  }
}

/** All imported campaigns, by name (D48). Unreadable entries are skipped. */
export function loadImportedCampaigns(): Campaign[] {
  const ids: string[] = [];
  try {
    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index);
      if (key?.startsWith(PREFIX)) ids.push(key.slice(PREFIX.length));
    }
  } catch {
    return [];
  }
  return ids
    .map(loadImportedCampaign)
    .filter((campaign) => campaign !== undefined)
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
}

/**
 * Removes an imported campaign and its session: current scene and active combat (DC-113).
 * A demo campaign can't be deleted; its session stays too.
 */
export function deleteImportedCampaign(id: string): void {
  if (!id.startsWith(IMPORTED_ID_PREFIX)) return;
  try {
    localStorage.removeItem(keyFor(id));
  } catch {
    // Storage blocked: there is nothing stored to remove.
  }
  forgetSession(id);
}

/** Forgets the parsed campaigns, so the next read parses the stored text again. For tests. */
export function clearImportedCampaignCache(): void {
  parsed.clear();
}
