# Campaign file format

Status: **approved by the product owner on 2026-10-13.** Stories: DC-110 – DC-113 in
`requirements.md`.

A campaign is one Markdown file (`.md`), written on the PC in any text editor and imported
in the app on the phone. It is plain Markdown, so it also reads well in an editor preview.

## A complete example

This is the demo campaign "Shadows over Millbrook" as a file:

```markdown
# Shadows over Millbrook

## Player characters

- Alice
- Bob
- Cora
- Dain

## NPCs

### Marta Hollow

Innkeeper of the Crooked Kettle. Warm to regulars, wary of strangers; keeps a cudgel under
the bar.

### Old Fenn

Retired ferryman who drinks by the hearth every night. Talks freely for a mug of ale, and
exaggerates everything.

## Locations

### The Crooked Kettle

Low-beamed inn, smoky hearth, six rooms upstairs. Usually busy; tonight half empty.

### Mill cellar

Damp stone cellar under the grinding floor. Trapdoor behind the flour sacks.

## Encounters

### Ambush on the mill road

- 3 × Goblin, 7 HP
- 1 × Goblin Boss, 21 HP

## Notes

### Millbrook

A village of about eighty people on the river Wend. The mill grinds for three villages;
without it, bread runs out within a week.

### The missing miller

Joren the miller owes the goblin boss for safe passage of his grain barges. He is hiding in
the tunnels below the mill cellar.

## Scene: Arrival in Millbrook

### Read-aloud: Intro

Rain drums on the thatched roofs as you reach Millbrook at dusk. The mill wheel by the
river stands still, and every shutter in the village is closed. Only the lantern above the
Crooked Kettle inn still burns.

### Read-aloud: Entering the Crooked Kettle

Warmth and the smell of peat smoke hit you as the door swings open. A handful of villagers
fall silent and stare; the innkeeper sets down a tankard and waits.

### Location: The Crooked Kettle

### NPCs

- Marta Hollow
- Old Fenn

### DM notes

Marta knows the miller vanished three nights ago. Fenn saw lights on the mill road.

## Scene: The Mill Road

### Read-aloud: Intro

The muddy road follows the river toward the old mill. Broken cart wheels lie in the ditch,
and fresh tracks lead into the reeds.

### Read-aloud: Arriving at the mill

The reeds part and the old mill rises ahead, dark against the evening sky. Its door hangs
open, and wet footprints lead inside.

### Encounter: Ambush on the mill road

### DM notes

The goblins attack when the party reaches the cart. The boss carries the miller's key.

## Scene: The Old Mill

### Read-aloud: Intro

The mill looms over the water, its great wheel jammed with branches. A faint knocking comes
from somewhere below the floorboards.

### Location: Mill cellar
```

## The rules

### The campaign

- The file starts with **one** `# Campaign name` heading. The name identifies the campaign:
  importing a file with the same name replaces that campaign, after a confirmation (DC-111).
- The name may not be the name of a demo campaign.

### Sections (`##`)

| Heading                | Contains                                                  | Required     |
| ---------------------- | --------------------------------------------------------- | ------------ |
| `## Player characters` | A list of names (`- Alice`). No HP (D3).                  | No           |
| `## NPCs`              | One `### Name` per NPC, with a description below it.      | No           |
| `## Locations`         | One `### Name` per location, with a description below it. | No           |
| `## Encounters`        | One `### Name` per encounter, with a list of enemies.     | No           |
| `## Notes`             | One `### Title` per campaign note, with its text (D28).   | No           |
| `## Scene: Title`      | One per scene; the tiles of that scene, see below.        | At least one |

- Scenes appear in the app in the order of the file. The other sections may be in any order,
  before, between or after the scenes, and each may appear only once.
- NPCs, locations, encounters and notes keep the order of the file.

### Enemies in an encounter

One line per group: `- <count> × <name>, <HP> HP`.

- `- 3 × Goblin, 7 HP` — three goblins, 7 HP each. In the app: Goblin 1, Goblin 2, Goblin 3.
- `- Goblin Boss, 21 HP` — without a count: one.
- `x` works as well as `×`: `- 3 x Goblin, 7 HP`.

### Tiles in a scene (`###`)

Each `###` heading in a scene is one tile, in the order of the file.

| Heading                 | Tile                                                                 |
| ----------------------- | -------------------------------------------------------------------- |
| `### Read-aloud: Title` | A read-aloud text, with the text below it. See "Descriptions" below. |
| `### Location: Name`    | The location with that name from `## Locations`. No text below it.   |
| `### NPCs`              | A list of NPC names from `## NPCs` (`- Marta Hollow`).               |
| `### Encounter: Name`   | The encounter with that name from `## Encounters`; starts combat.    |
| `### DM notes`          | The scene's own notes, with the text below it.                       |

**Descriptions:** read-aloud texts that follow each other directly form **one** Descriptions
tile, with previous/next between them in the app (D11). Another tile in between starts a new
Descriptions tile.

### Names and references

- Locations, NPCs and encounters are referred to by their **name**, not by an id. Upper and
  lower case don't matter: `### Location: the crooked kettle` finds "The Crooked Kettle".
- Within a section, every name must be unique, and so must the scene titles.

### Text

- Text is everything below a heading, up to the next heading. Paragraphs (separated by an
  empty line) and line breaks are kept.
- Markdown formatting like `**bold**` or `*italic*` is shown as typed for now.

### Errors

The app reads the whole file and lists **every** problem with its line number; nothing is
imported until the file is correct (DC-112). For example:

- `Line 1: the file must start with "# Campaign name".`
- `Line 47: unknown section "## Monsters". Expected Player characters, NPCs, Locations, Encounters, Notes or Scene: …`
- `Line 62: "### Location: Crooked Kettle" — there is no location with that name.`
- `Line 31: "- 3 Goblins" — expected an enemy like "- 3 × Goblin, 7 HP".`
- `Line 88: "## NPCs" appears twice.`
- `Line 1: "Shadows over Millbrook" is the name of a demo campaign.`

## Decisions (product owner, 2026-10-13)

- **Section and tile names are English**, matching the English UI (D10).
- **Unknown headings are an error**, so typos are caught early.
- **A demo campaign's name is an error**, to keep things simple; the demo campaigns will be
  removed later.
