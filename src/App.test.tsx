import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useNavigate } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { getCampaign, getCampaigns } from './data/campaigns';

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

describe('DC-043 / DC-053 / DC-060 — Combat starten en tonen', () => {
  const campaign = getCampaign('shadows-over-millbrook')!;
  const sceneUrl = `/c/${campaign.id}/s/scene-mill-road`;

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /** Fixes the d20 rolls of the enemies, in encounter order (one tie-breaker each). */
  function rollInitiative(...rolls: number[]) {
    const random = vi.spyOn(Math, 'random');
    for (const roll of rolls) {
      random.mockReturnValueOnce((roll - 0.5) / 20).mockReturnValueOnce(0.5);
    }
  }

  const encounterTile = () => screen.getByRole('region', { name: 'Encounter' });

  const combatOrder = () =>
    within(screen.getByRole('list', { name: 'Combat order' }))
      .getAllByRole('listitem')
      .map((row) => Array.from(row.children, (part) => part.textContent).join(' · '));

  it('starts combat from the encounter tile with one tap, in initiative order', async () => {
    const user = userEvent.setup();
    // Goblin 1: 5, Goblin 2: 18, Goblin 3: 11, Goblin Boss: 9 (all +2)
    rollInitiative(5, 18, 11, 9);
    renderAt(sceneUrl);

    await user.click(within(encounterTile()).getByRole('button', { name: 'Start combat' }));

    expect(screen.getByRole('heading', { level: 1, name: 'Combat' })).toBeInTheDocument();
    expect(combatOrder()).toEqual([
      'Goblin 2 · 7/7 HP',
      'Goblin 3 · 7/7 HP',
      'Goblin Boss · 21/21 HP',
      'Goblin 1 · 7/7 HP',
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
    const alice = rows.find((row) => row.textContent?.startsWith('Alice'))!;
    expect(alice).toHaveTextContent('PC');
    expect(alice).not.toHaveTextContent('HP');
    expect(rows.find((row) => row.textContent?.startsWith('Goblin Boss'))).toHaveTextContent(
      '21/21 HP',
    );
  });

  it('returns to the scene with one tap and offers to resume the combat (D1)', async () => {
    const user = userEvent.setup();
    rollInitiative(5, 18, 11, 9);
    renderAt(sceneUrl);
    await user.click(within(encounterTile()).getByRole('button', { name: 'Start combat' }));

    await user.click(screen.getByRole('link', { name: /The Mill Road/ }));

    expect(
      within(encounterTile()).queryByRole('button', { name: 'Start combat' }),
    ).not.toBeInTheDocument();
    await user.click(within(encounterTile()).getByRole('link', { name: 'Resume combat' }));
    expect(combatOrder()[0]).toBe('Goblin 2 · 7/7 HP');
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

  it('tells the DM when there is no active combat', () => {
    renderAt(`/c/${campaign.id}/combat`);

    expect(screen.getByRole('heading', { name: 'No active combat' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to campaign' })).toBeInTheDocument();
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
