import type { SpareNpc } from '../domain/spareNpc';

// Spare NPCs bundled with the app (DC-090): the same in every campaign. Array order is list
// order (decision D31): the roles a story needs most often come first. Content is original.

const spareNpcs: SpareNpc[] = [
  {
    id: 'spare-orla',
    name: 'Orla Breck',
    race: 'Human',
    description: 'Tavern keeper with a booming laugh. Remembers every face and every unpaid tab.',
  },
  {
    id: 'spare-dunmar',
    name: 'Dunmar Stoutbelt',
    race: 'Dwarf',
    description:
      'Gate guard counting the days to retirement. Strict by the book, soft for a bribe of good ale.',
  },
  {
    id: 'spare-pip',
    name: 'Pip Underbough',
    race: 'Halfling',
    description:
      'Travelling merchant with a cart of odds and ends. Swears every item is enchanted.',
  },
  {
    id: 'spare-seraphine',
    name: 'Seraphine Vale',
    race: 'Half-elf',
    description:
      'Temple healer, calm and tired. Heals anyone, but asks pointed questions about the wounds.',
  },
  {
    id: 'spare-gorrick',
    name: 'Gorrick',
    race: 'Half-orc',
    description: 'Blacksmith with burn-scarred arms. Few words, honest prices, hates haggling.',
  },
  {
    id: 'spare-tamsin',
    name: 'Tamsin Reed',
    race: 'Human',
    description: 'Street kid who runs messages for coppers. Knows every alley and every rumour.',
  },
  {
    id: 'spare-velis',
    name: 'Velis Ashgrove',
    race: 'Elf',
    description: 'Retired scout turned hunting guide. Polite, distant, never misses a track.',
  },
  {
    id: 'spare-brannoc',
    name: 'Brannoc Tull',
    race: 'Dwarf',
    description:
      'Mine foreman with a lantern and a grudge. Sure something below is stealing his tools.',
  },
  {
    id: 'spare-mirela',
    name: 'Mirela Fenwick',
    race: 'Human',
    description:
      'Village elder who speaks for the council. Wise, stubborn, and slow to trust outsiders.',
  },
  {
    id: 'spare-quill',
    name: 'Quill',
    race: 'Tiefling',
    description:
      'Fast-talking fence behind a bookshop. Buys anything, asks nothing, remembers everything.',
  },
  {
    id: 'spare-hollis',
    name: 'Hollis Marr',
    race: 'Human',
    description: 'Ferryman who works only at dusk. Takes payment in stories as often as in coin.',
  },
  {
    id: 'spare-nym',
    name: 'Nym Fizzlecog',
    race: 'Gnome',
    description:
      'Tinkerer whose inventions work about half the time. Eager to test them on volunteers.',
  },
  {
    id: 'spare-ardent',
    name: 'Sister Ardent',
    race: 'Human',
    description:
      'Wandering priest of the dawn. Cheerful, fearless, and terrible at keeping secrets.',
  },
  {
    id: 'spare-krell',
    name: 'Krell Duskmantle',
    race: 'Dragonborn',
    description: 'Bounty hunter between contracts. Respects strength, despises liars.',
  },
  {
    id: 'spare-wen',
    name: 'Wen Larkspur',
    race: 'Halfling',
    description: 'Farmer whose sheep keep going missing. Offers a fine pie for any help.',
  },
  {
    id: 'spare-ilsabet',
    name: 'Ilsabet Crane',
    race: 'Human',
    description: 'Noble’s steward on an errand. Impatient, well dressed, carries a heavy purse.',
  },
  {
    id: 'spare-thorn',
    name: 'Thorn',
    race: 'Wood elf',
    description:
      'Hermit herbalist at the forest edge. Sells remedies and warnings in equal measure.',
  },
  {
    id: 'spare-bram',
    name: 'Bram Oakhart',
    race: 'Human',
    description: 'Retired soldier with a wooden leg. Tells war stories to anyone who buys a round.',
  },
  {
    id: 'spare-zeya',
    name: 'Zeya Sunwhisper',
    race: 'Half-elf',
    description: 'Travelling bard collecting local legends. Will trade a song for a good tale.',
  },
  {
    id: 'spare-old-mag',
    name: 'Old Mag',
    race: 'Human',
    description:
      'Fortune teller in a patched tent. Half her predictions are nonsense; the other half come true.',
  },
];

export function getSpareNpcs(): SpareNpc[] {
  return spareNpcs;
}
