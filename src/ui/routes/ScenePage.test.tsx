import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { getCampaign } from '../../data/campaigns';
import { pressBrowserBack, renderAt, renderWithBrowserBack, setupUser } from '../../test/app';

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
