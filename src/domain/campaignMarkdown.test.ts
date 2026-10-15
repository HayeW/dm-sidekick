import { describe, expect, it } from 'vitest';
// Vite reads the file as text; no Node APIs needed.
import formatDoc from '../../docs/campaign-format.md?raw';
import { seedCampaigns } from '../data/seed';
import type { Campaign } from './campaign';
import { parseCampaign, readCampaignStructure } from './campaignMarkdown';

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

const parse = (...lines: string[]) => parseCampaign(file(...lines), ['Shadows over Millbrook']);
const campaignOf = (...lines: string[]) => {
  const result = parse(...lines);
  if ('errors' in result) throw new Error(JSON.stringify(result.errors));
  return result.campaign;
};
const parseErrors = (...lines: string[]) => {
  const result = parse(...lines);
  return 'errors' in result ? result.errors : [];
};

/**
 * A campaign without its ids: references become names. Two campaigns with the same shape
 * show the same content in the app, whatever their ids.
 */
function shape(campaign: Campaign) {
  const nameOf = (items: { id: string; name: string }[], id: string) =>
    items.find((item) => item.id === id)?.name;
  return {
    name: campaign.name,
    playerCharacters: campaign.playerCharacters.map((pc) => pc.name),
    npcs: campaign.npcs.map(({ name, description }) => ({ name, description })),
    locations: campaign.locations.map(({ name, description }) => ({ name, description })),
    encounters: campaign.encounters.map(({ name, enemies }) => ({ name, enemies })),
    notes: campaign.notes.map(({ title, text }) => ({ title, text })),
    scenes: campaign.scenes.map((scene) => ({
      title: scene.title,
      blocks: scene.blocks.map((block) => {
        switch (block.type) {
          case 'descriptions':
            return { descriptions: block.descriptions.map(({ title, text }) => ({ title, text })) };
          case 'location':
            return { location: nameOf(campaign.locations, block.locationId) };
          case 'encounter':
            return { encounter: nameOf(campaign.encounters, block.encounterId) };
          case 'npcs':
            return { npcs: block.npcIds.map((id) => nameOf(campaign.npcs, id)) };
          case 'notes':
            return { notes: block.text };
        }
      }),
    })),
  };
}

describe('DC-110 — Campaign importeren: de inhoud', () => {
  it('reads the format document’s example as the same campaign as the demo seed', () => {
    const renamed = formatExample.replace('# Shadows over Millbrook', '# Shadows over Hollowmere');
    const result = parseCampaign(renamed, ['Shadows over Millbrook']);
    if ('errors' in result) throw new Error(JSON.stringify(result.errors));

    const demo = shape(seedCampaigns[0]!);
    // The seed uses a typographic apostrophe where the file has a plain one.
    const expected = JSON.parse(JSON.stringify(demo).replaceAll('’', "'")) as typeof demo;
    expect(shape(result.campaign)).toEqual({ ...expected, name: 'Shadows over Hollowmere' });
  });

  it('reads enemies with a count, with "x" for "×", and without a count as one', () => {
    const campaign = campaignOf(
      '# Test campaign',
      '## Encounters',
      '### Ambush',
      '- 3 × Goblin, 7 HP',
      '- 2 x Wolf, 11 HP',
      '- Goblin Boss, 21 HP',
      '- 1 X Ogre , 59 hp',
      ...minimal.slice(2),
    );

    expect(campaign.encounters[0]!.enemies).toEqual([
      { name: 'Goblin', count: 3, hp: 7 },
      { name: 'Wolf', count: 2, hp: 11 },
      { name: 'Goblin Boss', count: 1, hp: 21 },
      { name: 'Ogre', count: 1, hp: 59 },
    ]);
  });

  it('finds locations, encounters and NPCs by name, whatever the case', () => {
    const campaign = campaignOf(
      '# Test campaign',
      '## NPCs',
      '### Marta Hollow',
      'Innkeeper.',
      '## Locations',
      '### The Crooked Kettle',
      'Smoky inn.',
      '## Encounters',
      '### Ambush',
      '- Goblin, 7 HP',
      '## Scene: Road',
      '### Location: the crooked kettle',
      '### Encounter: AMBUSH',
      '### NPCs',
      '- marta hollow',
    );

    expect(campaign.scenes[0]!.blocks).toEqual([
      expect.objectContaining({ type: 'location', locationId: campaign.locations[0]!.id }),
      expect.objectContaining({ type: 'encounter', encounterId: campaign.encounters[0]!.id }),
      expect.objectContaining({ type: 'npcs', npcIds: [campaign.npcs[0]!.id] }),
    ]);
  });

  it('makes one Descriptions tile of read-aloud texts in a row (D11)', () => {
    const campaign = campaignOf(
      '# Test campaign',
      '## Scene: Road',
      '### Read-aloud: Intro',
      'Rain.',
      '### Read-aloud: Arriving',
      'Mud.',
      '### DM notes',
      'Quiet.',
      '### Read-aloud: Leaving',
      'Sun.',
    );

    const blocks = campaign.scenes[0]!.blocks;
    expect(blocks.map((block) => block.type)).toEqual(['descriptions', 'notes', 'descriptions']);
    expect(blocks[0]).toMatchObject({
      descriptions: [
        { title: 'Intro', text: 'Rain.' },
        { title: 'Arriving', text: 'Mud.' },
      ],
    });
    expect(blocks[2]).toMatchObject({ descriptions: [{ title: 'Leaving', text: 'Sun.' }] });
  });
});

describe('DC-110 — Campaign importeren: ids blijven gelijk bij opnieuw importeren (D47)', () => {
  const lines = [
    '# The Sunken Bell, part 2',
    '## Player characters',
    '- Esme',
    '## NPCs',
    '### Old Fenn',
    'Ferryman.',
    '## Scene: The Harbour at Low Tide',
    '### Read-aloud: Intro',
    'Mud.',
    '### NPCs',
    '- Old Fenn',
  ];

  it('makes ids from names, and tile ids from their position in the scene', () => {
    const campaign = campaignOf(...lines);

    expect(campaign.id).toBe('imported-the-sunken-bell-part-2');
    expect(campaign.playerCharacters[0]!.id).toBe('pc-esme');
    expect(campaign.npcs[0]!.id).toBe('npc-old-fenn');
    const scene = campaign.scenes[0]!;
    expect(scene.id).toBe('scene-the-harbour-at-low-tide');
    expect(scene.blocks.map((block) => block.id)).toEqual([
      'scene-the-harbour-at-low-tide-tile-1',
      'scene-the-harbour-at-low-tide-tile-2',
    ]);
    expect(scene.blocks[0]).toMatchObject({
      descriptions: [{ id: 'scene-the-harbour-at-low-tide-tile-1-1' }],
    });
  });

  it('gives the same ids when the file is read again, also after other changes', () => {
    const changed = [...lines.slice(0, 6), '### Marta', 'Innkeeper.', ...lines.slice(6)];

    expect(campaignOf(...lines)).toEqual(campaignOf(...lines));
    expect(campaignOf(...changed).scenes[0]!.id).toBe(campaignOf(...lines).scenes[0]!.id);
    expect(campaignOf(...changed).npcs[0]!.id).toBe('npc-old-fenn');
  });

  it('keeps letters with accents and gives names that look alike different ids', () => {
    const campaign = campaignOf(
      '# Test campaign',
      '## NPCs',
      '### Zoë',
      'Smith.',
      '### Old-Fenn',
      'Ferryman.',
      '### Old Fenn!',
      'His brother.',
      '### ???',
      'Nobody knows.',
      ...minimal.slice(2),
    );

    expect(campaign.npcs.map((npc) => npc.id)).toEqual([
      'npc-zoë',
      'npc-old-fenn',
      'npc-old-fenn-2',
      'npc-unnamed',
    ]);
  });
});

describe('DC-112 — Duidelijke foutmeldingen: de inhoud', () => {
  it('reports an enemy line it cannot read', () => {
    expect(
      parseErrors(
        '# Test campaign',
        '## Encounters',
        '### Ambush',
        '- 3 Goblins',
        '- 0 × Goblin, 7 HP',
        '- Goblin, 0 HP',
        ...minimal.slice(2),
      ),
    ).toEqual([
      { line: 4, message: '"- 3 Goblins" — expected an enemy like "- 3 × Goblin, 7 HP".' },
      { line: 5, message: '"- 0 × Goblin, 7 HP" — expected an enemy like "- 3 × Goblin, 7 HP".' },
      { line: 6, message: '"- Goblin, 0 HP" — expected an enemy like "- 3 × Goblin, 7 HP".' },
    ]);
  });

  it('reports a count without "×" instead of reading it as part of the name', () => {
    const errors = parseErrors(
      '# Test campaign',
      '## Encounters',
      '### Ambush',
      '- 3 Goblins, 7 HP',
      '- 3xGoblin, 7 HP',
      '- 2nd Lieutenant, 12 HP',
      ...minimal.slice(2),
    );

    expect(errors.map((e) => e.line)).toEqual([4, 5]);
  });

  it('reports a location, encounter or NPC that does not exist', () => {
    expect(
      parseErrors(
        ...minimal,
        '### Location: Crooked Kettle',
        '### Encounter: Ambush',
        '### NPCs',
        '- Marta',
      ),
    ).toEqual([
      { line: 7, message: '"### Location: Crooked Kettle" — there is no location with that name.' },
      { line: 8, message: '"### Encounter: Ambush" — there is no encounter with that name.' },
      { line: 10, message: '"- Marta" — there is no NPC with that name.' },
    ]);
  });

  it('reports a name that appears twice in a section, whatever the case', () => {
    expect(
      parseErrors(
        '# Test campaign',
        '## Player characters',
        '- Alice',
        '- alice',
        '## NPCs',
        '### Marta',
        'Innkeeper.',
        '### MARTA',
        'Her twin.',
        ...minimal.slice(2),
        '## Scene: road',
        '### DM notes',
        'Again.',
      ),
    ).toEqual([
      { line: 4, message: '"alice" appears twice in Player characters (first on line 3).' },
      { line: 8, message: '"MARTA" appears twice in NPCs (first on line 6).' },
      { line: 14, message: '"road" appears twice in scenes (first on line 10).' },
    ]);
  });

  it('allows the same name in different sections', () => {
    expect(
      parseErrors(
        '# Test campaign',
        '## NPCs',
        '### Millbrook',
        'A person.',
        '## Notes',
        '### Millbrook',
        'A village.',
        '## Scene: Millbrook',
        '### DM notes',
        'Quiet.',
      ),
    ).toEqual([]);
  });

  it('reports an NPC listed twice in one NPCs tile', () => {
    expect(
      parseErrors(
        '# Test campaign',
        '## NPCs',
        '### Marta',
        'Innkeeper.',
        ...minimal.slice(2),
        '### NPCs',
        '- Marta',
        '- marta',
      ),
    ).toEqual([{ line: 11, message: '"- marta" is already in this list.' }]);
  });

  it('reports the name of a demo campaign, whatever the case (D45)', () => {
    expect(parseErrors('# shadows over millbrook', ...minimal.slice(1))).toEqual([
      { line: 1, message: '"shadows over millbrook" is the name of a demo campaign.' },
    ]);
  });

  it('reports structure and content errors together, in line order', () => {
    expect(
      parseErrors('# Test campaign', '## Monsters', ...minimal.slice(2), '### NPCs', '- Marta'),
    ).toEqual([
      expect.objectContaining({ line: 2, message: expect.stringContaining('unknown section') }),
      { line: 8, message: '"- Marta" — there is no NPC with that name.' },
    ]);
  });

  it('reports a name that appears twice in Locations, Encounters or Notes', () => {
    expect(
      parseErrors(
        '# Test campaign',
        '## Locations',
        '### Inn',
        'Smoky.',
        '### inn',
        'Again.',
        '## Encounters',
        '### Ambush',
        '- Goblin, 7 HP',
        '### Ambush',
        '- Wolf, 11 HP',
        '## Notes',
        '### Village',
        'Small.',
        '### Village',
        'Again.',
        ...minimal.slice(2),
      ).map((e) => e.message),
    ).toEqual([
      '"inn" appears twice in Locations (first on line 3).',
      '"Ambush" appears twice in Encounters (first on line 8).',
      '"Village" appears twice in Notes (first on line 13).',
    ]);
  });

  it('finds a name typed with a combining accent (NFC)', () => {
    expect(
      parseErrors(
        '# Test campaign',
        '## NPCs',
        '### Zoë',
        'Smith.',
        ...minimal.slice(2),
        '### NPCs',
        '- Zoë',
      ),
    ).toEqual([]);
  });

  it('does not report a missing name twice', () => {
    expect(parseErrors(...minimal, '### Location:')).toEqual([
      { line: 7, message: '"### Location:" needs a name after the colon.' },
    ]);
  });
});
