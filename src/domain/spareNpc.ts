// Spare NPCs (DC-090, docs/implementation-plan-slice-3.md): a fixed selection of ready-made
// NPCs for when the story suddenly needs one. The same in every campaign, so not part of
// Campaign; nothing is generated or random.

export type SpareNpc = {
  id: string;
  name: string;
  /** Free text, e.g. "Half-elf" (decision D32). */
  race: string;
  /** One or two sentences (DC-090: very short). */
  description: string;
};
