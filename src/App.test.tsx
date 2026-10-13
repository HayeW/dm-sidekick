import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useNavigate } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import App from './App';
import { getCampaign, getCampaigns } from './data/campaigns';
import { clearActiveCombats } from './data/combats';

function renderWithBrowserBack(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
      <BrowserBack />
    </MemoryRouter>,
  );
}

const pressBrowserBack = () =>
  userEvent.click(screen.getByRole('button', { name: 'Browser back' }));

/** Moves a combatant one place with the arrow keys on its drag handle (reorder mode, D21). */
async function moveByKey(
  user: ReturnType<typeof userEvent.setup>,
  name: string,
  direction: 'up' | 'down',
) {
  screen.getByRole('button', { name: `Move ${name}` }).focus();
  await user.keyboard(direction === 'up' ? '{ArrowUp}' : '{ArrowDown}');
}

/** A combat row's name: its first innermost text (name comes before HP / PC / DEAD). */
function combatantName(row: HTMLElement) {
  return Array.from(row.querySelectorAll('span')).find((span) => span.children.length === 0)
    ?.textContent;
}

/** Every combat row as "name · HP / PC / DEAD", in combat order: the visible combat state. */
const combatOrder = () =>
  within(screen.getByRole('list', { name: 'Combat order' }))
    .getAllByRole('listitem')
    .map((row) =>
      // The row's innermost texts, without the buttons.
      Array.from(row.querySelectorAll('span'))
        .filter((span) => span.children.length === 0)
        .map((span) => span.textContent)
        .join(' · '),
    );

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

describe('DC-001 — Campaigns tonen', () => {
  it('shows a list with the name of every campaign', () => {
    renderAt('/');

    expect(screen.getByRole('heading', { name: 'Campaigns' })).toBeInTheDocument();
    for (const campaign of getCampaigns()) {
      expect(screen.getByRole('link', { name: new RegExp(campaign.name) })).toBeInTheDocument();
    }
  });

  it('opens the selected campaign with one tap', async () => {
    const user = userEvent.setup();
    const campaign = getCampaigns()[0]!;
    renderAt('/');

    await user.click(screen.getByRole('link', { name: new RegExp(campaign.name) }));

    expect(
      screen.getByRole('heading', { level: 1, name: campaign.scenes[0]!.title }),
    ).toBeInTheDocument();
  });

  it('shows "not found" for an unknown campaign', () => {
    renderAt('/c/does-not-exist');

    expect(screen.getByRole('heading', { name: 'Campaign not found' })).toBeInTheDocument();
  });
});

describe('DC-002 — Campaign openen', () => {
  it('opens the first scene of the selected campaign', () => {
    const campaign = getCampaigns()[0]!;
    renderAt(`/c/${campaign.id}`);

    expect(
      screen.getByRole('heading', { level: 1, name: campaign.scenes[0]!.title }),
    ).toBeInTheDocument();
  });

  it('tells the DM when a scene does not exist', () => {
    const campaign = getCampaigns()[0]!;
    renderAt(`/c/${campaign.id}/s/does-not-exist`);

    expect(screen.getByRole('heading', { name: 'Scene not found' })).toBeInTheDocument();
  });
});

describe('DC-010 — Scene tonen', () => {
  const campaign = getCampaign('shadows-over-millbrook')!;

  it('shows every content block of the scene as a tile, in order', () => {
    renderAt(`/c/${campaign.id}/s/scene-arrival`);

    const tiles = screen.getAllByRole('region');
    expect(tiles.map((tile) => tile.getAttribute('aria-label'))).toEqual([
      'Descriptions',
      'Location',
      'NPCs',
      'DM Notes',
    ]);
    expect(screen.getByText('The Crooked Kettle')).toBeInTheDocument();
    expect(screen.getByText('Marta Hollow (innkeeper), Old Fenn')).toBeInTheDocument();
  });

  it('shows an encounter tile with a compact enemy summary', () => {
    renderAt(`/c/${campaign.id}/s/scene-mill-road`);

    const tile = screen.getByRole('region', { name: 'Encounter' });
    expect(tile).toHaveTextContent('Ambush on the mill road');
    expect(tile).toHaveTextContent('3 × Goblin, 1 × Goblin Boss');
  });
});

describe('DC-011 — Descriptions tile openen', () => {
  const campaign = getCampaign('shadows-over-millbrook')!;
  const scene = campaign.scenes[0]!;
  const block = scene.blocks.find((b) => b.type === 'descriptions')!;
  const [intro, inn] = block.type === 'descriptions' ? block.descriptions : [];
  const sceneUrl = `/c/${campaign.id}/s/${scene.id}`;

  async function openTile() {
    const user = userEvent.setup();
    renderAt(sceneUrl);
    await user.click(screen.getByRole('link', { name: /^Descriptions/ }));
    return user;
  }

  function expectDescription(title: string, text: string) {
    expect(screen.getByRole('heading', { level: 1, name: title })).toBeInTheDocument();
    expect(screen.getByText(text)).toBeInTheDocument();
  }

  it('opens the first description with one tap', async () => {
    await openTile();

    expectDescription(intro!.title, intro!.text);
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
  });

  it('goes to the next and previous description with one tap each', async () => {
    const user = await openTile();

    await user.click(screen.getByRole('link', { name: /Next/ }));
    expectDescription(inn!.title, inn!.text);
    expect(screen.getByText('2 / 2')).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: /Previous/ }));
    expectDescription(intro!.title, intro!.text);
  });

  it('disables Previous at the first and Next at the last description', async () => {
    const user = await openTile();
    expect(screen.getByRole('button', { name: /Previous/ })).toBeDisabled();

    await user.click(screen.getByRole('link', { name: /Next/ }));
    expect(screen.getByRole('button', { name: /Next/ })).toBeDisabled();
  });

  it('hides Previous/Next when there is only one description', () => {
    const mill = campaign.scenes[2]!;
    renderAt(`/c/${campaign.id}/s/${mill.id}/b/${mill.blocks[0]!.id}`);

    expect(screen.queryByRole('navigation', { name: 'Descriptions' })).not.toBeInTheDocument();
  });

  it('returns to the scene with one tap, also after moving between descriptions', async () => {
    const user = await openTile();
    await user.click(screen.getByRole('link', { name: /Next/ }));

    await user.click(screen.getByRole('button', { name: new RegExp(scene.title) }));

    expect(screen.getByRole('heading', { level: 1, name: scene.title })).toBeInTheDocument();
  });

  it('leaves no extra history entries: after Back, the browser back goes to the campaign list', async () => {
    const user = userEvent.setup();
    renderWithBrowserBack('/');
    await user.click(screen.getByRole('link', { name: new RegExp(campaign.name) }));
    await user.click(screen.getByRole('link', { name: /^Descriptions/ }));
    await user.click(screen.getByRole('link', { name: /Next/ }));
    await user.click(screen.getByRole('button', { name: new RegExp(scene.title) }));
    expect(screen.getByRole('heading', { level: 1, name: scene.title })).toBeInTheDocument();

    await pressBrowserBack();

    expect(screen.getByRole('heading', { level: 1, name: 'Campaigns' })).toBeInTheDocument();
  });

  it('starts the next description at the top of the page', async () => {
    const user = await openTile();
    vi.mocked(window.scrollTo).mockClear();

    await user.click(screen.getByRole('link', { name: /Next/ }));

    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
  });

  it('returns to the scene when a description was opened directly (deep link)', async () => {
    const user = userEvent.setup();
    renderAt(`${sceneUrl}/b/${block.id}/d/${inn!.id}`);
    expectDescription(inn!.title, inn!.text);

    await user.click(screen.getByRole('button', { name: new RegExp(scene.title) }));

    expect(screen.getByRole('heading', { level: 1, name: scene.title })).toBeInTheDocument();
  });

  it('shows "not found" for an unknown description, with a way back to its scene', () => {
    renderAt(`${sceneUrl}/b/${block.id}/d/does-not-exist`);

    expect(screen.getByRole('heading', { name: 'Tile not found' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute('href', sceneUrl);
  });

  it('does not make other tiles openable', () => {
    renderAt(sceneUrl);

    expect(screen.queryAllByRole('link', { name: /^(Location|NPCs|DM Notes)/ })).toHaveLength(0);
  });
});

describe('DC-015 / DC-016 — Vorige en volgende scene', () => {
  const campaign = getCampaign('shadows-over-millbrook')!;
  const [first, second, last] = campaign.scenes;
  const scenes = () => screen.getByRole('navigation', { name: 'Scenes' });

  function expectScene(title: string) {
    expect(screen.getByRole('heading', { level: 1, name: title })).toBeInTheDocument();
  }

  it('opens the next scene with one tap', async () => {
    const user = userEvent.setup();
    renderAt(`/c/${campaign.id}/s/${first!.id}`);

    await user.click(within(scenes()).getByRole('link', { name: /Next/ }));

    expectScene(second!.title);
  });

  it('opens the previous scene with one tap', async () => {
    const user = userEvent.setup();
    renderAt(`/c/${campaign.id}/s/${second!.id}`);

    await user.click(within(scenes()).getByRole('link', { name: /Previous/ }));

    expectScene(first!.title);
  });

  it('goes back scene by scene with the back button (D12)', async () => {
    const user = userEvent.setup();
    renderWithBrowserBack(`/c/${campaign.id}/s/${first!.id}`);
    await user.click(within(scenes()).getByRole('link', { name: /Next/ }));
    await user.click(within(scenes()).getByRole('link', { name: /Next/ }));
    expectScene(last!.title);

    await user.click(screen.getByRole('button', { name: 'Browser back' }));
    expectScene(second!.title);

    await user.click(screen.getByRole('button', { name: 'Browser back' }));
    expectScene(first!.title);
  });

  it('starts the next scene at the top, but keeps the position when going back', async () => {
    const user = userEvent.setup();
    renderWithBrowserBack(`/c/${campaign.id}/s/${first!.id}`);
    vi.mocked(window.scrollTo).mockClear();

    await user.click(within(scenes()).getByRole('link', { name: /Next/ }));
    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);

    vi.mocked(window.scrollTo).mockClear();
    await pressBrowserBack();
    expectScene(first!.title);
    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  it('disables Previous on the first scene', () => {
    renderAt(`/c/${campaign.id}/s/${first!.id}`);

    expect(within(scenes()).getByRole('button', { name: /Previous/ })).toBeDisabled();
    expect(within(scenes()).getByRole('link', { name: /Next/ })).toBeInTheDocument();
  });

  it('disables Next on the last scene', () => {
    renderAt(`/c/${campaign.id}/s/${last!.id}`);

    expect(within(scenes()).getByRole('button', { name: /Next/ })).toBeDisabled();
    expect(within(scenes()).getByRole('link', { name: /Previous/ })).toBeInTheDocument();
  });

  it('disables both in a campaign with a single scene', () => {
    const single = getCampaign('the-sunken-bell')!;
    renderAt(`/c/${single.id}/s/${single.scenes[0]!.id}`);

    expect(within(scenes()).getByRole('button', { name: /Previous/ })).toBeDisabled();
    expect(within(scenes()).getByRole('button', { name: /Next/ })).toBeDisabled();
  });
});

describe('DC-017 — Swipen tussen beschrijvingen', () => {
  const campaign = getCampaign('shadows-over-millbrook')!;
  const scene = campaign.scenes[0]!;
  const block = scene.blocks.find((b) => b.type === 'descriptions')!;
  const [intro, inn] = block.type === 'descriptions' ? block.descriptions : [];
  const blockUrl = `/c/${campaign.id}/s/${scene.id}/b/${block.id}`;

  function swipe(dx: number, dy = 0) {
    const main = screen.getByRole('main');
    fireEvent.touchStart(main, { touches: [{ clientX: 200, clientY: 300 }] });
    fireEvent.touchEnd(main, { changedTouches: [{ clientX: 200 + dx, clientY: 300 + dy }] });
  }

  function expectTitle(title: string) {
    expect(screen.getByRole('heading', { level: 1, name: title })).toBeInTheDocument();
  }

  it('opens the next description when swiping left', () => {
    renderAt(blockUrl);

    swipe(-100);

    expectTitle(inn!.title);
  });

  it('opens the previous description when swiping right', () => {
    renderAt(`${blockUrl}/d/${inn!.id}`);

    swipe(100);

    expectTitle(intro!.title);
  });

  it('does nothing when swiping past the first or last description', () => {
    renderAt(blockUrl);
    swipe(100);
    expectTitle(intro!.title);

    swipe(-100);
    swipe(-100);
    expectTitle(inn!.title);
  });

  it('does not treat vertical scrolling as a swipe', () => {
    renderAt(blockUrl);

    swipe(-60, 250);

    expectTitle(intro!.title);
  });

  it('does not treat a two-finger gesture (zoom) as a swipe', () => {
    renderAt(blockUrl);
    const main = screen.getByRole('main');

    fireEvent.touchStart(main, {
      touches: [
        { clientX: 200, clientY: 300 },
        { clientX: 250, clientY: 350 },
      ],
    });
    fireEvent.touchEnd(main, { changedTouches: [{ clientX: 50, clientY: 300 }] });

    expectTitle(intro!.title);
  });

  it('does not treat panning while zoomed in as a swipe', () => {
    renderAt(blockUrl);
    Object.defineProperty(window, 'visualViewport', { value: { scale: 2 }, configurable: true });
    try {
      swipe(-100);
    } finally {
      Object.defineProperty(window, 'visualViewport', { value: undefined, configurable: true });
    }

    expectTitle(intro!.title);
  });

  it('starts the swiped-to description at the top of the page', () => {
    renderAt(blockUrl);
    vi.mocked(window.scrollTo).mockClear();

    swipe(-100);

    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
  });

  it('returns to the scene with one tap after swiping, without extra history entries', async () => {
    const user = userEvent.setup();
    renderWithBrowserBack('/');
    await user.click(screen.getByRole('link', { name: new RegExp(campaign.name) }));
    await user.click(screen.getByRole('link', { name: /^Descriptions/ }));
    swipe(-100);
    expectTitle(inn!.title);

    await user.click(screen.getByRole('button', { name: new RegExp(scene.title) }));
    expectTitle(scene.title);

    await pressBrowserBack();
    expectTitle('Campaigns');
  });
});

describe('DC-003 / DC-080 — Laatst gebruikte scene onthouden', () => {
  const campaign = getCampaign('shadows-over-millbrook')!;
  const [first, second, last] = campaign.scenes;

  function expectScene(title: string) {
    expect(screen.getByRole('heading', { level: 1, name: title })).toBeInTheDocument();
  }

  it('reopens the campaign on the last used scene', async () => {
    const user = userEvent.setup();
    const { unmount } = renderAt(`/c/${campaign.id}/s/${last!.id}`);
    unmount();

    renderAt('/');
    await user.click(screen.getByRole('link', { name: new RegExp(campaign.name) }));

    expectScene(last!.title);
  });

  it('remembers the scene reached with Next, also after a refresh', async () => {
    const user = userEvent.setup();
    const { unmount } = renderAt(`/c/${campaign.id}`);
    await user.click(
      within(screen.getByRole('navigation', { name: 'Scenes' })).getByRole('link', {
        name: /Next/,
      }),
    );
    expectScene(second!.title);
    unmount(); // closing the app / refreshing

    renderAt(`/c/${campaign.id}`);

    expectScene(second!.title);
  });

  it('remembers the scene per campaign', () => {
    const other = getCampaign('the-sunken-bell')!;
    renderAt(`/c/${campaign.id}/s/${last!.id}`).unmount();
    renderAt(`/c/${other.id}/s/${other.scenes[0]!.id}`).unmount();

    renderAt(`/c/${campaign.id}`);

    expectScene(last!.title);
  });

  it('opens the first scene when the saved scene no longer exists', () => {
    localStorage.setItem(
      `dm-cockpit:v1:session:${campaign.id}`,
      JSON.stringify({ campaignId: campaign.id, currentSceneId: 'deleted-scene' }),
    );

    renderAt(`/c/${campaign.id}`);

    expectScene(first!.title);
  });
});

describe('DC-043 / DC-053 / DC-060 / DC-081 — Combat starten, tonen en bewaren', () => {
  const campaign = getCampaign('shadows-over-millbrook')!;
  const sceneUrl = `/c/${campaign.id}/s/scene-mill-road`;

  const encounterTile = () => screen.getByRole('region', { name: 'Encounter' });

  it('starts combat from the encounter tile with one tap, enemies in alphabetical order', async () => {
    const user = userEvent.setup();
    renderAt(sceneUrl);

    await user.click(within(encounterTile()).getByRole('button', { name: 'Start combat' }));

    expect(screen.getByRole('heading', { level: 1, name: 'Combat' })).toBeInTheDocument();
    expect(combatOrder()).toEqual([
      'Goblin 1 · 7/7 HP',
      'Goblin 2 · 7/7 HP',
      'Goblin 3 · 7/7 HP',
      'Goblin Boss · 21/21 HP',
      'Alice · PC',
      'Bob · PC',
      'Cora · PC',
      'Dain · PC',
    ]);
  });

  it('shows HP for enemies but not for player characters (D3)', async () => {
    const user = userEvent.setup();
    renderAt(sceneUrl);

    await user.click(within(encounterTile()).getByRole('button', { name: 'Start combat' }));

    const rows = within(screen.getByRole('list', { name: 'Combat order' })).getAllByRole(
      'listitem',
    );
    const alice = rows.find((row) => combatantName(row) === 'Alice')!;
    expect(alice).toHaveTextContent('PC');
    expect(alice).not.toHaveTextContent('HP');
    expect(rows.find((row) => combatantName(row) === 'Goblin Boss')).toHaveTextContent('21/21 HP');
  });

  it('returns to the scene with one tap and offers to resume the combat (D1)', async () => {
    const user = userEvent.setup();
    renderAt(sceneUrl);
    await user.click(within(encounterTile()).getByRole('button', { name: 'Start combat' }));

    await user.click(screen.getByRole('link', { name: /The Mill Road/ }));

    expect(
      within(encounterTile()).queryByRole('button', { name: 'Start combat' }),
    ).not.toBeInTheDocument();
    await user.click(within(encounterTile()).getByRole('link', { name: 'Resume combat' }));
    expect(combatOrder()[0]).toBe('Goblin 1 · 7/7 HP');
  });

  it('returns to the scene with the browser back button, ready to resume', async () => {
    const user = userEvent.setup();
    renderWithBrowserBack(sceneUrl);
    await user.click(within(encounterTile()).getByRole('button', { name: 'Start combat' }));

    await pressBrowserBack();

    expect(screen.getByRole('heading', { level: 1, name: 'The Mill Road' })).toBeInTheDocument();
    expect(
      within(encounterTile()).getByRole('link', { name: 'Resume combat' }),
    ).toBeInTheDocument();
  });

  it('keeps the combat after a refresh (DC-081)', async () => {
    const user = userEvent.setup();
    const { unmount } = renderAt(sceneUrl);
    await user.click(within(encounterTile()).getByRole('button', { name: 'Start combat' }));
    const before = combatOrder();
    unmount();
    clearActiveCombats(); // refresh: only what was saved survives

    renderAt(`/c/${campaign.id}/combat`);

    expect(combatOrder()).toEqual(before);
  });

  it('keeps the saved combat when the DM moves to another scene (DC-081)', async () => {
    const user = userEvent.setup();
    const { unmount } = renderAt(sceneUrl);
    await user.click(within(encounterTile()).getByRole('button', { name: 'Start combat' }));
    const before = combatOrder();
    unmount();
    renderAt(`/c/${campaign.id}/s/scene-old-mill`).unmount(); // saves the current scene
    clearActiveCombats(); // refresh

    renderAt(`/c/${campaign.id}/combat`);

    expect(combatOrder()).toEqual(before);
  });

  it('still offers to resume the combat after a refresh (DC-081)', async () => {
    const user = userEvent.setup();
    const { unmount } = renderAt(sceneUrl);
    await user.click(within(encounterTile()).getByRole('button', { name: 'Start combat' }));
    unmount();
    clearActiveCombats();

    renderAt(sceneUrl);

    expect(
      within(encounterTile()).getByRole('link', { name: 'Resume combat' }),
    ).toBeInTheDocument();
  });

  it('tells the DM when there is no active combat', () => {
    renderAt(`/c/${campaign.id}/combat`);

    expect(screen.getByRole('heading', { name: 'No active combat' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to campaign' })).toBeInTheDocument();
  });
});

describe('DC-061 / DC-063 — Damage toepassen en dead markeren', () => {
  const campaign = getCampaign('shadows-over-millbrook')!;

  async function startCombat() {
    const user = userEvent.setup();
    const view = renderAt(`/c/${campaign.id}/s/scene-mill-road`);
    await user.click(screen.getByRole('button', { name: 'Start combat' }));
    await user.click(screen.getByRole('button', { name: 'Done' })); // leave reorder mode
    return { user, ...view };
  }

  const rows = () =>
    within(screen.getByRole('list', { name: 'Combat order' })).getAllByRole('listitem');

  const row = (name: string) => rows().find((item) => combatantName(item) === name)!;

  const rowNames = () => rows().map(combatantName);

  it('lowers HP with one tap on a damage button, no confirmation', async () => {
    const { user } = await startCombat();

    await user.click(screen.getByRole('button', { name: '5 damage to Goblin 2' }));

    expect(row('Goblin 2')).toHaveTextContent('2/7 HP');
    expect(row('Goblin 3')).toHaveTextContent('7/7 HP');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('offers −1, −5 and −10 for every enemy', async () => {
    await startCombat();

    for (const amount of [1, 5, 10]) {
      expect(
        screen.getByRole('button', { name: `${amount} damage to Goblin Boss` }),
      ).toBeInTheDocument();
    }
  });

  it('has no damage buttons for player characters (D3)', async () => {
    await startCombat();

    expect(within(row('Alice')).queryAllByRole('button')).toHaveLength(0);
  });

  it('marks a combatant at 0 HP as DEAD, in the same place (D4)', async () => {
    const { user } = await startCombat();
    const orderBefore = rowNames();

    await user.click(screen.getByRole('button', { name: '10 damage to Goblin 2' }));

    expect(row('Goblin 2')).toHaveTextContent('DEAD');
    expect(row('Goblin 2')).not.toHaveTextContent('HP');
    expect(rowNames()).toEqual(orderBefore);
    expect(screen.getByRole('button', { name: '1 damage to Goblin 2' })).toBeDisabled();
  });

  it('keeps damage and DEAD after a refresh', async () => {
    const { user, unmount } = await startCombat();
    await user.click(screen.getByRole('button', { name: '10 damage to Goblin 2' }));
    await user.click(screen.getByRole('button', { name: '5 damage to Goblin Boss' }));
    unmount();
    clearActiveCombats();

    renderAt(`/c/${campaign.id}/combat`);

    expect(row('Goblin 2')).toHaveTextContent('DEAD');
    expect(row('Goblin Boss')).toHaveTextContent('16/21 HP');
  });
});

describe('DC-064 / DC-052 — Combatants verplaatsen (reorder mode)', () => {
  const campaign = getCampaign('shadows-over-millbrook')!;
  const sceneUrl = `/c/${campaign.id}/s/scene-mill-road`;

  const rows = () =>
    within(screen.getByRole('list', { name: 'Combat order' })).getAllByRole('listitem');
  const names = () => rows().map(combatantName);

  async function startCombat(render = renderAt) {
    const user = userEvent.setup();
    const view = render(sceneUrl);
    await user.click(screen.getByRole('button', { name: 'Start combat' }));
    return { user, ...view };
  }

  it('opens a new combat in reorder mode (D17)', async () => {
    await startCombat();

    expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Move Alice' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /damage to/ })).not.toBeInTheDocument();
  });

  /**
   * Lays the rows out 60 px apart (52 px high, 8 px gap), as jsdom has no layout, and
   * returns the drag handle of the named combatant.
   */
  function layOutRows(name: string) {
    rows().forEach((row, index) =>
      vi
        .spyOn(row, 'getBoundingClientRect')
        .mockReturnValue({ top: index * 60, bottom: index * 60 + 52, height: 52 } as DOMRect),
    );
    return screen.getByRole('button', { name: `Move ${name}` });
  }

  describe('dragging the handle (D21)', () => {
    const order = [
      'Goblin 1',
      'Goblin 2',
      'Alice',
      'Goblin 3',
      'Goblin Boss',
      'Bob',
      'Cora',
      'Dain',
    ];

    it('moves a player character several places up in one drag', async () => {
      await startCombat();
      const handle = layOutRows('Alice'); // 5th row, middle at 266 px

      fireEvent.pointerDown(handle, { pointerId: 1, clientY: 266 });
      fireEvent.pointerMove(handle, { pointerId: 1, clientY: 136 }); // past Goblin 3 and 4
      fireEvent.pointerUp(handle, { pointerId: 1, clientY: 136 });

      expect(names()).toEqual(order);
    });

    it('slides the passed rows aside while dragging, and changes nothing before release', async () => {
      await startCombat();
      const handle = layOutRows('Alice');

      fireEvent.pointerDown(handle, { pointerId: 1, clientY: 266 });
      fireEvent.pointerMove(handle, { pointerId: 1, clientY: 136 });

      expect(names()[4]).toBe('Alice');
      expect(rows()[4]).toHaveStyle({ transform: 'translateY(-130px)' });
      expect(rows()[2]).toHaveStyle({ transform: 'translateY(60px)' });
      expect(rows()[3]).toHaveStyle({ transform: 'translateY(60px)' });
      expect(rows()[1]).not.toHaveStyle({ transform: 'translateY(60px)' });
    });

    it('moves an enemy down', async () => {
      await startCombat();
      const handle = layOutRows('Goblin 2'); // middle at 86 px

      fireEvent.pointerDown(handle, { pointerId: 1, clientY: 86 });
      fireEvent.pointerMove(handle, { pointerId: 1, clientY: 150 });
      fireEvent.pointerUp(handle, { pointerId: 1, clientY: 150 });

      expect(names().slice(1, 3)).toEqual(['Goblin 3', 'Goblin 2']);
    });

    it('keeps the order when dropped close to where it started', async () => {
      await startCombat();
      const handle = layOutRows('Alice');

      fireEvent.pointerDown(handle, { pointerId: 1, clientY: 266 });
      fireEvent.pointerUp(handle, { pointerId: 1, clientY: 240 });

      expect(names()[4]).toBe('Alice');
    });

    it('keeps the order when the browser cancels the drag', async () => {
      await startCombat();
      const handle = layOutRows('Alice');

      fireEvent.pointerDown(handle, { pointerId: 1, clientY: 266 });
      fireEvent.pointerMove(handle, { pointerId: 1, clientY: 136 });
      fireEvent.pointerCancel(handle, { pointerId: 1 });

      expect(names()[4]).toBe('Alice');
      expect(rows()[2]).not.toHaveStyle({ transform: 'translateY(60px)' });
    });

    const transformed = () => rows().filter((row) => row.style.transform !== '');

    it('puts every row back in place after the drop', async () => {
      await startCombat();
      const handle = layOutRows('Alice');

      fireEvent.pointerDown(handle, { pointerId: 1, clientY: 266 });
      fireEvent.pointerMove(handle, { pointerId: 1, clientY: 136 });
      fireEvent.pointerUp(handle, { pointerId: 1, clientY: 136 });

      expect(transformed()).toEqual([]);
    });

    it('drags the last row up past its neighbour', async () => {
      await startCombat();
      const handle = layOutRows('Dain'); // 8th row, middle at 446 px

      fireEvent.pointerDown(handle, { pointerId: 1, clientY: 446 });
      fireEvent.pointerMove(handle, { pointerId: 1, clientY: 380 });
      expect(rows()[6]).toHaveStyle({ transform: 'translateY(60px)' });
      fireEvent.pointerUp(handle, { pointerId: 1, clientY: 380 });

      expect(names().slice(-2)).toEqual(['Dain', 'Cora']);
    });

    it('ignores a second finger while dragging', async () => {
      await startCombat();
      const alice = layOutRows('Alice');
      const bob = screen.getByRole('button', { name: 'Move Bob' });

      fireEvent.pointerDown(alice, { pointerId: 1, clientY: 266 });
      fireEvent.pointerDown(bob, { pointerId: 2, clientY: 326 });
      fireEvent.pointerMove(bob, { pointerId: 2, clientY: 0 });
      fireEvent.pointerUp(bob, { pointerId: 2, clientY: 0 });
      expect(names()).toEqual([
        'Goblin 1',
        'Goblin 2',
        'Goblin 3',
        'Goblin Boss',
        'Alice',
        'Bob',
        'Cora',
        'Dain',
      ]);

      fireEvent.pointerUp(alice, { pointerId: 1, clientY: 136 });
      expect(names()).toEqual(order);
    });

    it('does not drag with the right mouse button', async () => {
      await startCombat();
      const handle = layOutRows('Alice');

      fireEvent.pointerDown(handle, { pointerId: 1, button: 2, clientY: 266 });
      fireEvent.pointerMove(handle, { pointerId: 1, clientY: 136 });
      fireEvent.pointerUp(handle, { pointerId: 1, clientY: 136 });

      expect(names()[4]).toBe('Alice');
    });

    it('cancels the drag when the list changes during it', async () => {
      await startCombat();
      const handle = layOutRows('Alice');

      fireEvent.pointerDown(handle, { pointerId: 1, clientY: 266 });
      fireEvent.pointerMove(handle, { pointerId: 1, clientY: 136 });
      fireEvent.click(screen.getByRole('button', { name: 'Remove Goblin 1' }));
      expect(transformed()).toEqual([]);
      fireEvent.pointerUp(handle, { pointerId: 1, clientY: 136 });

      expect(names()).toEqual([
        'Goblin 2',
        'Goblin 3',
        'Goblin Boss',
        'Alice',
        'Bob',
        'Cora',
        'Dain',
      ]);
      // A new drag works again afterwards.
      const again = layOutRows('Alice'); // now 4th row, middle at 206 px
      fireEvent.pointerDown(again, { pointerId: 1, clientY: 206 });
      fireEvent.pointerUp(again, { pointerId: 1, clientY: 20 });
      expect(names()[0]).toBe('Alice');
    });
  });

  it('moves a combatant one place with the arrow keys on its handle', async () => {
    const { user } = await startCombat();

    await moveByKey(user, 'Alice', 'up');
    await moveByKey(user, 'Alice', 'up');
    await moveByKey(user, 'Goblin 2', 'down');

    expect(names().slice(1, 4)).toEqual(['Alice', 'Goblin 2', 'Goblin 3']);
  });

  // jsdom keeps focus on a moved DOM node anyway, unlike browsers; checked by hand in Chrome.
  it('keeps focus on the handle, so the arrow keys can move it further', async () => {
    const { user } = await startCombat();
    await moveByKey(user, 'Alice', 'up');

    await user.keyboard('{ArrowUp}');

    expect(screen.getByRole('button', { name: 'Move Alice' })).toHaveFocus();
    expect(names()[2]).toBe('Alice');
  });

  it('cannot move the top combatant up or the bottom one down', async () => {
    const { user } = await startCombat();

    await moveByKey(user, 'Goblin 1', 'up');
    await moveByKey(user, 'Dain', 'down');

    expect(names()[0]).toBe('Goblin 1');
    expect(names().at(-1)).toBe('Dain');
  });

  it('puts Remove and the drag handle at opposite ends of the row (D21)', async () => {
    await startCombat();
    const buttons = within(rows()[0]!).getAllByRole('button');

    expect(buttons.map((button) => button.getAttribute('aria-label'))).toEqual([
      'Remove Goblin 1',
      'Move Goblin 1',
    ]);
  });

  it('shows the damage buttons again after Done, keeping the new order', async () => {
    const { user } = await startCombat();
    await moveByKey(user, 'Goblin 2', 'down');

    await user.click(screen.getByRole('button', { name: 'Done' }));

    expect(screen.getByRole('button', { name: 'Reorder' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Move / })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '5 damage to Goblin 2' })).toBeInTheDocument();
    expect(names().slice(1, 3)).toEqual(['Goblin 3', 'Goblin 2']);
  });

  it('enters reorder mode again with the Reorder button', async () => {
    const { user } = await startCombat();
    await user.click(screen.getByRole('button', { name: 'Done' }));

    await user.click(screen.getByRole('button', { name: 'Reorder' }));

    expect(screen.getByRole('button', { name: 'Move Alice' })).toBeInTheDocument();
  });

  it('keeps the new order after a refresh', async () => {
    const { user, unmount } = await startCombat();
    await moveByKey(user, 'Alice', 'up');
    unmount();
    clearActiveCombats();

    renderAt(`/c/${campaign.id}/combat`);

    expect(names().slice(3, 5)).toEqual(['Alice', 'Goblin Boss']);
  });

  it('keeps reorder mode after a refresh', async () => {
    const { unmount } = await startCombat();
    unmount();
    clearActiveCombats();

    renderAt(`/c/${campaign.id}/combat?mode=reorder`);

    expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();
  });

  it('opens a resumed combat in normal mode', async () => {
    const { user } = await startCombat();
    await user.click(screen.getByRole('link', { name: /The Mill Road/ }));

    await user.click(screen.getByRole('link', { name: 'Resume combat' }));

    expect(screen.getByRole('button', { name: 'Reorder' })).toBeInTheDocument();
  });

  it('returns to the scene with one Back after switching modes', async () => {
    const { user } = await startCombat(renderWithBrowserBack);
    await user.click(screen.getByRole('button', { name: 'Done' }));
    await user.click(screen.getByRole('button', { name: 'Reorder' }));

    await pressBrowserBack();

    expect(screen.getByRole('heading', { level: 1, name: 'The Mill Road' })).toBeInTheDocument();
  });
});

describe('DC-065 / DC-066 / DC-067 — Combatant toevoegen en verwijderen', () => {
  const campaign = getCampaign('shadows-over-millbrook')!;
  const sceneUrl = `/c/${campaign.id}/s/scene-mill-road`;

  const rows = () =>
    within(screen.getByRole('list', { name: 'Combat order' })).getAllByRole('listitem');
  const names = () => rows().map(combatantName);

  /** Starts the combat and taps Done, so the screen is in normal (damage) mode. */
  async function startCombat(render = renderAt) {
    const user = userEvent.setup();
    const view = render(sceneUrl);
    await user.click(screen.getByRole('button', { name: 'Start combat' }));
    await user.click(screen.getByRole('button', { name: 'Done' }));
    return { user, ...view };
  }

  async function addCombatant(user: ReturnType<typeof userEvent.setup>, name: string, hp = '') {
    await user.click(screen.getByRole('button', { name: '+ Add combatant' }));
    await user.type(screen.getByRole('textbox', { name: 'Name' }), name);
    if (hp) await user.type(screen.getByRole('spinbutton', { name: 'HP (optional)' }), hp);
    await user.click(screen.getByRole('button', { name: 'Add' }));
  }

  it('adds a combatant at the bottom with its HP', async () => {
    const { user } = await startCombat();

    await addCombatant(user, 'Wolf', '11');

    expect(names().at(-1)).toBe('Wolf');
    expect(rows().at(-1)).toHaveTextContent('11/11 HP');
  });

  it('switches to reorder mode, so the new combatant can be moved into place (DC-066)', async () => {
    const { user } = await startCombat();
    await addCombatant(user, 'Wolf', '11');

    expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();
    await moveByKey(user, 'Wolf', 'up');

    expect(names().slice(-2)).toEqual(['Wolf', 'Dain']);
  });

  it('can take damage once placed', async () => {
    const { user } = await startCombat();
    await addCombatant(user, 'Wolf', '11');
    await user.click(screen.getByRole('button', { name: 'Done' }));

    await user.click(screen.getByRole('button', { name: '5 damage to Wolf' }));

    expect(rows().at(-1)).toHaveTextContent('6/11 HP');
  });

  it('adds a combatant without HP: no HP, no damage buttons, not a PC (D8)', async () => {
    const { user } = await startCombat();
    await addCombatant(user, 'Strange voice');
    await user.click(screen.getByRole('button', { name: 'Done' }));

    const row = rows().at(-1)!;
    expect(combatantName(row)).toBe('Strange voice');
    expect(row).not.toHaveTextContent(/HP|PC|DEAD/);
    expect(within(row).queryByRole('button')).not.toBeInTheDocument();
  });

  it('cannot add without a name, or with HP that is not a whole number above 0', async () => {
    const { user } = await startCombat();
    await user.click(screen.getByRole('button', { name: '+ Add combatant' }));

    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled();
    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Wolf');
    await user.type(screen.getByRole('spinbutton', { name: 'HP (optional)' }), '0');
    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled();
  });

  it('stays in reorder mode when adding while reordering', async () => {
    const { user } = await startCombat();
    await user.click(screen.getByRole('button', { name: 'Reorder' }));

    await addCombatant(user, 'Wolf', '11');

    expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();
  });

  it('moves on to HP with Enter in the name field, and adds with Enter in HP', async () => {
    const { user } = await startCombat();
    await user.click(screen.getByRole('button', { name: '+ Add combatant' }));

    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Wolf{Enter}');
    expect(names()).not.toContain('Wolf');
    expect(screen.getByRole('spinbutton', { name: 'HP (optional)' })).toHaveFocus();

    await user.keyboard('11{Enter}');
    expect(rows().at(-1)).toHaveTextContent('11/11 HP');
  });

  it('closes the form with Cancel without adding anything', async () => {
    const { user } = await startCombat();
    await user.click(screen.getByRole('button', { name: '+ Add combatant' }));
    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Wolf');

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(names()).not.toContain('Wolf');
    expect(screen.getByRole('button', { name: '+ Add combatant' })).toBeInTheDocument();
  });

  it('keeps an added combatant after a refresh', async () => {
    const { user, unmount } = await startCombat();
    await addCombatant(user, 'Wolf', '11');
    unmount();
    clearActiveCombats();

    renderAt(`/c/${campaign.id}/combat`);

    expect(names().at(-1)).toBe('Wolf');
  });

  it('removes a combatant with one tap in reorder mode, keeping the order (DC-067)', async () => {
    const { user } = await startCombat();
    await user.click(screen.getByRole('button', { name: 'Reorder' }));

    await user.click(screen.getByRole('button', { name: 'Remove Goblin 3' }));

    expect(names()).toEqual([
      'Goblin 1',
      'Goblin 2',
      'Goblin Boss',
      'Alice',
      'Bob',
      'Cora',
      'Dain',
    ]);
  });

  it('removes an added combatant', async () => {
    const { user } = await startCombat();
    await addCombatant(user, 'Wolf', '11');

    await user.click(screen.getByRole('button', { name: 'Remove Wolf' }));

    expect(names()).not.toContain('Wolf');
  });

  it('offers Remove only in reorder mode (D18)', async () => {
    await startCombat();

    expect(screen.queryByRole('button', { name: /^Remove / })).not.toBeInTheDocument();
  });

  it('keeps a removal after a refresh', async () => {
    const { user, unmount } = await startCombat();
    await user.click(screen.getByRole('button', { name: 'Reorder' }));
    await user.click(screen.getByRole('button', { name: 'Remove Alice' }));
    unmount();
    clearActiveCombats();

    renderAt(`/c/${campaign.id}/combat`);

    expect(names()).not.toContain('Alice');
  });
});

describe('DC-070 / DC-071 / DC-081 / DC-082 — Combat verlaten, terugkeren en herstellen', () => {
  const campaign = getCampaign('shadows-over-millbrook')!;
  const roadUrl = `/c/${campaign.id}/s/scene-mill-road`;

  const sceneNav = (name: RegExp) =>
    within(screen.getByRole('navigation', { name: 'Scenes' })).getByRole('link', { name });

  const expectScene = (title: string) =>
    expect(screen.getByRole('heading', { level: 1, name: title })).toBeInTheDocument();

  /**
   * Starts the combat and changes every part of its state: order (a PC moved up), HP, DEAD,
   * added combatants (with and without HP) and a removed one. Returns the state the DM must find again.
   */
  async function playCombat(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole('button', { name: 'Start combat' }));
    await moveByKey(user, 'Alice', 'up');
    await user.click(screen.getByRole('button', { name: 'Remove Goblin 3' }));
    await user.click(screen.getByRole('button', { name: '+ Add combatant' }));
    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Wolf');
    await user.type(screen.getByRole('spinbutton', { name: 'HP (optional)' }), '11');
    await user.click(screen.getByRole('button', { name: 'Add' }));
    await user.click(screen.getByRole('button', { name: '+ Add combatant' }));
    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Hooded figure');
    await user.click(screen.getByRole('button', { name: 'Add' })); // no HP (D8)
    await user.click(screen.getByRole('button', { name: 'Done' }));
    await user.click(screen.getByRole('button', { name: '10 damage to Goblin 1' }));
    await user.click(screen.getByRole('button', { name: '5 damage to Goblin Boss' }));
    await user.click(screen.getByRole('button', { name: '1 damage to Wolf' }));

    const state = combatOrder();
    expect(state).toEqual([
      'Goblin 1 · DEAD',
      'Goblin 2 · 7/7 HP',
      'Alice · PC',
      'Goblin Boss · 16/21 HP',
      'Bob · PC',
      'Cora · PC',
      'Dain · PC',
      'Wolf · 10/11 HP',
      'Hooded figure',
    ]);
    return state;
  }

  it('keeps the combat while the DM looks at other scenes and descriptions', async () => {
    const user = userEvent.setup();
    renderAt(roadUrl);
    const before = await playCombat(user);

    // Combat → scene → description → scene → next scene → back → combat (requirements §14).
    await user.click(screen.getByRole('link', { name: /The Mill Road/ }));
    await user.click(screen.getByRole('link', { name: /^Descriptions/ }));
    await user.click(screen.getByRole('button', { name: /The Mill Road/ }));
    await user.click(sceneNav(/Next/));
    expectScene('The Old Mill');
    await user.click(sceneNav(/Previous/));
    await user.click(screen.getByRole('link', { name: 'Resume combat' }));

    expect(combatOrder()).toEqual(before);
  });

  it('keeps the combat after a refresh on the combat screen', async () => {
    const user = userEvent.setup();
    const { unmount } = renderAt(roadUrl);
    const before = await playCombat(user);
    unmount();
    clearActiveCombats(); // refresh: only what was saved survives

    renderAt(`/c/${campaign.id}/combat`);

    expect(combatOrder()).toEqual(before);
  });

  it('restores the combat after closing and reopening the app', async () => {
    const user = userEvent.setup();
    const { unmount } = renderAt(roadUrl);
    const before = await playCombat(user);
    await user.click(screen.getByRole('link', { name: /The Mill Road/ }));
    await user.click(sceneNav(/Next/));
    unmount();
    clearActiveCombats(); // the app is closed: only what was saved survives

    renderAt('/');
    await user.click(screen.getByRole('link', { name: new RegExp(campaign.name) }));
    expectScene('The Old Mill'); // the last used scene (DC-003)
    await user.click(sceneNav(/Previous/));
    await user.click(screen.getByRole('link', { name: 'Resume combat' }));

    expect(combatOrder()).toEqual(before);
  });
});

/** Stands in for the browser's / phone's back button. */
function BrowserBack() {
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => navigate(-1)}>
      Browser back
    </button>
  );
}
