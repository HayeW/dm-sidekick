// Reading a campaign from a Markdown file (Epic 12, DC-110, DC-112). The format is described
// in docs/campaign-format.md; this module is the only place that knows it (decision D46).
// Pure: no browser APIs. Every error carries the line number it is about.

import type { Campaign, ContentBlock, EnemyGroup } from './campaign';

/** A problem in the file, reported with its line number (DC-112). Lines count from 1. */
export type ImportError = { line: number; message: string };

/** A piece of the file with the line it starts on, so later checks can point at it. */
type At<T> = T & { line: number };

/** A heading with the text below it: an NPC, location, campaign note or read-aloud text. */
export type TextItem = At<{ name: string; text: string }>;

/** A list line (`- …`) with its line number. */
export type ListLine = At<{ text: string }>;

export type EncounterDraft = At<{ name: string; enemies: ListLine[] }>;

/** One tile of a scene, in file order (docs/campaign-format.md, "Tiles in a scene"). */
export type TileDraft =
  | At<{ kind: 'read-aloud'; title: string; text: string }>
  | At<{ kind: 'location'; name: string }>
  | At<{ kind: 'npcs'; names: ListLine[] }>
  | At<{ kind: 'encounter'; name: string }>
  | At<{ kind: 'notes'; text: string }>;

export type SceneDraft = At<{ title: string; tiles: TileDraft[] }>;

/** The file's structure, before names are resolved and ids are made (step 2). */
export type CampaignDraft = At<{
  name: string;
  npcs: TextItem[];
  locations: TextItem[];
  encounters: EncounterDraft[];
  notes: TextItem[];
  scenes: SceneDraft[];
}>;

type Section = 'NPCs' | 'Locations' | 'Encounters' | 'Notes';
const SECTIONS: Section[] = ['NPCs', 'Locations', 'Encounters', 'Notes'];
/** Each DM adds their own player characters in the app (DC-114), so a file can be shared. */
const PLAYER_CHARACTERS = 'Player characters';
const SCENE_PREFIX = 'Scene:';
const TILE_KINDS = ['Read-aloud: …', 'Location: …', 'NPCs', 'Encounter: …', 'DM notes'];

/**
 * A `#`, `##` or `###` … heading: its level and text, without the hashes. A lone `###` is a
 * heading too (editors strip trailing spaces), and closing hashes (`## NPCs ##`) are dropped,
 * as in Markdown. `#1 suspect` is text: a heading needs a space after the hashes.
 */
const HEADING = /^(#{1,6})(?:[ \t]+(.*?))?(?:[ \t]+#+)?[ \t]*$/;
/** A byte order mark, which some editors put at the start of a file. */
const BOM = String.fromCharCode(0xfeff);
/** A list line: `- text` or `* text`. */
const LIST = /^[-*]\s+(.*?)\s*$/;

/**
 * Reads the structure of a campaign file: name, sections, scenes with their tiles, texts.
 * Collects every structural error instead of stopping at the first (DC-112).
 */
export function readCampaignStructure(text: string): {
  draft: CampaignDraft;
  errors: ImportError[];
} {
  // A byte order mark at the start would hide the first heading. NFC, so a name typed with a
  // combining accent matches the same name typed with a precomposed one.
  const lines = (text.startsWith(BOM) ? text.slice(1) : text).normalize('NFC').split(/\r?\n/);
  const errors: ImportError[] = [];
  const error = (line: number, message: string) => errors.push({ line, message });

  const draft: CampaignDraft = {
    name: '',
    line: 1,
    npcs: [],
    locations: [],
    encounters: [],
    notes: [],
    scenes: [],
  };

  // Where we are: the current ## section (or scene) and the current ### heading in it. Below
  // an unknown section its content is skipped, so one typo gives one error, not one per line.
  let section: Section | 'scene' | 'unknown' | undefined;
  let scene: SceneDraft | undefined;
  /** The open ### block and the lines below it, closed at the next heading. */
  let block: { heading: string; line: number; body: At<{ text: string }>[] } | undefined;
  const seenSections = new Map<Section, number>();

  /** Turns the open ### block into an item, a tile or an encounter. */
  const closeBlock = () => {
    if (!block) return;
    const { heading, line, body } = block;
    block = undefined;
    if (section === 'scene') closeTile(heading, line, body);
    else if (heading === '') error(line, '"###" needs a name.');
    else if (section === 'Encounters') {
      const enemies = listLines(body, 'an enemy');
      if (enemies.length === 0) error(line, `"### ${heading}" needs a list of enemies below it.`);
      draft.encounters.push({ name: heading, line, enemies });
    } else if (section === 'NPCs' || section === 'Locations' || section === 'Notes') {
      const item = { name: heading, line, text: joinText(body) };
      if (item.text === '') error(line, `"${heading}" has no text below it.`);
      const list = { NPCs: draft.npcs, Locations: draft.locations, Notes: draft.notes }[section];
      list.push(item);
    }
  };

  const closeTile = (heading: string, line: number, body: At<{ text: string }>[]) => {
    if (!scene) return;
    const [kind, ...rest] = heading.split(':');
    const label = (kind ?? '').trim();
    const value = rest.join(':').trim();
    const hasColon = rest.length > 0;

    if (label === 'Read-aloud' && hasColon) {
      const text = joinText(body);
      if (value === '') error(line, `"### ${heading}" needs a title after the colon.`);
      if (text === '') error(line, `"### ${heading}" has no text below it.`);
      scene.tiles.push({ kind: 'read-aloud', title: value, text, line });
    } else if ((label === 'Location' || label === 'Encounter') && hasColon) {
      if (value === '') error(line, `"### ${heading}" needs a name after the colon.`);
      for (const extra of body.filter((entry) => entry.text.trim() !== '')) {
        error(
          extra.line,
          `"### ${heading}" takes no text; put it in the ${label.toLowerCase()} itself.`,
        );
      }
      scene.tiles.push(
        label === 'Location'
          ? { kind: 'location', name: value, line }
          : { kind: 'encounter', name: value, line },
      );
    } else if (heading === 'NPCs') {
      const names = listLines(body, 'an NPC name');
      if (names.length === 0) error(line, '"### NPCs" needs a list of NPC names below it.');
      scene.tiles.push({ kind: 'npcs', names, line });
    } else if (heading === 'DM notes') {
      const text = joinText(body);
      if (text === '') error(line, '"### DM notes" has no text below it.');
      scene.tiles.push({ kind: 'notes', text, line });
    } else {
      error(line, `unknown tile "### ${heading}". Expected ${TILE_KINDS.join(', ')}.`);
    }
  };

  /** The list lines of a block; any other text is an error. */
  const listLines = (body: At<{ text: string }>[], what: string): ListLine[] => {
    const result: ListLine[] = [];
    for (const entry of body) {
      const match = LIST.exec(entry.text.trim());
      if (match?.[1]) result.push({ text: match[1], line: entry.line });
      else if (entry.text.trim() !== '') {
        error(
          entry.line,
          `"${entry.text.trim()}" — expected a list line with ${what}, like "- …".`,
        );
      }
    }
    return result;
  };

  let sawTitle = false;
  let sawHeading = false;
  lines.forEach((raw, index) => {
    const line = index + 1;
    const heading = HEADING.exec(raw);

    if (!heading) {
      if (section === 'unknown') return;
      if (block) block.body.push({ text: raw, line });
      else if (raw.trim() !== '') {
        const where = section ? 'below a "###" heading' : 'in a section';
        error(line, `text must be ${where}: "${raw.trim()}".`);
      }
      return;
    }

    const level = heading[1]!.length;
    const title = heading[2] ?? '';
    closeBlock();

    if (level === 1) {
      if (sawTitle) error(line, `only one "# Campaign name" is allowed; found "# ${title}".`);
      else if (sawHeading) error(line, '"# Campaign name" must come first in the file.');
      else {
        sawTitle = true;
        draft.name = title;
        draft.line = line;
        if (title === '') error(line, 'the campaign needs a name after "#".');
      }
    } else if (level === 2) {
      scene = undefined;
      if (title.startsWith(SCENE_PREFIX)) {
        section = 'scene';
        scene = { title: title.slice(SCENE_PREFIX.length).trim(), line, tiles: [] };
        if (scene.title === '') error(line, '"## Scene:" needs a title after the colon.');
        draft.scenes.push(scene);
      } else if ((SECTIONS as string[]).includes(title)) {
        section = title as Section;
        const first = seenSections.get(section);
        if (first !== undefined) {
          error(line, `"## ${title}" appears twice (first on line ${first}).`);
        } else seenSections.set(section, line);
      } else if (sameName(title, PLAYER_CHARACTERS)) {
        // Its list is skipped like an unknown section's, so it gives this one error (D62).
        section = 'unknown';
        error(
          line,
          `"## ${title}" can't be in a campaign file: each DM adds their own player characters in the app.`,
        );
      } else {
        section = 'unknown';
        error(line, `unknown section "## ${title}". Expected ${SECTIONS.join(', ')} or Scene: ….`);
      }
    } else if (level === 3) {
      if (section === 'unknown') return;
      if (section) block = { heading: title, line, body: [] };
      else error(line, `"### ${title}" must be inside a section.`);
    } else {
      error(line, `"${'#'.repeat(level)} ${title}": headings deeper than "###" are not used.`);
    }
    sawHeading = true;
  });
  closeBlock();

  if (!sawTitle) error(1, 'the file must start with "# Campaign name".');
  if (draft.scenes.length === 0) error(1, 'the campaign needs at least one "## Scene: …".');
  errors.sort((a, b) => a.line - b.line);
  return { draft, errors };
}

/**
 * The text of a block, as Markdown shows it: the lines of a paragraph joined with spaces,
 * paragraphs separated by an empty line, list lines on their own line.
 */
function joinText(body: At<{ text: string }>[]): string {
  const paragraphs: string[][] = [];
  let current: string[] = [];
  for (const { text } of body) {
    const trimmed = text.trim();
    if (trimmed === '') {
      if (current.length > 0) paragraphs.push(current);
      current = [];
    } else current.push(trimmed);
  }
  if (current.length > 0) paragraphs.push(current);

  return paragraphs
    .map((lines) =>
      lines.reduce((joined, next) => {
        if (joined === '') return next;
        // A list line starts its own line; other lines continue the paragraph.
        return LIST.test(next) ? `${joined}\n${next}` : `${joined} ${next}`;
      }, ''),
    )
    .join('\n\n');
}

/** The result of reading a campaign file: the campaign, or every error in it (DC-112). */
export type ParseResult = { campaign: Campaign } | { errors: ImportError[] };

/**
 * Reads a campaign file into a campaign (DC-110): the structure, then the content — enemies,
 * references by name, unique names — and the ids (D47). Collects every error (DC-112).
 * `demoNames` are the names an imported campaign may not take (D45); the caller passes
 * them, so this module stays free of the seed data.
 */
export function parseCampaign(text: string, demoNames: string[] = []): ParseResult {
  const { draft, errors } = readCampaignStructure(text);
  const error = (line: number, message: string) => errors.push({ line, message });

  if (demoNames.some((name) => sameName(name, draft.name))) {
    error(draft.line, `"${draft.name}" is the name of a demo campaign.`);
  }

  // Every item gets an id from its name; a name that appears twice is an error.
  const npcs = withIds(draft.npcs, 'npc', 'NPCs', error);
  const locations = withIds(draft.locations, 'loc', 'Locations', error);
  const encounters = withIds(draft.encounters, 'enc', 'Encounters', error);
  const notes = withIds(draft.notes, 'note', 'Notes', error);
  const scenes = withIds(
    draft.scenes.map((scene) => ({ ...scene, name: scene.title })),
    'scene',
    'scenes',
    error,
  );

  /** The id of the item with this name, case-insensitive; reports a missing one. */
  const find = (items: Named[], name: string, line: number, quoted: string, what: string) => {
    const item = items.find((candidate) => sameName(candidate.name, name));
    // An empty name is already reported by the structure.
    if (!item && name !== '') error(line, `"${quoted}" — there is no ${what} with that name.`);
    return item?.id ?? '';
  };

  const campaign: Campaign = {
    id: `imported-${slug(draft.name)}`,
    name: draft.name,
    // Not in the file: each DM keeps their own list on the device (DC-114).
    playerCharacters: [],
    npcs: npcs.map(({ id, name, text }) => ({ id, name, description: text })),
    locations: locations.map(({ id, name, text }) => ({ id, name, description: text })),
    notes: notes.map(({ id, name, text }) => ({ id, title: name, text })),
    encounters: encounters.map(({ id, name, enemies }) => ({
      id,
      name,
      enemies: enemies.flatMap((enemy) => {
        const group = parseEnemy(enemy.text);
        if (!group) {
          error(enemy.line, `"- ${enemy.text}" — expected an enemy like "- 3 × Goblin, 7 HP".`);
          return [];
        }
        // A stray extra digit would otherwise fill the combat with thousands of enemies.
        if (group.count > MAX_ENEMY_COUNT) {
          error(enemy.line, `"- ${enemy.text}" — at most ${MAX_ENEMY_COUNT} enemies in one line.`);
          return [];
        }
        return [group];
      }),
    })),
    scenes: scenes.map((scene) => {
      const blocks: ContentBlock[] = [];
      /** The tile's id: its position in the scene, so a re-import keeps it (D47). */
      const nextId = () => `${scene.id}-tile-${blocks.length + 1}`;
      for (const tile of scene.tiles) {
        if (tile.kind === 'read-aloud') {
          // Read-aloud texts in a row form one Descriptions tile (D11).
          const last = blocks.at(-1);
          const descriptions = last?.type === 'descriptions' ? last : undefined;
          const block = descriptions ?? { id: nextId(), type: 'descriptions', descriptions: [] };
          block.descriptions.push({
            id: `${block.id}-${block.descriptions.length + 1}`,
            title: tile.title,
            text: tile.text,
          });
          if (!descriptions) blocks.push(block);
        } else if (tile.kind === 'location') {
          const quoted = `### Location: ${tile.name}`;
          const locationId = find(locations, tile.name, tile.line, quoted, 'location');
          blocks.push({ id: nextId(), type: 'location', locationId });
        } else if (tile.kind === 'encounter') {
          const quoted = `### Encounter: ${tile.name}`;
          const encounterId = find(encounters, tile.name, tile.line, quoted, 'encounter');
          blocks.push({ id: nextId(), type: 'encounter', encounterId });
        } else if (tile.kind === 'npcs') {
          const npcIds: string[] = [];
          for (const entry of tile.names) {
            const id = find(npcs, entry.text, entry.line, `- ${entry.text}`, 'NPC');
            if (npcIds.includes(id)) {
              error(entry.line, `"- ${entry.text}" is already in this list.`);
            } else if (id !== '') npcIds.push(id);
          }
          blocks.push({ id: nextId(), type: 'npcs', npcIds });
        } else {
          blocks.push({ id: nextId(), type: 'notes', text: tile.text });
        }
      }
      return { id: scene.id, title: scene.title, blocks };
    }),
  };

  if (errors.length > 0) return { errors: errors.sort((a, b) => a.line - b.line) };
  return { campaign };
}

type Named = { id: string; name: string };

/**
 * Gives every item an id from its name (D47), `<prefix>-<name as slug>`, and reports a name
 * that appears twice in the same section. Two names that differ only in punctuation (and so
 * give the same slug) get `-2`, `-3`, … in file order, so ids stay unique.
 */
function withIds<T extends At<{ name: string }>>(
  items: T[],
  prefix: string,
  section: string,
  error: (line: number, message: string) => void,
): (T & Named)[] {
  const used = new Set<string>();
  const result: (T & Named)[] = [];
  for (const item of items) {
    const first = result.find((earlier) => sameName(earlier.name, item.name));
    // An empty name is already reported by the structure.
    if (first && item.name !== '') {
      error(item.line, `"${item.name}" appears twice in ${section} (first on line ${first.line}).`);
    }
    const base = `${prefix}-${slug(item.name)}`;
    let id = base;
    for (let n = 2; used.has(id); n++) id = `${base}-${n}`;
    used.add(id);
    result.push({ ...item, id });
  }
  return result;
}

/** Names are compared without regard to upper and lower case, or spaces around them. */
function sameName(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/** A name as an id part: lower case, letters and digits, dashes between words. */
function slug(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-+|-+$/g, '') || 'unnamed'
  );
}

/** `- 3 × Goblin, 7 HP`, `- 3 x Goblin, 7 HP` or `- Goblin Boss, 21 HP`, without the dash. */
const ENEMY = /^(?:(\d+)\s*(?:×\s*|x\s+))?(.+?)\s*,\s*(\d+)\s*HP$/i;
/** The most enemies one line may have; more is almost certainly a typo. */
const MAX_ENEMY_COUNT = 99;
/** A name that starts with a count: "3 Goblins" or "3xGoblin", a forgotten "×" or space. */
const COUNT_IN_NAME = /^\d+(?:[\s×x]|$)/i;

/** One group of enemies, or undefined when the line doesn't read as one. */
function parseEnemy(text: string): EnemyGroup | undefined {
  const match = ENEMY.exec(text);
  if (!match?.[2] || COUNT_IN_NAME.test(match[2])) return undefined;
  const count = match[1] === undefined ? 1 : Number(match[1]);
  const hp = Number(match[3]);
  if (count < 1 || hp < 1) return undefined;
  return { name: match[2], count, hp };
}
