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

  it('returns to the scene when a description was opened directly (deep link)', async () => {
    const user = userEvent.setup();
    renderAt(`${sceneUrl}/b/${block.id}/d/${inn!.id}`);
    expectDescription(inn!.title, inn!.text);

    await user.click(screen.getByRole('button', { name: new RegExp(scene.title) }));

    expect(screen.getByRole('heading', { level: 1, name: scene.title })).toBeInTheDocument();
  });

  it('shows "not found" for an unknown description', () => {
    renderAt(`${sceneUrl}/b/${block.id}/d/does-not-exist`);

    expect(screen.getByRole('heading', { name: 'Tile not found' })).toBeInTheDocument();
  });

  it('does not make other tiles openable', () => {
    renderAt(sceneUrl);

    expect(screen.queryAllByRole('link', { name: /^(Location|NPCs|DM Notes)/ })).toHaveLength(0);
  });
});
