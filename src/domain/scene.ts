import type {
  Campaign,
  ContentBlock,
  Description,
  DescriptionsBlock,
  Encounter,
  Scene,
} from './campaign';

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

/**
 * Tiles that open a detail screen. Only Descriptions in this slice (DC-011), and only
 * when there is something to read; Location/NPCs/Notes are P1.
 */
export function canOpenTile(block: ContentBlock): boolean {
  return block.type === 'descriptions' && block.descriptions.length > 0;
}

/** The description to show: the given one, or the first when no id is given (D11). */
export function findDescription(
  block: DescriptionsBlock,
  descriptionId?: string,
): Description | undefined {
  if (descriptionId === undefined) return block.descriptions[0];
  return block.descriptions.find((description) => description.id === descriptionId);
}

/** The items before and after the item with this id, in array order. */
export function neighbours<T extends { id: string }>(
  items: T[],
  id: string,
): { previous: T | undefined; next: T | undefined } {
  const index = items.findIndex((item) => item.id === id);
  if (index === -1) return { previous: undefined, next: undefined };
  return { previous: items[index - 1], next: items[index + 1] };
}
