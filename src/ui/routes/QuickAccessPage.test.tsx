import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { setActiveCombat } from '../../data/combats';
import { startCombat } from '../../domain/combat';
import {
  combatOrder,
  pressBrowserBack,
  renderAt,
  renderWithBrowserBack,
  setupUser,
} from '../../test/app';
import { importTestCampaigns, millbrook } from '../../test/testCampaigns';

beforeEach(importTestCampaigns);

describe('DC-020 — Quick Access openen', () => {
  const campaign = millbrook;
  const roadUrl = `/c/${campaign.id}/s/scene-the-mill-road`;
  const quickUrl = `/c/${campaign.id}/quick`;

  const expectHeading = (name: string) =>
    expect(screen.getByRole('heading', { level: 1, name })).toBeInTheDocument();

  it('opens from the scene with one tap (D22)', async () => {
    const user = setupUser();
    renderAt(roadUrl);

    await user.click(screen.getByRole('link', { name: 'Quick' }));

    expectHeading('Quick Access');
  });

  it('keeps the back link to the campaign list next to it', () => {
    renderAt(roadUrl);

    expect(screen.getByRole('link', { name: `‹ ${campaign.name}` })).toHaveAttribute('href', '/');
  });

  it('returns to the scene with Close', async () => {
    const user = setupUser();
    renderAt(roadUrl);
    await user.click(screen.getByRole('link', { name: 'Quick' }));

    await user.click(screen.getByRole('button', { name: 'Close' }));

    expectHeading('The Mill Road');
  });

  it('goes back with Close, adding no history entry, so Back keeps working (D12)', async () => {
    const user = setupUser();
    renderWithBrowserBack('/');
    await user.click(screen.getByRole('link', { name: new RegExp(campaign.name) }));
    await user.click(screen.getByRole('link', { name: 'Quick' }));
    await user.click(screen.getByRole('button', { name: 'Close' }));

    await pressBrowserBack();

    expectHeading('Campaigns');
  });

  it('returns to the scene with the phone’s Back (D23)', async () => {
    const user = setupUser();
    renderWithBrowserBack(roadUrl);
    await user.click(screen.getByRole('link', { name: 'Quick' }));

    await pressBrowserBack();

    expectHeading('The Mill Road');
  });

  // A real browser refresh can't be simulated here; checked by hand in the browser.
  it('has its own URL, so a refresh keeps it open (D23)', () => {
    renderAt(quickUrl);

    expectHeading('Quick Access');
  });

  it('opens the current scene with Close when opened directly, with nothing to go back to', async () => {
    const user = setupUser();
    renderAt(roadUrl).unmount(); // makes The Mill Road the current scene (DC-003)
    renderAt(quickUrl);

    await user.click(screen.getByRole('button', { name: 'Close' }));

    expectHeading('The Mill Road');
  });

  it('shows "not found" for an unknown campaign', () => {
    renderAt('/c/does-not-exist/quick');

    expectHeading('Campaign not found');
    expect(screen.getByRole('link', { name: 'Back to campaigns' })).toHaveAttribute('href', '/');
  });
});

describe('DC-020 — Quick Access openen vanaf beschrijving en combat', () => {
  const campaign = millbrook;
  const roadUrl = `/c/${campaign.id}/s/scene-the-mill-road`;

  const expectHeading = (name: string) =>
    expect(screen.getByRole('heading', { level: 1, name })).toBeInTheDocument();

  it('opens from a description and returns to it with Close', async () => {
    const user = setupUser();
    renderAt(roadUrl);
    await user.click(screen.getByRole('link', { name: /^Descriptions/ }));

    await user.click(screen.getByRole('link', { name: 'Quick' }));
    expectHeading('Quick Access');
    await user.click(screen.getByRole('button', { name: 'Close' }));

    expectHeading('Intro');
  });

  it('still returns from the description to the scene in one tap afterwards (D11)', async () => {
    const user = setupUser();
    renderWithBrowserBack('/');
    await user.click(screen.getByRole('link', { name: new RegExp(campaign.name) })); // first scene
    await user.click(screen.getByRole('link', { name: /^Descriptions/ }));
    await user.click(screen.getByRole('link', { name: 'Quick' }));
    await pressBrowserBack();

    await user.click(screen.getByRole('button', { name: '‹ Arrival in Millbrook' }));
    expectHeading('Arrival in Millbrook');

    // The description went back in history rather than adding the scene again, so one more
    // Back leaves the campaign.
    await pressBrowserBack();
    expectHeading('Campaigns');
  });

  it('opens from combat and returns to the same combat state', async () => {
    const user = setupUser();
    renderAt(roadUrl);
    await user.click(screen.getByRole('button', { name: 'Start combat' }));
    await user.click(screen.getByRole('button', { name: 'Done' }));
    await user.click(screen.getByRole('button', { name: '5 damage to Goblin Boss' }));
    const before = combatOrder();

    await user.click(screen.getByRole('link', { name: 'Quick' }));
    expectHeading('Quick Access');
    await user.click(screen.getByRole('button', { name: 'Close' }));

    expectHeading('Combat');
    expect(combatOrder()).toEqual(before);
  });

  it('returns to combat in reorder mode with the phone’s Back', async () => {
    const user = setupUser();
    renderWithBrowserBack(roadUrl);
    await user.click(screen.getByRole('button', { name: 'Start combat' })); // opens in reorder mode

    await user.click(screen.getByRole('link', { name: 'Quick' }));
    await pressBrowserBack();

    expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();
  });

  it('keeps the back link from combat to its scene', async () => {
    const user = setupUser();
    renderAt(roadUrl);
    await user.click(screen.getByRole('button', { name: 'Start combat' }));

    await user.click(screen.getByRole('link', { name: '‹ The Mill Road' }));

    expectHeading('The Mill Road');
  });
});

describe('DC-021 — Quick Access items tonen: Combat', () => {
  const campaign = millbrook;
  const roadUrl = `/c/${campaign.id}/s/scene-the-mill-road`;

  const expectHeading = (name: string) =>
    expect(screen.getByRole('heading', { level: 1, name })).toBeInTheDocument();
  /** The first Quick Access item: Combat, always in that place (D24, D27). */
  const combatItem = () =>
    within(screen.getByRole('list', { name: 'Quick Access items' })).getAllByRole('listitem')[0]!;

  /** Starts the combat, taps Done and goes back to the scene: a combat runs in the background. */
  async function startCombatAndLeave(user: ReturnType<typeof setupUser>) {
    await user.click(screen.getByRole('button', { name: 'Start combat' }));
    await user.click(screen.getByRole('button', { name: 'Done' }));
    await user.click(screen.getByRole('button', { name: '5 damage to Goblin Boss' }));
    const state = combatOrder();
    await user.click(screen.getByRole('link', { name: '‹ The Mill Road' }));
    return state;
  }

  it('shows Combat disabled when no combat is running (D27)', async () => {
    const user = setupUser();
    renderAt(roadUrl);
    await user.click(screen.getByRole('link', { name: 'Quick' }));

    const item = within(combatItem()).getByRole('button', { name: /Combat/ });
    expect(item).toBeDisabled();
    expect(item).toHaveTextContent('No active combat');
  });

  it('shows the encounter of the active combat', async () => {
    const user = setupUser();
    renderAt(roadUrl);
    await startCombatAndLeave(user);

    await user.click(screen.getByRole('link', { name: 'Quick' }));

    expect(within(combatItem()).getByRole('link', { name: /Combat/ })).toHaveTextContent(
      'Ambush on the mill road',
    );
  });

  it('returns to the same combat from another scene in two taps, in normal mode', async () => {
    const user = setupUser();
    renderAt(roadUrl);
    const before = await startCombatAndLeave(user);
    await user.click(screen.getByRole('link', { name: /Next/ }));
    expectHeading('The Old Mill');

    await user.click(screen.getByRole('link', { name: 'Quick' }));
    await user.click(screen.getByRole('link', { name: /Combat/ }));

    expectHeading('Combat');
    expect(combatOrder()).toEqual(before);
    expect(screen.getByRole('button', { name: 'Reorder' })).toBeInTheDocument();
  });

  it('replaces Quick Access in the history: Back from combat returns to the scene (D23)', async () => {
    const user = setupUser();
    renderWithBrowserBack(roadUrl);
    await startCombatAndLeave(user);
    await user.click(screen.getByRole('link', { name: /Next/ }));
    await user.click(screen.getByRole('link', { name: 'Quick' }));
    await user.click(screen.getByRole('link', { name: /Combat/ }));

    await pressBrowserBack();

    expectHeading('The Old Mill');
  });

  it('just closes when opened from the combat itself, leaving no extra history entry', async () => {
    const user = setupUser();
    renderWithBrowserBack(roadUrl);
    await user.click(screen.getByRole('button', { name: 'Start combat' })); // reorder mode
    await user.click(screen.getByRole('link', { name: 'Quick' }));

    await user.click(screen.getByRole('button', { name: /Combat/ }));
    expectHeading('Combat');
    expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();

    await pressBrowserBack();
    expectHeading('The Mill Road');
  });

  it('shows "In progress" for a combat without a known encounter', async () => {
    const user = setupUser();
    const encounter = campaign.encounters[0]!;
    setActiveCombat({
      ...startCombat(campaign, 'scene-the-mill-road', encounter),
      encounterId: null,
    });
    renderAt(roadUrl);

    await user.click(screen.getByRole('link', { name: 'Quick' }));

    expect(within(combatItem()).getByRole('link', { name: /Combat/ })).toHaveTextContent(
      'In progress',
    );
  });

  it('keeps Quick Access in the history when it was opened directly, so Back stays in the app', async () => {
    const user = setupUser();
    setActiveCombat(startCombat(campaign, 'scene-the-mill-road', campaign.encounters[0]!));
    renderWithBrowserBack(`/c/${campaign.id}/quick`);

    await user.click(screen.getByRole('link', { name: /Combat/ }));
    expectHeading('Combat');
    await pressBrowserBack();

    expectHeading('Quick Access');
  });
});
