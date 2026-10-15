import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { saveImportedCampaign } from '../../data/importedCampaigns';
import { savePlayers } from '../../data/playerCharacters';
import { pressBrowserBack, renderAt, renderWithBrowserBack, setupUser } from '../../test/app';

const demoId = 'shadows-over-millbrook';
const roadUrl = `/c/${demoId}/s/scene-mill-road`;
const playersUrl = (campaignId: string) => `/c/${campaignId}/players`;

const expectHeading = (name: string) =>
  expect(screen.getByRole('heading', { level: 1, name })).toBeInTheDocument();
const playerNames = () =>
  within(screen.getByRole('list', { name: 'Player characters' }))
    .getAllByRole('listitem')
    .map((item) => item.textContent);
const playersItem = () =>
  within(screen.getByRole('list', { name: 'Quick Access items' })).getByRole('link', {
    name: /Player characters/,
  });

describe('DC-031 / DC-114 — Player Characters bekijken', () => {
  it("shows a demo campaign's players, in combat order (D59)", () => {
    renderAt(playersUrl(demoId));

    expectHeading('Player characters');
    expect(playerNames()).toEqual(['Alice', 'Bob', 'Cora', 'Dain']);
  });

  it("shows the DM's own list once it is stored", () => {
    savePlayers(demoId, [
      { id: 'pc-1', name: 'Mira' },
      { id: 'pc-2', name: 'Tok' },
    ]);
    renderAt(playersUrl(demoId));

    expect(playerNames()).toEqual(['Mira', 'Tok']);
  });

  it('says so when an imported campaign has no players yet (D59)', () => {
    saveImportedCampaign(['# Hollowmere', '## Scene: The Gate', '### DM notes', 'Fog.'].join('\n'));
    renderAt(playersUrl('imported-hollowmere'));

    expect(screen.getByText('No player characters yet.')).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Player characters' })).not.toBeInTheDocument();
  });

  it('goes to the campaign when opened directly, with nothing to go back to', async () => {
    const user = setupUser();
    renderAt(playersUrl(demoId));

    await user.click(screen.getByRole('button', { name: '‹ Back' }));

    expectHeading('Arrival in Millbrook');
  });

  it('offers Quick Access on the screen (D22)', () => {
    renderAt(playersUrl(demoId));

    expect(screen.getByRole('link', { name: 'Quick' })).toBeInTheDocument();
  });

  it('shows "Campaign not found" for an unknown campaign', () => {
    renderAt(playersUrl('does-not-exist'));

    expectHeading('Campaign not found');
  });
});

describe('DC-021 — Quick Access items tonen: Player characters (D58)', () => {
  it('shows how many players the campaign has, below Spare NPCs', () => {
    renderAt(`/c/${demoId}/quick`);

    expect(playersItem()).toHaveTextContent('4 players');
    const titles = within(screen.getByRole('list', { name: 'Quick Access items' }))
      .getAllByRole('listitem')
      .map((item) => item.textContent ?? '');
    expect(titles.findIndex((title) => title.startsWith('Player characters'))).toBe(
      titles.findIndex((title) => title.startsWith('Spare NPCs')) + 1,
    );
  });

  it('says "1 player" and "0 players"', () => {
    savePlayers(demoId, [{ id: 'pc-1', name: 'Mira' }]);
    const { unmount } = renderAt(`/c/${demoId}/quick`);
    expect(playersItem()).toHaveTextContent(/1 player(?!s)/);
    unmount();

    savePlayers(demoId, []);
    renderAt(`/c/${demoId}/quick`);
    expect(playersItem()).toHaveTextContent('0 players');
  });

  it('opens the list from the scene in two taps; Back returns to the scene (D23)', async () => {
    const user = setupUser();
    renderWithBrowserBack(roadUrl);

    await user.click(screen.getByRole('link', { name: 'Quick' }));
    await user.click(playersItem());
    expectHeading('Player characters');

    await pressBrowserBack();
    expectHeading('The Mill Road');
  });
});
