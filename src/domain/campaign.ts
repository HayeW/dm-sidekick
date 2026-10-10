// Campaign data: the long-lived content a DM prepares before a session.
// Only the fields needed by the first vertical slice (docs/implementation-plan-slice-1.md, §4).

export type Campaign = {
  id: string;
  name: string;
  /** Array order is the scene order. */
  scenes: Scene[];
  playerCharacters: PlayerCharacter[];
  encounters: Encounter[];
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
  | { id: string; type: 'location'; title: string; text: string }
  | { id: string; type: 'npcs'; names: string[] }
  | { id: string; type: 'notes'; text: string };

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
  initiativeBonus: number;
};
