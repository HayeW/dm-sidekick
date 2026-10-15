import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { pressBrowserBack, renderAt, renderWithBrowserBack, setupUser } from '../../test/app';
import { importTestCampaigns, millbrook } from '../../test/testCampaigns';

beforeEach(importTestCampaigns);

const campaign = millbrook;
const roadUrl = `/c/${campaign.id}/s/scene-the-mill-road`;

const expectHeading = (name: string) =>
  expect(screen.getByRole('heading', { level: 1, name })).toBeInTheDocument();
const notesTile = () => screen.getByRole('link', { name: /^DM Notes/ });

describe('DC-014 — Notes tile openen', () => {
  it('opens the scene’s DM notes in full with one tap', async () => {
    const user = setupUser();
    renderAt(roadUrl);

    await user.click(notesTile());

    expectHeading('DM Notes');
    expect(screen.getByText(/The boss carries the miller's key\./)).toBeInTheDocument();
  });

  it('returns to the scene in one tap, with Back or the back control', async () => {
    const user = setupUser();
    renderWithBrowserBack(roadUrl);
    await user.click(notesTile());
    await user.click(screen.getByRole('button', { name: '‹ The Mill Road' }));
    expectHeading('The Mill Road');

    await user.click(notesTile());
    await pressBrowserBack();
    expectHeading('The Mill Road');
  });

  it('goes back in history rather than adding the scene again (D11)', async () => {
    const user = setupUser();
    renderWithBrowserBack('/');
    await user.click(screen.getByRole('link', { name: new RegExp(campaign.name) })); // first scene
    await user.click(notesTile());

    await user.click(screen.getByRole('button', { name: '‹ Arrival in Millbrook' }));
    await pressBrowserBack();

    expectHeading('Campaigns');
  });

  it('opens the scene when opened directly, with nothing to go back to', async () => {
    const user = setupUser();
    renderAt(`${roadUrl}/b/scene-the-mill-road-tile-3`);

    await user.click(screen.getByRole('button', { name: '‹ The Mill Road' }));

    expectHeading('The Mill Road');
  });

  it('offers Quick Access on the notes screen (D22)', () => {
    renderAt(`${roadUrl}/b/scene-the-mill-road-tile-3`);

    expect(screen.getByRole('link', { name: 'Quick' })).toBeInTheDocument();
  });

  it('does not open notes on a description URL', () => {
    renderAt(`${roadUrl}/b/scene-the-mill-road-tile-3/d/scene-the-mill-road-tile-1-1`);

    expectHeading('Tile not found');
  });
});

describe('DC-021 — Quick Access items tonen: Campaign Notes', () => {
  const quickItems = () => screen.getByRole('list', { name: 'Quick Access items' });
  const quickItem = (name: RegExp) => within(quickItems()).getByRole('link', { name });

  it('shows Campaign Notes with their number, as the last item (D24, D34)', async () => {
    const user = setupUser();
    renderAt(roadUrl);
    await user.click(screen.getByRole('link', { name: 'Quick' }));

    const items = within(quickItems()).getAllByRole('listitem');
    expect(items.map((item) => item.textContent)).toEqual([
      expect.stringContaining('Combat'),
      expect.stringContaining('Campaign NPCs'),
      expect.stringContaining('Spare NPCs'),
      expect.stringContaining('Player characters'),
      expect.stringContaining('Locations'),
      expect.stringContaining('Campaign Notes'),
    ]);
    expect(items[5]).toHaveTextContent('2 notes');
  });

  it('lists the campaign notes in campaign order, and opens one with one tap', async () => {
    const user = setupUser();
    renderAt(roadUrl);
    await user.click(screen.getByRole('link', { name: 'Quick' }));
    await user.click(quickItem(/Campaign Notes/));

    expectHeading('Campaign Notes');
    const rows = within(screen.getByRole('list', { name: 'Campaign Notes' })).getAllByRole('link');
    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringContaining('Millbrook'),
      expect.stringContaining('The missing miller'),
    ]);

    await user.click(rows[1]!);
    expectHeading('The missing miller');
    expect(screen.getByText(/hiding in the tunnels/)).toBeInTheDocument();
  });

  it('goes back from a note to the list, and from the list to where Quick Access was opened', async () => {
    const user = setupUser();
    renderWithBrowserBack(roadUrl);
    await user.click(screen.getByRole('link', { name: 'Quick' }));
    await user.click(quickItem(/Campaign Notes/));
    await user.click(screen.getByRole('link', { name: /The missing miller/ }));

    await pressBrowserBack();
    expectHeading('Campaign Notes');
    await user.click(screen.getByRole('button', { name: '‹ Back' }));
    expectHeading('The Mill Road');
  });

  it('goes to the notes list, then the campaign, when a note is opened directly', async () => {
    const user = setupUser();
    renderAt(`/c/${campaign.id}/notes/note-millbrook`);
    expectHeading('Millbrook');

    await user.click(screen.getByRole('button', { name: '‹ Back' }));
    expectHeading('Campaign Notes');
    await user.click(screen.getByRole('button', { name: '‹ Back' }));
    expectHeading('Arrival in Millbrook');
  });

  it('says so when the campaign has no notes', async () => {
    const user = setupUser();
    renderAt('/c/imported-the-sunken-bell/s/scene-the-harbour-at-low-tide');
    await user.click(screen.getByRole('link', { name: 'Quick' }));
    expect(quickItem(/Campaign Notes/)).toHaveTextContent('0 notes');

    await user.click(quickItem(/Campaign Notes/));

    expect(screen.getByText('No notes in this campaign yet.')).toBeInTheDocument();
  });

  it('shows "Note not found" for an unknown note', () => {
    renderAt(`/c/${campaign.id}/notes/note-gone`);
    expectHeading('Note not found');
    expect(screen.getByRole('link', { name: 'Back to notes' })).toHaveAttribute(
      'href',
      `/c/${campaign.id}/notes`,
    );
  });

  it('shows "Campaign not found" for an unknown campaign', () => {
    renderAt('/c/does-not-exist/notes');
    expectHeading('Campaign not found');
  });
});
