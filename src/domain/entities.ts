// Campaign-level NPCs, locations and notes (docs/implementation-plan-slice-2.md, §4, D25).
// Scene tiles refer to NPCs and locations by id; an id that refers to nothing (bad data)
// is skipped or reported as missing rather than crashing.

import type { Campaign, CampaignLocation, Note, Npc } from './campaign';

export function findNpc(campaign: Campaign, npcId: string): Npc | undefined {
  return campaign.npcs.find((npc) => npc.id === npcId);
}

/** The NPCs with these ids, in the given order. Unknown ids are left out. */
export function findNpcs(campaign: Campaign, npcIds: string[]): Npc[] {
  return npcIds.flatMap((id) => findNpc(campaign, id) ?? []);
}

export function findLocation(campaign: Campaign, locationId: string): CampaignLocation | undefined {
  return campaign.locations.find((location) => location.id === locationId);
}

export function findNote(campaign: Campaign, noteId: string): Note | undefined {
  return campaign.notes.find((note) => note.id === noteId);
}
