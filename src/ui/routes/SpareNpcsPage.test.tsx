import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { getSpareNpcs } from '../../data/spareNpcs';
import { pressBrowserBack, renderAt, renderWithBrowserBack, setupUser } from '../../test/app';
import { importTestCampaigns } from '../../test/testCampaigns';

beforeEach(importTestCampaigns);

const roadUrl = '/c/imported-shadows-over-millbrook/s/scene-the-mill-road';
const harbourUrl = '/c/imported-the-sunken-bell/s/scene-the-harbour-at-low-tide';

const expectHeading = (name: string) =>
  expect(screen.getByRole('heading', { level: 1, name })).toBeInTheDocument();
const quickItems = () => screen.getByRole('list', { name: 'Quick Access items' });
const rows = () =>
  within(screen.getByRole('list', { name: 'Spare NPCs' })).getAllByRole('listitem');

async function openSpareNpcs(user: ReturnType<typeof setupUser>) {
  await user.click(screen.getByRole('link', { name: 'Quick' }));
  await user.click(within(quickItems()).getByRole('link', { name: /Spare NPCs/ }));
}

describe('DC-090 — Kant-en-klare NPC’s bekijken', () => {
  it('shows Spare NPCs in Quick Access directly below Campaign NPCs, with the number (D34)', async () => {
    const user = setupUser();
    renderAt(roadUrl);
    await user.click(screen.getByRole('link', { name: 'Quick' }));

    const items = within(quickItems()).getAllByRole('listitem');
    expect(items[1]).toHaveTextContent('Campaign NPCs');
    expect(items[2]).toHaveTextContent('Spare NPCs');
    expect(items[2]).toHaveTextContent(`${getSpareNpcs().length} NPCs`);
  });

  it('opens the list from a scene in two taps', async () => {
    const user = setupUser();
    renderAt(roadUrl);

    await openSpareNpcs(user);

    expectHeading('Spare NPCs');
  });

  it('shows every spare NPC with name, race and description, in data order (D31, D33)', async () => {
    const user = setupUser();
    renderAt(roadUrl);
    await openSpareNpcs(user);

    const shown = rows();
    expect(shown).toHaveLength(getSpareNpcs().length);
    getSpareNpcs().forEach((npc, index) => {
      const row = shown[index]!;
      expect(row).toHaveTextContent(npc.name);
      expect(row).toHaveTextContent(npc.race);
      expect(row).toHaveTextContent(npc.description);
    });
  });

  it('has nothing to tap in the list: everything is on the row (D33)', async () => {
    const user = setupUser();
    renderAt(roadUrl);
    await openSpareNpcs(user);

    for (const row of rows()) {
      expect(within(row).queryByRole('link')).not.toBeInTheDocument();
      expect(within(row).queryByRole('button')).not.toBeInTheDocument();
    }
  });

  it('shows the same selection in every campaign', async () => {
    const user = setupUser();
    renderAt(harbourUrl);
    await openSpareNpcs(user);

    expect(rows()).toHaveLength(getSpareNpcs().length);
    expect(rows()[0]).toHaveTextContent(getSpareNpcs()[0]!.name);
  });

  it('returns to the scene with Back, or with the back control', async () => {
    const user = setupUser();
    renderWithBrowserBack(roadUrl);
    await openSpareNpcs(user);
    await pressBrowserBack();
    expectHeading('The Mill Road');

    await openSpareNpcs(user);
    await user.click(screen.getByRole('button', { name: '‹ Back' }));
    expectHeading('The Mill Road');
  });

  it('just closes Quick Access when opened from the Spare NPCs screen (D23)', async () => {
    const user = setupUser();
    renderWithBrowserBack(roadUrl);
    await openSpareNpcs(user);
    await user.click(screen.getByRole('link', { name: 'Quick' }));

    await user.click(within(quickItems()).getByRole('button', { name: /Spare NPCs/ }));
    expectHeading('Spare NPCs');
    await pressBrowserBack();

    expectHeading('The Mill Road');
  });

  it('makes every NPC a heading with name and race, read apart (D33)', async () => {
    const user = setupUser();
    renderAt(roadUrl);
    await openSpareNpcs(user);

    const first = getSpareNpcs()[0]!;
    expect(
      screen.getByRole('heading', { level: 2, name: `${first.name}, ${first.race}` }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(getSpareNpcs().length);
  });

  it('goes to the campaign when opened directly, with nothing to go back to (D35)', async () => {
    const user = setupUser();
    renderAt('/c/imported-shadows-over-millbrook/spare-npcs');

    await user.click(screen.getByRole('button', { name: '‹ Back' }));

    expectHeading('Arrival in Millbrook');
  });

  it('shows "Campaign not found" for an unknown campaign', () => {
    renderAt('/c/does-not-exist/spare-npcs');

    expectHeading('Campaign not found');
  });
});
