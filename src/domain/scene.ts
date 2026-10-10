import type { Campaign, ContentBlock, Encounter, Scene } from './campaign';

/**
 * The scene to show when a campaign is opened (DC-002).
 * For now this is the first scene; DC-003 adds "last used scene".
 * Returns undefined for a campaign without scenes.
 */
export function openingScene(campaign: Campaign): Scene | undefined {
  return campaign.scenes[0];
}

export function findScene(campaign: Campaign, sceneId: string): Scene | undefined {
  return campaign.scenes.find((scene) => scene.id === sceneId);
}

export function findEncounter(campaign: Campaign, encounterId: string): Encounter | undefined {
  return campaign.encounters.find((encounter) => encounter.id === encounterId);
}

/** Compact enemy list for an encounter tile, e.g. "3 × Goblin, 1 × Goblin Boss". */
export function enemySummary(encounter: Encounter): string {
  return encounter.enemies.map((group) => `${group.count} × ${group.name}`).join(', ');
}

export function findBlock(scene: Scene, blockId: string): ContentBlock | undefined {
  return scene.blocks.find((block) => block.id === blockId);
}

/** Tiles that open a detail screen. Only Intro in this slice (DC-011); others are P1. */
export function canOpenTile(block: ContentBlock): boolean {
  return block.type === 'intro';
}
