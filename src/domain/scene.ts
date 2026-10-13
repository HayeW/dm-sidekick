import type {
  Campaign,
  ContentBlock,
  Description,
  DescriptionsBlock,
  Encounter,
  Scene,
} from './campaign';
import { findLocation } from './entities';

/**
 * The scene to show when a campaign is opened (DC-002): the last used scene (DC-003) if it
 * still exists, otherwise the first scene. Undefined for a campaign without scenes.
 */
export function openingScene(campaign: Campaign, lastSceneId?: string): Scene | undefined {
  const last = lastSceneId === undefined ? undefined : findScene(campaign, lastSceneId);
  return last ?? campaign.scenes[0];
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

/** What a tap on a whole tile opens, if anything. */
export type TileTarget =
  /** The scene's own tile detail screen. */
  { kind: 'tile' } | { kind: 'location'; locationId: string };

/**
 * Where a tile opens with one tap: a Descriptions tile (DC-011) or DM Notes tile (DC-014)
 * its own detail screen, when there is something to read; a Location tile its location,
 * when it exists (DC-012). NPC tiles open per NPC instead (DC-013); encounter tiles don't open.
 */
export function tileTarget(campaign: Campaign, block: ContentBlock): TileTarget | undefined {
  if (block.type === 'descriptions' && block.descriptions.length > 0) return { kind: 'tile' };
  if (block.type === 'notes' && block.text.trim() !== '') return { kind: 'tile' };
  if (block.type === 'location' && findLocation(campaign, block.locationId)) {
    return { kind: 'location', locationId: block.locationId };
  }
  return undefined;
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
