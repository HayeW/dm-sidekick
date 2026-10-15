import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { pressBrowserBack, renderAt, renderWithBrowserBack, setupUser } from '../../test/app';
import { importTestCampaigns, millbrook } from '../../test/testCampaigns';

beforeEach(importTestCampaigns);

const campaign = millbrook;
const arrivalUrl = `/c/${campaign.id}/s/scene-arrival-in-millbrook`;
const roadUrl = `/c/${campaign.id}/s/scene-the-mill-road`;

const expectHeading = (name: string) =>
  expect(screen.getByRole('heading', { level: 1, name })).toBeInTheDocument();
const npcTile = () => screen.getByRole('region', { name: 'NPCs' });

describe('DC-013 — NPC tile openen', () => {
  it('opens an NPC from the scene tile with one tap, with its description', async () => {
    const user = setupUser();
    renderAt(arrivalUrl);

    await user.click(within(npcTile()).getByRole('link', { name: 'Marta Hollow' }));

    expectHeading('Marta Hollow');
    expect(screen.getByText(/Innkeeper of the Crooked Kettle/)).toBeInTheDocument();
  });

  it('returns to the scene with Back, or with the back control', async () => {
    const user = setupUser();
    renderWithBrowserBack(arrivalUrl);
    await user.click(within(npcTile()).getByRole('link', { name: 'Old Fenn' }));
    await pressBrowserBack();
    expectHeading('Arrival in Millbrook');

    await user.click(within(npcTile()).getByRole('link', { name: 'Old Fenn' }));
    await user.click(screen.getByRole('button', { name: '‹ Back' }));
    expectHeading('Arrival in Millbrook');
  });

  it('goes to the NPC list, then the campaign, when opened directly with nothing to go back to', async () => {
    const user = setupUser();
    renderAt(`/c/${campaign.id}/npcs/npc-marta-hollow`);

    await user.click(screen.getByRole('button', { name: '‹ Back' }));
    expectHeading('NPCs');

    // The list is still the first screen in the history, so its back falls back again.
    await user.click(screen.getByRole('button', { name: '‹ Back' }));
    expectHeading('Arrival in Millbrook');
  });

  it('offers Quick Access on the NPC screen (D22)', () => {
    renderAt(`/c/${campaign.id}/npcs/npc-marta-hollow`);

    expect(screen.getByRole('link', { name: 'Quick' })).toBeInTheDocument();
  });

  it('shows "NPC not found" for an unknown NPC', () => {
    renderAt(`/c/${campaign.id}/npcs/npc-gone`);
    expectHeading('NPC not found');
    expect(screen.getByRole('link', { name: 'Back to NPCs' })).toHaveAttribute(
      'href',
      `/c/${campaign.id}/npcs`,
    );
  });

  it('shows "Campaign not found" for an unknown campaign', () => {
    renderAt('/c/does-not-exist/npcs/npc-marta-hollow');
    expectHeading('Campaign not found');
  });
});

describe('DC-021 — Quick Access items tonen: Campaign NPCs', () => {
  const quickItem = (name: RegExp) =>
    within(screen.getByRole('list', { name: 'Quick Access items' })).getByRole('link', { name });

  it('shows Campaign NPCs with their number, after Combat (D24)', async () => {
    const user = setupUser();
    renderAt(roadUrl);
    await user.click(screen.getByRole('link', { name: 'Quick' }));

    const items = within(screen.getByRole('list', { name: 'Quick Access items' })).getAllByRole(
      'listitem',
    );
    expect(items[1]).toHaveTextContent('Campaign NPCs');
    expect(items[1]).toHaveTextContent('2 NPCs');
  });

  it('lists the campaign’s NPCs in campaign order, and opens one with one tap', async () => {
    const user = setupUser();
    renderAt(roadUrl);
    await user.click(screen.getByRole('link', { name: 'Quick' }));
    await user.click(quickItem(/Campaign NPCs/));

    expectHeading('NPCs');
    const rows = within(screen.getByRole('list', { name: 'NPCs' })).getAllByRole('link');
    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringContaining('Marta Hollow'),
      expect.stringContaining('Old Fenn'),
    ]);

    await user.click(rows[1]!);
    expectHeading('Old Fenn');
  });

  it('goes back from an NPC to the list, and from the list to where Quick Access was opened', async () => {
    const user = setupUser();
    renderWithBrowserBack(roadUrl);
    await user.click(screen.getByRole('link', { name: 'Quick' }));
    await user.click(quickItem(/Campaign NPCs/));
    await user.click(screen.getByRole('link', { name: /Marta Hollow/ }));

    await pressBrowserBack();
    expectHeading('NPCs');
    await user.click(screen.getByRole('button', { name: '‹ Back' }));
    expectHeading('The Mill Road');
  });

  it('just closes Quick Access when opened from the NPC list', async () => {
    const user = setupUser();
    renderWithBrowserBack(roadUrl);
    await user.click(screen.getByRole('link', { name: 'Quick' }));
    await user.click(quickItem(/Campaign NPCs/));
    await user.click(screen.getByRole('link', { name: 'Quick' }));

    await user.click(screen.getByRole('button', { name: /Campaign NPCs/ }));
    expectHeading('NPCs');
    await pressBrowserBack();
    expectHeading('The Mill Road');
  });

  it('says so when the campaign has no NPCs', async () => {
    const user = setupUser();
    renderAt('/c/imported-the-sunken-bell/s/scene-the-harbour-at-low-tide');
    await user.click(screen.getByRole('link', { name: 'Quick' }));
    expect(quickItem(/Campaign NPCs/)).toHaveTextContent('0 NPCs');

    await user.click(quickItem(/Campaign NPCs/));

    expect(screen.getByText('No NPCs in this campaign yet.')).toBeInTheDocument();
  });

  it('shows "Campaign not found" for an unknown campaign', () => {
    renderAt('/c/does-not-exist/npcs');
    expectHeading('Campaign not found');
  });
});
