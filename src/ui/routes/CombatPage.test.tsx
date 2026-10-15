import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearActiveCombats, setActiveCombat } from '../../data/combats';
import { savePlayers } from '../../data/playerCharacters';
import { startCombat } from '../../domain/combat';
import {
  combatantName,
  combatOrder,
  moveByKey,
  pressBrowserBack,
  renderAt,
  renderWithBrowserBack,
  setupUser,
} from '../../test/app';
import { importTestCampaigns, millbrook } from '../../test/testCampaigns';

beforeEach(importTestCampaigns);

describe('DC-043 / DC-053 / DC-060 / DC-081 — Combat starten, tonen en bewaren', () => {
  const campaign = millbrook;
  const sceneUrl = `/c/${campaign.id}/s/scene-the-mill-road`;

  const encounterTile = () => screen.getByRole('region', { name: 'Encounter' });

  it('starts combat from the encounter tile with one tap, enemies in alphabetical order', async () => {
    const user = setupUser();
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
    const user = setupUser();
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
    const user = setupUser();
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
    const user = setupUser();
    renderWithBrowserBack(sceneUrl);
    await user.click(within(encounterTile()).getByRole('button', { name: 'Start combat' }));

    await pressBrowserBack();

    expect(screen.getByRole('heading', { level: 1, name: 'The Mill Road' })).toBeInTheDocument();
    expect(
      within(encounterTile()).getByRole('link', { name: 'Resume combat' }),
    ).toBeInTheDocument();
  });

  it('keeps the combat after a refresh (DC-081)', async () => {
    const user = setupUser();
    const { unmount } = renderAt(sceneUrl);
    await user.click(within(encounterTile()).getByRole('button', { name: 'Start combat' }));
    const before = combatOrder();
    unmount();
    clearActiveCombats(); // refresh: only what was saved survives

    renderAt(`/c/${campaign.id}/combat`);

    expect(combatOrder()).toEqual(before);
  });

  it('keeps the saved combat when the DM moves to another scene (DC-081)', async () => {
    const user = setupUser();
    const { unmount } = renderAt(sceneUrl);
    await user.click(within(encounterTile()).getByRole('button', { name: 'Start combat' }));
    const before = combatOrder();
    unmount();
    renderAt(`/c/${campaign.id}/s/scene-the-old-mill`).unmount(); // saves the current scene
    clearActiveCombats(); // refresh

    renderAt(`/c/${campaign.id}/combat`);

    expect(combatOrder()).toEqual(before);
  });

  it('still offers to resume the combat after a refresh (DC-081)', async () => {
    const user = setupUser();
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
  const campaign = millbrook;

  async function startCombat() {
    const user = setupUser();
    const view = renderAt(`/c/${campaign.id}/s/scene-the-mill-road`);
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

describe('DC-062 — Healing toepassen (heal mode)', () => {
  const campaign = millbrook;
  const sceneUrl = `/c/${campaign.id}/s/scene-the-mill-road`;

  /** Starts the combat in normal mode, with Goblin Boss at 11/21 and Goblin 1 DEAD. */
  async function startHurtCombat(render = renderAt) {
    const user = setupUser();
    const view = render(sceneUrl);
    await user.click(screen.getByRole('button', { name: 'Start combat' }));
    await user.click(screen.getByRole('button', { name: 'Done' })); // leave reorder mode
    await user.click(screen.getByRole('button', { name: '10 damage to Goblin Boss' }));
    await user.click(screen.getByRole('button', { name: '10 damage to Goblin 1' }));
    return { user, ...view };
  }

  const rows = () =>
    within(screen.getByRole('list', { name: 'Combat order' })).getAllByRole('listitem');
  const row = (name: string) => rows().find((item) => combatantName(item) === name)!;
  /** An active combat for the Mill Road encounter, without going through the scene. */
  const setRoadCombat = () =>
    setActiveCombat(startCombat(campaign, 'scene-the-mill-road', campaign.encounters[0]!));
  const healButton = (amount: number, name: string) =>
    screen.getByRole('button', { name: `${amount} healing to ${name}` });

  it('switches every enemy to +1, +5 and +10 in heal mode, with a hint (D39, D41)', async () => {
    const { user } = await startHurtCombat();

    await user.click(screen.getByRole('button', { name: 'Heal' }));

    for (const amount of [1, 5, 10]) expect(healButton(amount, 'Goblin 2')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /damage to/ })).not.toBeInTheDocument();
    expect(
      screen.getByText('Healing: tap +1, +5 or +10, then tap Done below.'),
    ).toBeInTheDocument();
  });

  it('raises HP with one tap, no confirmation', async () => {
    const { user } = await startHurtCombat();
    await user.click(screen.getByRole('button', { name: 'Heal' }));

    await user.click(healButton(5, 'Goblin Boss'));

    expect(row('Goblin Boss')).toHaveTextContent('16/21 HP');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('stops at max HP and disables healing at full HP (D36)', async () => {
    const { user } = await startHurtCombat();
    await user.click(screen.getByRole('button', { name: 'Heal' }));

    expect(healButton(10, 'Goblin 2')).toBeDisabled();
    await user.click(healButton(10, 'Goblin Boss'));
    await user.click(healButton(10, 'Goblin Boss'));

    expect(row('Goblin Boss')).toHaveTextContent('21/21 HP');
    expect(healButton(1, 'Goblin Boss')).toBeDisabled();
  });

  it('brings a DEAD combatant back (D37)', async () => {
    const { user } = await startHurtCombat();
    await user.click(screen.getByRole('button', { name: 'Heal' }));

    await user.click(healButton(1, 'Goblin 1'));

    expect(row('Goblin 1')).toHaveTextContent('1/7 HP');
    expect(row('Goblin 1')).not.toHaveTextContent('DEAD');
  });

  it('offers no healing for player characters (D3)', async () => {
    const { user } = await startHurtCombat();
    await user.click(screen.getByRole('button', { name: 'Heal' }));

    expect(within(row('Alice')).queryByRole('button')).not.toBeInTheDocument();
  });

  it('labels the heal toggle Done in heal mode, like reorder mode, read as Done healing (D41)', async () => {
    const { user } = await startHurtCombat();

    await user.click(screen.getByRole('button', { name: 'Heal' }));

    expect(screen.getByRole('button', { name: 'Done healing' })).toHaveTextContent(/^Done$/);
  });

  it('stays in heal mode for several heals, until Done healing (D39)', async () => {
    const { user } = await startHurtCombat();
    await user.click(screen.getByRole('button', { name: 'Heal' }));
    await user.click(healButton(5, 'Goblin Boss'));
    await user.click(healButton(1, 'Goblin 1'));

    await user.click(screen.getByRole('button', { name: 'Done healing' }));

    expect(screen.getByRole('button', { name: '5 damage to Goblin Boss' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /healing to/ })).not.toBeInTheDocument();
    expect(row('Goblin Boss')).toHaveTextContent('16/21 HP');
  });

  it('leaves heal mode when switching to reorder mode: one mode at a time (D39)', async () => {
    const { user } = await startHurtCombat();
    await user.click(screen.getByRole('button', { name: 'Heal' }));

    await user.click(screen.getByRole('button', { name: 'Reorder' }));

    expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Heal' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /healing to/ })).not.toBeInTheDocument();
  });

  it('leaves reorder mode when switching to heal mode', async () => {
    const { user } = await startHurtCombat();
    await user.click(screen.getByRole('button', { name: 'Reorder' }));

    await user.click(screen.getByRole('button', { name: 'Heal' }));

    expect(screen.getByRole('button', { name: 'Done healing' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reorder' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Move / })).not.toBeInTheDocument();
  });

  it('switches to reorder mode after adding a combatant in heal mode (DC-066)', async () => {
    const { user } = await startHurtCombat();
    await user.click(screen.getByRole('button', { name: 'Heal' }));

    await user.click(screen.getByRole('button', { name: '+ Add combatant' }));
    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Wolf');
    await user.click(screen.getByRole('button', { name: 'Add' }));

    expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Heal' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /healing to/ })).not.toBeInTheDocument();
  });

  it('shows normal mode for an unknown mode in the URL', () => {
    setRoadCombat();
    renderAt(`/c/${campaign.id}/combat?mode=bogus`);

    expect(screen.getByRole('button', { name: '5 damage to Goblin 2' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Heal' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reorder' })).toBeInTheDocument();
  });

  it('keeps heal mode and the healed HP after a refresh (D42)', async () => {
    const { user, unmount } = await startHurtCombat();
    await user.click(screen.getByRole('button', { name: 'Heal' }));
    await user.click(healButton(5, 'Goblin Boss'));
    unmount();
    clearActiveCombats();

    renderAt(`/c/${campaign.id}/combat?mode=heal`);

    expect(row('Goblin Boss')).toHaveTextContent('16/21 HP');
    expect(screen.getByRole('button', { name: 'Done healing' })).toBeInTheDocument();
  });

  it('still returns to the scene with one Back after switching modes (D42)', async () => {
    const { user } = await startHurtCombat(renderWithBrowserBack);
    await user.click(screen.getByRole('button', { name: 'Heal' }));
    await user.click(screen.getByRole('button', { name: 'Done healing' }));

    await pressBrowserBack();

    expect(screen.getByRole('heading', { level: 1, name: 'The Mill Road' })).toBeInTheDocument();
  });

  it('opens a resumed combat in normal mode (D42)', async () => {
    const { user } = await startHurtCombat();
    await user.click(screen.getByRole('button', { name: 'Heal' }));
    await user.click(screen.getByRole('link', { name: '‹ The Mill Road' }));

    await user.click(screen.getByRole('link', { name: 'Resume combat' }));

    expect(screen.getByRole('button', { name: 'Heal' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '5 damage to Goblin 2' })).toBeInTheDocument();
  });
});

describe('DC-064 / DC-052 — Combatants verplaatsen (reorder mode)', () => {
  const campaign = millbrook;
  const sceneUrl = `/c/${campaign.id}/s/scene-the-mill-road`;

  const rows = () =>
    within(screen.getByRole('list', { name: 'Combat order' })).getAllByRole('listitem');
  const names = () => rows().map(combatantName);

  async function startCombat(render = renderAt) {
    const user = setupUser();
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
  const campaign = millbrook;
  const sceneUrl = `/c/${campaign.id}/s/scene-the-mill-road`;

  const rows = () =>
    within(screen.getByRole('list', { name: 'Combat order' })).getAllByRole('listitem');
  const names = () => rows().map(combatantName);

  /** Starts the combat and taps Done, so the screen is in normal (damage) mode. */
  async function startCombat(render = renderAt) {
    const user = setupUser();
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
  const campaign = millbrook;
  const roadUrl = `/c/${campaign.id}/s/scene-the-mill-road`;

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
    const user = setupUser();
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
    const user = setupUser();
    const { unmount } = renderAt(roadUrl);
    const before = await playCombat(user);
    unmount();
    clearActiveCombats(); // refresh: only what was saved survives

    renderAt(`/c/${campaign.id}/combat`);

    expect(combatOrder()).toEqual(before);
  });

  it('restores the combat after closing and reopening the app', async () => {
    const user = setupUser();
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

describe('DC-114 — Eigen Player Characters in combat', () => {
  const sceneUrl = '/c/imported-shadows-over-millbrook/s/scene-the-mill-road';
  const players = () => combatOrder().filter((row) => row.endsWith(' · PC'));

  async function startCombatAt(url: string) {
    const user = setupUser();
    const view = renderAt(url);
    await user.click(screen.getByRole('button', { name: 'Start combat' }));
    return view;
  }

  it("starts combat with the DM's own players, after the enemies", async () => {
    savePlayers('imported-shadows-over-millbrook', [
      { id: 'pc-1', name: 'Mira' },
      { id: 'pc-2', name: 'Tok' },
    ]);

    await startCombatAt(sceneUrl);

    expect(combatOrder().slice(-2)).toEqual(['Mira · PC', 'Tok · PC']);
    expect(players()).toHaveLength(2);
  });

  it('keeps the players of a running combat when the list changes (D15)', async () => {
    const { unmount } = await startCombatAt(sceneUrl);
    unmount();

    savePlayers('imported-shadows-over-millbrook', [{ id: 'pc-1', name: 'Mira' }]);
    renderAt('/c/imported-shadows-over-millbrook/combat');

    expect(players()).toEqual(['Alice · PC', 'Bob · PC', 'Cora · PC', 'Dain · PC']);
  });

  it('starts combat with only the enemies when the campaign has no players', async () => {
    savePlayers('imported-shadows-over-millbrook', []);

    await startCombatAt(sceneUrl);

    expect(players()).toEqual([]);
    expect(combatOrder()).toHaveLength(4);
  });
});

describe('DC-072 — Combat beëindigen', () => {
  const campaign = millbrook;
  const encounter = campaign.encounters[0]!;
  const combatUrl = `/c/${campaign.id}/combat`;
  const question = 'End the combat against Ambush on the mill road?';

  const expectHeading = (name: string) =>
    expect(screen.getByRole('heading', { level: 1, name })).toBeInTheDocument();

  /** Taps End combat at the bottom, then End combat in the question panel. */
  async function endCombat(user: ReturnType<typeof setupUser>, name = question) {
    await user.click(screen.getByRole('button', { name: 'End combat' }));
    await user.click(
      within(screen.getByRole('region', { name })).getByRole('button', { name: 'End combat' }),
    );
  }

  /** A combat runs on the Mill Road; the combat screen is open. */
  function openCombat(sceneId = 'scene-the-mill-road') {
    setActiveCombat(startCombat(campaign, sceneId, encounter));
    renderAt(combatUrl);
    return setupUser();
  }

  it('asks first, in a panel at the top, without ending the combat yet (D63, D64)', async () => {
    const user = openCombat();

    await user.click(screen.getByRole('button', { name: 'End combat' }));

    const panel = screen.getByRole('region', { name: question });
    expect(panel).toHaveTextContent('HP and order are lost.');
    expect(screen.getByRole('heading', { name: question })).toHaveFocus();
    expect(combatOrder()).toHaveLength(8);
  });

  it('changes nothing on Cancel, and gives focus back to End combat', async () => {
    const user = openCombat();
    const before = combatOrder();

    await user.click(screen.getByRole('button', { name: 'End combat' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('region', { name: question })).not.toBeInTheDocument();
    expect(combatOrder()).toEqual(before);
    expect(screen.getByRole('button', { name: 'End combat' })).toHaveFocus();
  });

  it('ends the combat and goes to its scene, where the encounter can start again (D65)', async () => {
    const user = openCombat();

    await endCombat(user);

    expectHeading('The Mill Road');
    expect(screen.getByRole('button', { name: 'Start combat' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Resume combat/ })).not.toBeInTheDocument();
  });

  it('shows Combat as unavailable in Quick Access afterwards, also after a refresh', async () => {
    const user = openCombat();
    await endCombat(user);
    clearActiveCombats(); // refresh

    renderAt(`/c/${campaign.id}/quick`);
    expect(screen.getByRole('button', { name: /Combat/ })).toBeDisabled();
    renderAt(combatUrl);
    expectHeading('No active combat');
  });

  it('goes back to the scene it was started from, also after a mode change: no double entry', async () => {
    const user = setupUser();
    renderWithBrowserBack('/');
    await user.click(screen.getByRole('link', { name: new RegExp(campaign.name) }));
    await user.click(
      within(screen.getByRole('navigation', { name: 'Scenes' })).getByRole('link', {
        name: /Next/,
      }),
    );
    await user.click(screen.getByRole('button', { name: 'Start combat' }));
    await user.click(screen.getByRole('button', { name: 'Done' })); // reorder → normal
    await endCombat(user);
    expectHeading('The Mill Road');

    await pressBrowserBack();

    expectHeading('Arrival in Millbrook');
  });

  it('replaces the combat screen when it was opened elsewhere: Back does not return to it', async () => {
    const user = setupUser();
    setActiveCombat(startCombat(campaign, 'scene-the-mill-road', encounter));
    renderWithBrowserBack(`/c/${campaign.id}/s/scene-arrival-in-millbrook`);
    await user.click(screen.getByRole('link', { name: 'Quick' }));
    await user.click(screen.getByRole('link', { name: /^Combat/ }));
    await endCombat(user);
    expectHeading('The Mill Road');

    await pressBrowserBack();

    expectHeading('Arrival in Millbrook');
  });

  it("goes to the campaign when the combat's scene no longer exists (D65)", async () => {
    const user = openCombat('scene-removed');

    await endCombat(user);

    expectHeading('Arrival in Millbrook');
  });

  it('asks about "the current combat" when its encounter is unknown (D67)', async () => {
    setActiveCombat({
      ...startCombat(campaign, 'scene-the-mill-road', encounter),
      encounterId: null,
    });
    renderAt(combatUrl);

    await setupUser().click(screen.getByRole('button', { name: 'End combat' }));

    expect(screen.getByRole('region', { name: 'End the current combat?' })).toBeInTheDocument();
  });
});
