import { cleanup, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { saveImportedCampaign } from '../../data/importedCampaigns';
import { savePlayers } from '../../data/playerCharacters';
import {
  combatOrder,
  pressBrowserBack,
  renderAt,
  renderWithBrowserBack,
  setupUser,
} from '../../test/app';

const demoId = 'shadows-over-millbrook';
const roadUrl = `/c/${demoId}/s/scene-mill-road`;
const playersUrl = (campaignId: string) => `/c/${campaignId}/players`;

const expectHeading = (name: string) =>
  expect(screen.getByRole('heading', { level: 1, name })).toBeInTheDocument();
/** The names in the list, in order: each name is its own rename button (D60). */
const playerNames = () =>
  within(screen.getByRole('list', { name: 'Player characters' }))
    .getAllByRole('button', { name: /^Rename / })
    .map((button) => button.textContent);
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

describe('DC-030 / DC-114 — Player Characters toevoegen, hernoemen en verwijderen (D60)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const nameField = () => screen.getByRole('textbox', { name: 'Player name' });

  /** An imported campaign has no players yet: the DM's own list starts empty (D59). */
  function openImported() {
    saveImportedCampaign(
      [
        '# Hollowmere',
        '## Encounters',
        '### Trolls',
        '- Troll, 30 HP',
        '## Scene: The Gate',
        '### Encounter: Trolls',
      ].join('\n'),
    );
    renderAt(playersUrl('imported-hollowmere'));
    return setupUser();
  }

  it('adds players by name, one after another, keeping the field ready', async () => {
    const user = openImported();

    await user.type(nameField(), 'Mira{Enter}');
    await user.type(nameField(), 'Tok');
    await user.click(screen.getByRole('button', { name: 'Add' }));

    expect(playerNames()).toEqual(['Mira', 'Tok']);
    expect(nameField()).toHaveValue('');
    expect(nameField()).toHaveFocus();
  });

  it('refuses an empty name or a name that is already a player, and says why', async () => {
    const user = openImported();
    await user.type(nameField(), 'Mira{Enter}');

    await user.type(nameField(), '{Enter}');
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a name.');

    await user.type(nameField(), 'mira{Enter}');
    expect(screen.getByRole('alert')).toHaveTextContent('“Mira” is already a player.');
    expect(nameField()).toHaveValue('mira');
    expect(nameField()).toHaveAttribute('aria-invalid', 'true');
    expect(playerNames()).toEqual(['Mira']);

    await user.type(nameField(), 'bel');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('renames a player in place by tapping the name', async () => {
    const user = openImported();
    await user.type(nameField(), 'Mira{Enter}');

    await user.click(screen.getByRole('button', { name: 'Rename Mira' }));
    const field = screen.getByRole('textbox', { name: 'New name for Mira' });
    expect(field).toHaveFocus();
    await user.clear(field);
    await user.type(field, 'Mirabel');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(playerNames()).toEqual(['Mirabel']);
    expect(screen.getByRole('button', { name: 'Rename Mirabel' })).toHaveFocus();
  });

  it('keeps the old name on Cancel or Escape', async () => {
    const user = openImported();
    await user.type(nameField(), 'Mira{Enter}');

    await user.click(screen.getByRole('button', { name: 'Rename Mira' }));
    await user.type(screen.getByRole('textbox', { name: 'New name for Mira' }), 'bel');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(playerNames()).toEqual(['Mira']);
    expect(screen.getByRole('button', { name: 'Rename Mira' })).toHaveFocus();

    await user.click(screen.getByRole('button', { name: 'Rename Mira' }));
    await user.type(screen.getByRole('textbox', { name: 'New name for Mira' }), 'bel{Escape}');
    expect(playerNames()).toEqual(['Mira']);
    expect(screen.getByRole('button', { name: 'Rename Mira' })).toHaveFocus();
  });

  it("refuses another player's name when renaming, and keeps the form open", async () => {
    const user = openImported();
    await user.type(nameField(), 'Mira{Enter}');
    await user.type(nameField(), 'Tok{Enter}');

    await user.click(screen.getByRole('button', { name: 'Rename Tok' }));
    const field = screen.getByRole('textbox', { name: 'New name for Tok' });
    await user.clear(field);
    await user.type(field, 'MIRA{Enter}');

    expect(screen.getByRole('alert')).toHaveTextContent('“Mira” is already a player.');
    expect(field).toBeInTheDocument();
    expect(playerNames()).toEqual(['Mira']); // Tok's row is the form
  });

  it('removes a player with one tap, without confirmation', async () => {
    const user = openImported();
    await user.type(nameField(), 'Mira{Enter}');
    await user.type(nameField(), 'Tok{Enter}');

    await user.click(screen.getByRole('button', { name: 'Remove Mira' }));

    expect(playerNames()).toEqual(['Tok']);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(nameField()).toHaveFocus();
  });

  it('keeps the changes after a refresh', async () => {
    const user = setupUser();
    const { unmount } = renderAt(playersUrl(demoId));
    await user.click(screen.getByRole('button', { name: 'Remove Bob' }));
    await user.type(nameField(), 'Mira{Enter}');
    unmount();

    renderAt(playersUrl(demoId));

    expect(playerNames()).toEqual(['Alice', 'Cora', 'Dain', 'Mira']);
  });

  it('starts the next combat with the new players, after the enemies', async () => {
    const user = openImported();
    await user.type(nameField(), 'Mira{Enter}');
    await user.type(nameField(), 'Tok{Enter}');

    cleanup(); // leave the players screen
    renderAt('/c/imported-hollowmere/s/scene-the-gate');
    await user.click(screen.getByRole('button', { name: 'Start combat' }));

    expect(combatOrder()).toEqual(['Troll · 30/30 HP', 'Mira · PC', 'Tok · PC']);
  });

  it('tells the DM when the list cannot be stored, and changes nothing', async () => {
    const user = openImported();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });

    await user.type(nameField(), 'Mira{Enter}');

    expect(screen.getByRole('alert')).toHaveTextContent(
      'There is no room to store it on this device.',
    );
    expect(screen.getByText('No player characters yet.')).toBeInTheDocument();
  });

  it('tells the DM when a Remove cannot be stored, and keeps the player', async () => {
    const user = openImported();
    await user.type(nameField(), 'Mira{Enter}');
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });

    await user.click(screen.getByRole('button', { name: 'Remove Mira' }));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'There is no room to store it on this device.',
    );
    expect(playerNames()).toEqual(['Mira']);
  });
});
