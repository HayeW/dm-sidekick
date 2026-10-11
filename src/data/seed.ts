import type { Campaign } from '../domain/campaign';

// Demo campaigns bundled with the app. There is no story yet for creating campaigns,
// so this is the only campaign data in the first slice. Content is original.

export const seedCampaigns: Campaign[] = [
  {
    id: 'shadows-over-millbrook',
    name: 'Shadows over Millbrook',
    playerCharacters: [
      { id: 'pc-alice', name: 'Alice' },
      { id: 'pc-bob', name: 'Bob' },
      { id: 'pc-cora', name: 'Cora' },
      { id: 'pc-dain', name: 'Dain' },
    ],
    encounters: [
      {
        id: 'enc-road-ambush',
        name: 'Ambush on the mill road',
        enemies: [
          { name: 'Goblin', count: 3, hp: 7 },
          { name: 'Goblin Boss', count: 1, hp: 21 },
        ],
      },
    ],
    scenes: [
      {
        id: 'scene-arrival',
        title: 'Arrival in Millbrook',
        blocks: [
          {
            id: 'b-arrival-descriptions',
            type: 'descriptions',
            descriptions: [
              {
                id: 'd-arrival-intro',
                title: 'Intro',
                text:
                  'Rain drums on the thatched roofs as you reach Millbrook at dusk. ' +
                  'The mill wheel by the river stands still, and every shutter in the village is closed. ' +
                  'Only the lantern above the Crooked Kettle inn still burns.',
              },
              {
                id: 'd-arrival-inn',
                title: 'Entering the Crooked Kettle',
                text:
                  'Warmth and the smell of peat smoke hit you as the door swings open. ' +
                  'A handful of villagers fall silent and stare; the innkeeper sets down a tankard and waits.',
              },
            ],
          },
          {
            id: 'b-arrival-location',
            type: 'location',
            title: 'The Crooked Kettle',
            text: 'Low-beamed inn, smoky hearth, six rooms upstairs. Usually busy; tonight half empty.',
          },
          { id: 'b-arrival-npcs', type: 'npcs', names: ['Marta Hollow (innkeeper)', 'Old Fenn'] },
          {
            id: 'b-arrival-notes',
            type: 'notes',
            text: 'Marta knows the miller vanished three nights ago. Fenn saw lights on the mill road.',
          },
        ],
      },
      {
        id: 'scene-mill-road',
        title: 'The Mill Road',
        blocks: [
          {
            id: 'b-road-descriptions',
            type: 'descriptions',
            descriptions: [
              {
                id: 'd-road-intro',
                title: 'Intro',
                text:
                  'The muddy road follows the river toward the old mill. ' +
                  'Broken cart wheels lie in the ditch, and fresh tracks lead into the reeds.',
              },
              {
                id: 'd-road-mill',
                title: 'Arriving at the mill',
                text:
                  'The reeds part and the old mill rises ahead, dark against the evening sky. ' +
                  'Its door hangs open, and wet footprints lead inside.',
              },
            ],
          },
          { id: 'b-road-encounter', type: 'encounter', encounterId: 'enc-road-ambush' },
          {
            id: 'b-road-notes',
            type: 'notes',
            text: 'The goblins attack when the party reaches the cart. The boss carries the miller’s key.',
          },
        ],
      },
      {
        id: 'scene-old-mill',
        title: 'The Old Mill',
        blocks: [
          {
            id: 'b-mill-descriptions',
            type: 'descriptions',
            descriptions: [
              {
                id: 'd-mill-intro',
                title: 'Intro',
                text:
                  'The mill looms over the water, its great wheel jammed with branches. ' +
                  'A faint knocking comes from somewhere below the floorboards.',
              },
            ],
          },
          {
            id: 'b-mill-location',
            type: 'location',
            title: 'Mill cellar',
            text: 'Damp stone cellar under the grinding floor. Trapdoor behind the flour sacks.',
          },
        ],
      },
    ],
  },
  {
    id: 'the-sunken-bell',
    name: 'The Sunken Bell',
    playerCharacters: [
      { id: 'pc-esme', name: 'Esme' },
      { id: 'pc-finn', name: 'Finn' },
    ],
    encounters: [],
    scenes: [
      {
        id: 'scene-harbour',
        title: 'The Harbour at Low Tide',
        blocks: [
          {
            id: 'b-harbour-descriptions',
            type: 'descriptions',
            descriptions: [
              {
                id: 'd-harbour-intro',
                title: 'Intro',
                text:
                  'At low tide the harbour floor lies bare, and somewhere beneath the mud ' +
                  'a bell is ringing that no one has seen in a hundred years.',
              },
            ],
          },
        ],
      },
    ],
  },
];
