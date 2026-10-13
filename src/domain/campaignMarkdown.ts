// Reading a campaign from a Markdown file (Epic 12, DC-110, DC-112). The format is described
// in docs/campaign-format.md; this module is the only place that knows it (decision D46).
// Pure: no browser APIs. Every error carries the line number it is about.

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
  playerCharacters: ListLine[];
  npcs: TextItem[];
  locations: TextItem[];
  encounters: EncounterDraft[];
  notes: TextItem[];
  scenes: SceneDraft[];
}>;

type Section = 'Player characters' | 'NPCs' | 'Locations' | 'Encounters' | 'Notes';
const SECTIONS: Section[] = ['Player characters', 'NPCs', 'Locations', 'Encounters', 'Notes'];
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
  // A byte order mark at the start would hide the first heading.
  const lines = (text.startsWith(BOM) ? text.slice(1) : text).split(/\r?\n/);
  const errors: ImportError[] = [];
  const error = (line: number, message: string) => errors.push({ line, message });

  const draft: CampaignDraft = {
    name: '',
    line: 1,
    playerCharacters: [],
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
      else if (section === 'Player characters') {
        const match = LIST.exec(raw.trim());
        if (match?.[1]) draft.playerCharacters.push({ text: match[1], line });
        else if (raw.trim() !== '') {
          error(line, `"${raw.trim()}" — expected a player character like "- Alice".`);
        }
      } else if (raw.trim() !== '') {
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
      } else {
        section = 'unknown';
        error(line, `unknown section "## ${title}". Expected ${SECTIONS.join(', ')} or Scene: ….`);
      }
    } else if (level === 3) {
      if (section === 'unknown') return;
      if (section === 'Player characters') {
        error(line, `"### ${title}": player characters are a list ("- Alice"), not headings.`);
      } else if (section) block = { heading: title, line, body: [] };
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
