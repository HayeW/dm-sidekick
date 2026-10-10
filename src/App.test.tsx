import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import App from './App';
import { getCampaign, getCampaigns } from './data/campaigns';

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
      'Intro',
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

describe('DC-011 — Intro tile openen', () => {
  const campaign = getCampaign('shadows-over-millbrook')!;
  const scene = campaign.scenes[0]!;
  const intro = scene.blocks.find((block) => block.type === 'intro')!;
  const introText = intro.type === 'intro' ? intro.text : '';

  it('opens the Intro tile with one tap and shows its full text', async () => {
    const user = userEvent.setup();
    renderAt(`/c/${campaign.id}/s/${scene.id}`);

    await user.click(screen.getByRole('link', { name: /^Intro/ }));

    expect(screen.getByRole('heading', { level: 1, name: 'Intro' })).toBeInTheDocument();
    expect(screen.getByText(introText)).toBeInTheDocument();
  });

  it('returns to the scene with one tap', async () => {
    const user = userEvent.setup();
    renderAt(`/c/${campaign.id}/s/${scene.id}`);
    await user.click(screen.getByRole('link', { name: /^Intro/ }));

    await user.click(screen.getByRole('button', { name: /Arrival in Millbrook/ }));

    expect(screen.getByRole('heading', { level: 1, name: scene.title })).toBeInTheDocument();
  });

  it('returns to the scene when the Intro was opened directly (refresh)', async () => {
    const user = userEvent.setup();
    renderAt(`/c/${campaign.id}/s/${scene.id}/b/${intro.id}`);

    await user.click(screen.getByRole('button', { name: /Arrival in Millbrook/ }));

    expect(screen.getByRole('heading', { level: 1, name: scene.title })).toBeInTheDocument();
  });

  it('does not make other tiles openable', () => {
    renderAt(`/c/${campaign.id}/s/${scene.id}`);

    expect(screen.queryAllByRole('link', { name: /^(Location|NPCs|DM Notes)/ })).toHaveLength(0);
  });
});
