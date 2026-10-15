import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { getCampaign } from '../../data/campaigns';
import { setActiveCombat } from '../../data/combats';
import { saveImportedCampaign } from '../../data/importedCampaigns';
import { startCombat } from '../../domain/combat';
import {
  combatOrder,
  pressBrowserBack,
  renderAt,
  renderWithBrowserBack,
  setupUser,
} from '../../test/app';

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
    const npcs = within(screen.getByRole('region', { name: 'NPCs' })).getAllByRole('link');
    expect(npcs.map((link) => link.textContent)).toEqual(['Marta Hollow', 'Old Fenn']);
  });

  it('shows an encounter tile with a compact enemy summary', () => {
    renderAt(`/c/${campaign.id}/s/scene-mill-road`);

    const tile = screen.getByRole('region', { name: 'Encounter' });
    expect(tile).toHaveTextContent('Ambush on the mill road');
    expect(tile).toHaveTextContent('3 × Goblin, 1 × Goblin Boss');
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
    const user = setupUser();
    renderAt(`/c/${campaign.id}/s/${first!.id}`);

    await user.click(within(scenes()).getByRole('link', { name: /Next/ }));

    expectScene(second!.title);
  });

  it('opens the previous scene with one tap', async () => {
    const user = setupUser();
    renderAt(`/c/${campaign.id}/s/${second!.id}`);

    await user.click(within(scenes()).getByRole('link', { name: /Previous/ }));

    expectScene(first!.title);
  });

  it('goes back scene by scene with the back button (D12)', async () => {
    const user = setupUser();
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
    const user = setupUser();
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

describe('DC-073 — Ander encounter starten tijdens een combat', () => {
  /** Two encounters in one scene, so both tiles are on screen. */
  const file = [
    '# Hollowmere',
    '## Encounters',
    '### Trolls',
    '- 2 × Troll, 30 HP',
    '### Wolves',
    '- 3 × Wolf, 11 HP',
    '## Scene: The Gate',
    '### Encounter: Trolls',
    '### Encounter: Wolves',
  ].join('\n');
  const sceneUrl = '/c/imported-hollowmere/s/scene-the-gate';
  const question = 'Replace the running combat?';

  const tile = (name: string) =>
    screen
      .getAllByRole('region', { name: 'Encounter' })
      .find((region) => within(region).queryByText(name))!;
  const enemies = () => combatOrder().filter((row) => !row.endsWith(' · PC'));

  /** The scene with a combat against the trolls running. */
  async function trollsRunning() {
    saveImportedCampaign(file);
    const user = setupUser();
    const { unmount } = renderAt(sceneUrl);
    await user.click(within(tile('Trolls')).getByRole('button', { name: 'Start combat' }));
    await user.click(screen.getByRole('button', { name: 'Done' })); // reorder → normal
    await user.click(screen.getByRole('button', { name: '5 damage to Troll 1' }));
    unmount();
    renderAt(sceneUrl);
    return user;
  }

  it('starts straight away when no combat runs (DC-043)', async () => {
    saveImportedCampaign(file);
    const user = setupUser();
    renderAt(sceneUrl);

    await user.click(within(tile('Wolves')).getByRole('button', { name: 'Start combat' }));

    expect(enemies()).toEqual(['Wolf 1 · 11/11 HP', 'Wolf 2 · 11/11 HP', 'Wolf 3 · 11/11 HP']);
  });

  it('shows Resume combat only on the running encounter, Start combat on the other', async () => {
    await trollsRunning();

    expect(within(tile('Trolls')).getByRole('link', { name: 'Resume combat' })).toBeInTheDocument();
    expect(within(tile('Wolves')).queryByRole('link', { name: 'Resume combat' })).toBeNull();
    expect(
      within(tile('Wolves')).getByRole('button', { name: 'Start combat' }),
    ).toBeInTheDocument();
  });

  it('asks first, inside the tile, naming the running combat (D64)', async () => {
    const user = await trollsRunning();

    await user.click(within(tile('Wolves')).getByRole('button', { name: 'Start combat' }));

    const ask = within(tile('Wolves')).getByRole('group', { name: question });
    expect(ask).toHaveTextContent(
      'A combat against Trolls is running. Start this one instead? It replaces that combat.',
    );
    expect(within(ask).getByRole('button', { name: 'Cancel' })).toHaveFocus();
    expect(screen.getByRole('heading', { level: 1, name: 'The Gate' })).toBeInTheDocument();
  });

  it('replaces the running combat on Start combat', async () => {
    const user = await trollsRunning();

    await user.click(within(tile('Wolves')).getByRole('button', { name: 'Start combat' }));
    await user.click(
      within(within(tile('Wolves')).getByRole('group', { name: question })).getByRole('button', {
        name: 'Start combat',
      }),
    );

    expect(enemies()).toEqual(['Wolf 1 · 11/11 HP', 'Wolf 2 · 11/11 HP', 'Wolf 3 · 11/11 HP']);
  });

  it('changes nothing on Cancel, and gives focus back to Start combat', async () => {
    const user = await trollsRunning();

    await user.click(within(tile('Wolves')).getByRole('button', { name: 'Start combat' }));
    await user.click(within(tile('Wolves')).getByRole('button', { name: 'Cancel' }));

    expect(within(tile('Wolves')).queryByRole('group', { name: question })).toBeNull();
    expect(within(tile('Wolves')).getByRole('button', { name: 'Start combat' })).toHaveFocus();
    await user.click(within(tile('Trolls')).getByRole('link', { name: 'Resume combat' }));
    expect(enemies()).toEqual(['Troll 1 · 25/30 HP', 'Troll 2 · 30/30 HP']);
  });

  it.each([
    ['has none', null],
    ['was removed by a re-import', 'enc-gone'],
  ])('asks about "the current combat" when its encounter %s (D67)', async (_, encounterId) => {
    saveImportedCampaign(file);
    const campaign = getCampaign('imported-hollowmere')!;
    setActiveCombat({
      ...startCombat(campaign, 'scene-the-gate', campaign.encounters[0]!),
      encounterId,
    });
    const user = setupUser();
    renderAt(sceneUrl);

    // No tile resumes it: both offer Start combat.
    expect(screen.queryByRole('link', { name: 'Resume combat' })).toBeNull();
    await user.click(within(tile('Trolls')).getByRole('button', { name: 'Start combat' }));

    expect(within(tile('Trolls')).getByRole('group', { name: question })).toHaveTextContent(
      'The current combat is still running.',
    );
  });
});
