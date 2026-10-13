// Campaign data: the long-lived content a DM prepares before a session.
// Only the fields the slices need so far (docs/implementation-plan-slice-1.md, §4, and
// docs/implementation-plan-slice-2.md, §4).

export type Campaign = {
  id: string;
  name: string;
  /** Array order is the scene order. */
  scenes: Scene[];
  playerCharacters: PlayerCharacter[];
  encounters: Encounter[];
  /** NPCs of the campaign; scenes refer to them by id, so one NPC can be in many (DC-033). */
  npcs: Npc[];
  locations: CampaignLocation[];
  /** Campaign notes, not tied to a scene; a scene's own notes are a Notes tile (D28). */
  notes: Note[];
};

export type Scene = {
  id: string;
  title: string;
  /** Array order is the tile order. */
  blocks: ContentBlock[];
};

/** Read-aloud texts for a scene, e.g. "Intro" and "Arriving at the end" (decision D11). */
export type DescriptionsBlock = {
  id: string;
  type: 'descriptions';
  /** Array order is the reading order. */
  descriptions: Description[];
};

export type Description = {
  id: string;
  title: string;
  text: string;
};

export type ContentBlock =
  | DescriptionsBlock
  | { id: string; type: 'encounter'; encounterId: string }
  | { id: string; type: 'location'; locationId: string }
  | { id: string; type: 'npcs'; npcIds: string[] }
  /** The scene's own DM notes (D28). */
  | { id: string; type: 'notes'; text: string };

/** Only a name and free text for now (decision D26). */
export type Npc = {
  id: string;
  name: string;
  description: string;
};

/**
 * Only a name and free text for now (decision D26). Not called `Location`: that name is
 * taken by the browser's and React Router's location types.
 */
export type CampaignLocation = {
  id: string;
  name: string;
  description: string;
};

export type Note = {
  id: string;
  title: string;
  text: string;
};

/** Player characters have no HP: players track their own (decision D3). */
export type PlayerCharacter = {
  id: string;
  name: string;
};

export type Encounter = {
  id: string;
  name: string;
  enemies: EnemyGroup[];
};

/** A group of identical enemies, e.g. 3 × Goblin. */
export type EnemyGroup = {
  name: string;
  count: number;
  hp: number;
};
