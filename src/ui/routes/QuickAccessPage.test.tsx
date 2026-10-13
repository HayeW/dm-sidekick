import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { getCampaign } from '../../data/campaigns';
import { pressBrowserBack, renderAt, renderWithBrowserBack, setupUser } from '../../test/app';

describe('DC-020 — Quick Access openen', () => {
  const campaign = getCampaign('shadows-over-millbrook')!;
  const roadUrl = `/c/${campaign.id}/s/scene-mill-road`;
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
