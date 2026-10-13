import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { getCampaign } from '../../data/campaigns';
import { pressBrowserBack, renderAt, renderWithBrowserBack, setupUser } from '../../test/app';

const campaign = getCampaign('shadows-over-millbrook')!;
const arrivalUrl = `/c/${campaign.id}/s/scene-arrival`;
const roadUrl = `/c/${campaign.id}/s/scene-mill-road`;

const expectHeading = (name: string) =>
  expect(screen.getByRole('heading', { level: 1, name })).toBeInTheDocument();
const locationTile = () => screen.getByRole('link', { name: /^Location/ });

describe('DC-012 — Location tile openen', () => {
  it('opens the location from the scene tile with one tap, with its description', async () => {
    const user = setupUser();
    renderAt(arrivalUrl);

    await user.click(locationTile());

    expectHeading('The Crooked Kettle');
    expect(screen.getByText(/Low-beamed inn, smoky hearth/)).toBeInTheDocument();
  });

  it('returns to the scene with Back, or with the back control', async () => {
    const user = setupUser();
    renderWithBrowserBack(arrivalUrl);
    await user.click(locationTile());
    await pressBrowserBack();
    expectHeading('Arrival in Millbrook');

    await user.click(locationTile());
    await user.click(screen.getByRole('button', { name: '‹ Back' }));
    expectHeading('Arrival in Millbrook');
  });

  it('goes to the locations list, then the campaign, when opened directly', async () => {
    const user = setupUser();
    renderAt(`/c/${campaign.id}/locations/loc-mill-cellar`);
    expectHeading('Mill cellar');

    await user.click(screen.getByRole('button', { name: '‹ Back' }));
    expectHeading('Locations');
    await user.click(screen.getByRole('button', { name: '‹ Back' }));
    expectHeading('Arrival in Millbrook');
  });

  it('shows "Location not found" for an unknown location', () => {
    renderAt(`/c/${campaign.id}/locations/loc-gone`);

    expectHeading('Location not found');
    expect(screen.getByRole('link', { name: 'Back to locations' })).toHaveAttribute(
      'href',
      `/c/${campaign.id}/locations`,
    );
  });

  it('shows "Campaign not found" for an unknown campaign', () => {
    renderAt('/c/does-not-exist/locations/loc-mill-cellar');
    expectHeading('Campaign not found');
  });
});

describe('DC-021 — Quick Access items tonen: Locations', () => {
  const quickItems = () => screen.getByRole('list', { name: 'Quick Access items' });
  const quickItem = (name: RegExp) => within(quickItems()).getByRole('link', { name });

  it('shows Locations with their number, after Campaign NPCs (D24)', async () => {
    const user = setupUser();
    renderAt(roadUrl);
    await user.click(screen.getByRole('link', { name: 'Quick' }));

    const items = within(quickItems()).getAllByRole('listitem');
    expect(items[2]).toHaveTextContent('Locations');
    expect(items[2]).toHaveTextContent('2 locations');
  });

  it('lists the campaign’s locations in campaign order, and opens one with one tap', async () => {
    const user = setupUser();
    renderAt(roadUrl);
    await user.click(screen.getByRole('link', { name: 'Quick' }));
    await user.click(quickItem(/^Locations/));

    expectHeading('Locations');
    const rows = within(screen.getByRole('list', { name: 'Locations' })).getAllByRole('link');
    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringContaining('The Crooked Kettle'),
      expect.stringContaining('Mill cellar'),
    ]);

    await user.click(rows[1]!);
    expectHeading('Mill cellar');
  });

  it('goes back from a location to the list, and from the list to where Quick Access was opened', async () => {
    const user = setupUser();
    renderWithBrowserBack(roadUrl);
    await user.click(screen.getByRole('link', { name: 'Quick' }));
    await user.click(quickItem(/^Locations/));
    await user.click(screen.getByRole('link', { name: /Mill cellar/ }));

    await pressBrowserBack();
    expectHeading('Locations');
    await user.click(screen.getByRole('button', { name: '‹ Back' }));
    expectHeading('The Mill Road');
  });

  it('says so when the campaign has no locations', async () => {
    const user = setupUser();
    renderAt('/c/the-sunken-bell/s/scene-harbour');
    await user.click(screen.getByRole('link', { name: 'Quick' }));
    expect(quickItem(/^Locations/)).toHaveTextContent('0 locations');

    await user.click(quickItem(/^Locations/));

    expect(screen.getByText('No locations in this campaign yet.')).toBeInTheDocument();
  });
});
