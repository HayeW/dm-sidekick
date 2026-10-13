import { describe, expect, it } from 'vitest';
// Vite reads the file as text; no Node APIs needed.
import formatDoc from '../../docs/campaign-format.md?raw';
import { readCampaignStructure } from './campaignMarkdown';

/** The complete example from docs/campaign-format.md, so the document can't drift. */
const formatExample = (() => {
  const match = /```markdown\r?\n([\s\S]*?)```/.exec(formatDoc);
  if (!match?.[1]) throw new Error('No ```markdown example in docs/campaign-format.md');
  return match[1];
})();

/** Joins lines into a file, so tests can show the file line by line. */
const file = (...lines: string[]) => lines.join('\n');
const read = (...lines: string[]) => readCampaignStructure(file(...lines));
const errorsOf = (...lines: string[]) => read(...lines).errors;

/** The smallest valid file, to extend in a test. */
const minimal = ['# Test campaign', '', '## Scene: Road', '', '### DM notes', 'Quiet.'];

describe('DC-110 — Campaign importeren: de structuur van het bestand', () => {
  it('reads the complete example from the format document without errors', () => {
    const { draft, errors } = readCampaignStructure(formatExample);

    expect(errors).toEqual([]);
    expect(draft.name).toBe('Shadows over Millbrook');
    expect(draft.playerCharacters.map((pc) => pc.text)).toEqual(['Alice', 'Bob', 'Cora', 'Dain']);
    expect(draft.npcs.map((npc) => npc.name)).toEqual(['Marta Hollow', 'Old Fenn']);
    expect(draft.locations.map((location) => location.name)).toEqual([
      'The Crooked Kettle',
      'Mill cellar',
    ]);
    expect(draft.encounters.map((encounter) => encounter.name)).toEqual([
      'Ambush on the mill road',
    ]);
    expect(draft.notes.map((note) => note.name)).toEqual(['Millbrook', 'The missing miller']);
    expect(draft.scenes.map((scene) => scene.title)).toEqual([
      'Arrival in Millbrook',
      'The Mill Road',
      'The Old Mill',
    ]);
  });

  it('reads the tiles of a scene in file order', () => {
    const { draft } = readCampaignStructure(formatExample);

    expect(draft.scenes[0]!.tiles.map((tile) => tile.kind)).toEqual([
      'read-aloud',
      'read-aloud',
      'location',
      'npcs',
      'notes',
    ]);
    expect(draft.scenes[1]!.tiles).toContainEqual(
      expect.objectContaining({ kind: 'encounter', name: 'Ambush on the mill road' }),
    );
  });

  it('keeps the line number of every part, for error messages', () => {
    const { draft } = read(...minimal);

    expect(draft.line).toBe(1);
    expect(draft.scenes[0]!.line).toBe(3);
    expect(draft.scenes[0]!.tiles[0]!.line).toBe(5);
  });

  it('reads the enemies of an encounter and the names of an NPCs tile as list lines', () => {
    const { draft, errors } = read(
      '# Test campaign',
      '## Encounters',
      '### Ambush',
      '- 3 × Goblin, 7 HP',
      '- Goblin Boss, 21 HP',
      '## Scene: Road',
      '### NPCs',
      '- Marta',
      '* Fenn',
    );

    expect(errors).toEqual([]);
    expect(draft.encounters[0]!.enemies).toEqual([
      { text: '3 × Goblin, 7 HP', line: 4 },
      { text: 'Goblin Boss, 21 HP', line: 5 },
    ]);
    expect(draft.scenes[0]!.tiles[0]).toMatchObject({
      kind: 'npcs',
      names: [
        { text: 'Marta', line: 8 },
        { text: 'Fenn', line: 9 },
      ],
    });
  });

  it('allows the sections in any order, before, between or after the scenes', () => {
    const { errors } = read(
      '# Test campaign',
      '## Scene: First',
      '### DM notes',
      'One.',
      '## NPCs',
      '### Marta',
      'Innkeeper.',
      '## Scene: Second',
      '### DM notes',
      'Two.',
      '## Player characters',
      '- Alice',
    );

    expect(errors).toEqual([]);
  });
});

describe('DC-110 — Campaign importeren: tekst zoals Markdown', () => {
  const textOf = (...body: string[]) =>
    read('# Test campaign', '## Scene: Road', '### DM notes', ...body).draft.scenes[0]!
      .tiles[0] as { text: string };

  it('joins the lines of a paragraph into flowing text', () => {
    expect(textOf('The goblins attack when the', 'party reaches the cart.').text).toBe(
      'The goblins attack when the party reaches the cart.',
    );
  });

  it('keeps paragraphs apart, separated by an empty line', () => {
    expect(textOf('First.', '', '', 'Second.').text).toBe('First.\n\nSecond.');
  });

  it('keeps list lines on their own line', () => {
    expect(textOf('Clues:', '- the key', '- the boots').text).toBe(
      'Clues:\n- the key\n- the boots',
    );
  });

  it('ignores empty lines and spaces around the text', () => {
    expect(textOf('', '  Quiet.  ', '').text).toBe('Quiet.');
  });
});

describe('DC-112 — Duidelijke foutmeldingen: de structuur', () => {
  it('needs the campaign name first', () => {
    expect(errorsOf('## Scene: Road', '### DM notes', 'Quiet.')).toContainEqual({
      line: 1,
      message: 'the file must start with "# Campaign name".',
    });
  });

  it('allows only one campaign name', () => {
    expect(errorsOf(...minimal, '# Another campaign')).toContainEqual({
      line: 7,
      message: 'only one "# Campaign name" is allowed; found "# Another campaign".',
    });
  });

  it('needs at least one scene', () => {
    expect(errorsOf('# Test campaign', '## NPCs', '### Marta', 'Innkeeper.')).toContainEqual(
      expect.objectContaining({ message: 'the campaign needs at least one "## Scene: …".' }),
    );
  });

  it('reports an unknown section with the sections it expected (D44)', () => {
    expect(errorsOf(...minimal, '## Monsters')).toContainEqual({
      line: 7,
      message:
        'unknown section "## Monsters". Expected Player characters, NPCs, Locations, Encounters, Notes or Scene: ….',
    });
  });

  it('reports an unknown tile in a scene (D44)', () => {
    expect(errorsOf(...minimal, '### Treasure')).toContainEqual({
      line: 7,
      message:
        'unknown tile "### Treasure". Expected Read-aloud: …, Location: …, NPCs, Encounter: …, DM notes.',
    });
  });

  it('reports a section that appears twice', () => {
    expect(
      errorsOf(...minimal, '## NPCs', '### Marta', 'Innkeeper.', '## NPCs', '### Fenn', 'Old.'),
    ).toContainEqual({ line: 10, message: '"## NPCs" appears twice (first on line 7).' });
  });

  it('reports text outside a section or heading', () => {
    expect(errorsOf('# Test campaign', 'Some intro.', ...minimal.slice(2))).toContainEqual({
      line: 2,
      message: 'text must be in a section: "Some intro.".',
    });
    expect(errorsOf(...minimal, '## NPCs', 'Loose text.')).toContainEqual({
      line: 8,
      message: 'text must be below a "###" heading: "Loose text.".',
    });
  });

  it('reports missing text, titles and names', () => {
    const errors = errorsOf(
      '# Test campaign',
      '## NPCs',
      '### Marta',
      '## Scene: Road',
      '### Read-aloud:',
      '### Location:',
      '### DM notes',
    );

    expect(errors).toEqual([
      { line: 3, message: '"Marta" has no text below it.' },
      { line: 5, message: '"### Read-aloud:" needs a title after the colon.' },
      { line: 5, message: '"### Read-aloud:" has no text below it.' },
      { line: 6, message: '"### Location:" needs a name after the colon.' },
      { line: 7, message: '"### DM notes" has no text below it.' },
    ]);
  });

  it('reports text below a Location or Encounter tile, which take none', () => {
    expect(errorsOf(...minimal, '### Location: Inn', 'Smoky.')).toContainEqual({
      line: 8,
      message: '"### Location: Inn" takes no text; put it in the location itself.',
    });
  });

  it('reports lines that should be list lines', () => {
    const errors = errorsOf(
      '# Test campaign',
      '## Player characters',
      'Alice',
      '## Encounters',
      '### Ambush',
      '3 Goblins',
      ...minimal.slice(2),
      '### NPCs',
      'Marta',
    );

    expect(errors).toEqual(
      [
        { line: 3, message: '"Alice" — expected a player character like "- Alice".' },
        { line: 6, message: '"3 Goblins" — expected a list line with an enemy, like "- …".' },
        { line: 5, message: '"### Ambush" needs a list of enemies below it.' },
        { line: 12, message: '"Marta" — expected a list line with an NPC name, like "- …".' },
        { line: 11, message: '"### NPCs" needs a list of NPC names below it.' },
      ].sort((a, b) => a.line - b.line),
    );
  });

  it('reports headings deeper than ###', () => {
    expect(errorsOf(...minimal, '#### Detail')).toContainEqual({
      line: 7,
      message: '"#### Detail": headings deeper than "###" are not used.',
    });
  });

  it('reports every error at once, in line order (DC-112)', () => {
    const errors = errorsOf('# Test campaign', '## Monsters', '## Scene: Road', '### Treasure');

    expect(errors.map((e) => e.line)).toEqual([2, 4]);
  });

  it('counts lines the same with Windows line endings', () => {
    const { errors } = readCampaignStructure('# Test\r\n## Monsters\r\n');

    expect(errors.find((e) => e.message.startsWith('unknown section'))?.line).toBe(2);
  });
});

describe('DC-112 — Duidelijke foutmeldingen: zoals editors bestanden opslaan', () => {
  it('accepts list lines indented with spaces or a tab', () => {
    const { draft, errors } = read(
      '# Test campaign',
      '## Player characters',
      '  - Alice',
      '## Encounters',
      '### Ambush',
      '\t- 3 × Goblin, 7 HP',
      ...minimal.slice(2),
      '### NPCs',
      '   - Marta',
    );

    expect(errors).toEqual([]);
    expect(draft.playerCharacters[0]!.text).toBe('Alice');
    expect(draft.encounters[0]!.enemies[0]!.text).toBe('3 × Goblin, 7 HP');
  });

  it('treats a lone "#" as a heading without a name, not as text', () => {
    expect(errorsOf('#', ...minimal.slice(2))).toEqual([
      { line: 1, message: 'the campaign needs a name after "#".' },
    ]);
    expect(errorsOf(...minimal, '###')).toContainEqual(
      expect.objectContaining({ line: 7, message: expect.stringContaining('unknown tile') }),
    );
    expect(errorsOf(...minimal, '## NPCs', '###', 'Innkeeper.')).toContainEqual({
      line: 8,
      message: '"###" needs a name.',
    });
  });

  it('drops closing hashes, as in Markdown: "## NPCs ##"', () => {
    const { draft, errors } = read(...minimal, '## NPCs ##', '### Marta ###', 'Innkeeper.');

    expect(errors).toEqual([]);
    expect(draft.npcs[0]!.name).toBe('Marta');
  });

  it('keeps "#1 suspect" as text: a heading needs a space after the hashes', () => {
    const { draft, errors } = read(...minimal, '#1 suspect: the miller.');

    expect(errors).toEqual([]);
    expect((draft.scenes[0]!.tiles[0] as { text: string }).text).toBe(
      'Quiet. #1 suspect: the miller.',
    );
  });

  it('keeps the text after the last heading of the file', () => {
    const { draft } = read(...minimal);

    expect((draft.scenes[0]!.tiles[0] as { text: string }).text).toBe('Quiet.');
  });

  it('ignores a byte order mark at the start of the file', () => {
    expect(readCampaignStructure(String.fromCharCode(0xfeff) + file(...minimal)).errors).toEqual(
      [],
    );
  });

  it('reports one error for an unknown section, not one per line below it', () => {
    expect(
      errorsOf(...minimal, '## NPC', '### Marta', 'Innkeeper.', '### Fenn', 'Old ferryman.'),
    ).toEqual([
      {
        line: 7,
        message:
          'unknown section "## NPC". Expected Player characters, NPCs, Locations, Encounters, Notes or Scene: ….',
      },
    ]);
  });

  it('needs the campaign name before any other heading', () => {
    expect(errorsOf('## Monsters', '# Test campaign', ...minimal.slice(2))).toContainEqual({
      line: 2,
      message: '"# Campaign name" must come first in the file.',
    });
  });

  it('reports a scene without a title and player characters written as headings', () => {
    const errors = errorsOf(
      '# Test campaign',
      '## Player characters',
      '### Alice',
      '## Scene:',
      '### DM notes',
      'Quiet.',
    );

    expect(errors).toEqual([
      { line: 3, message: '"### Alice": player characters are a list ("- Alice"), not headings.' },
      { line: 4, message: '"## Scene:" needs a title after the colon.' },
    ]);
  });

  it('reports text below an Encounter tile, which takes none', () => {
    expect(errorsOf(...minimal, '### Encounter: Ambush', 'They attack.')).toContainEqual({
      line: 8,
      message: '"### Encounter: Ambush" takes no text; put it in the encounter itself.',
    });
  });

  it('reads the example’s texts as flowing text with their titles', () => {
    const { draft } = readCampaignStructure(formatExample);

    expect(draft.npcs[0]!.text).toBe(
      'Innkeeper of the Crooked Kettle. Warm to regulars, wary of strangers; keeps a cudgel under the bar.',
    );
    expect(draft.scenes[0]!.tiles[0]).toMatchObject({ kind: 'read-aloud', title: 'Intro' });
  });
});
