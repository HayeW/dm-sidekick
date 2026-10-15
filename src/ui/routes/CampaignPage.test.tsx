import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { getCampaign, getCampaigns } from '../../data/campaigns';
import { renderAt, setupUser } from '../../test/app';

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

describe('DC-003 / DC-080 — Laatst gebruikte scene onthouden', () => {
  const campaign = getCampaign('shadows-over-millbrook')!;
  const [first, second, last] = campaign.scenes;

  function expectScene(title: string) {
    expect(screen.getByRole('heading', { level: 1, name: title })).toBeInTheDocument();
  }

  it('reopens the campaign on the last used scene', async () => {
    const user = setupUser();
    const { unmount } = renderAt(`/c/${campaign.id}/s/${last!.id}`);
    unmount();

    renderAt('/');
    await user.click(screen.getByRole('link', { name: new RegExp(campaign.name) }));

    expectScene(last!.title);
  });

  it('remembers the scene reached with Next, also after a refresh', async () => {
    const user = setupUser();
    const { unmount } = renderAt(`/c/${campaign.id}`);
    await user.click(
      within(screen.getByRole('navigation', { name: 'Scenes' })).getByRole('link', {
        name: /Next/,
      }),
    );
    expectScene(second!.title);
    unmount(); // closing the app / refreshing

    renderAt(`/c/${campaign.id}`);

    expectScene(second!.title);
  });

  it('remembers the scene per campaign', () => {
    const other = getCampaign('the-sunken-bell')!;
    renderAt(`/c/${campaign.id}/s/${last!.id}`).unmount();
    renderAt(`/c/${other.id}/s/${other.scenes[0]!.id}`).unmount();

    renderAt(`/c/${campaign.id}`);

    expectScene(last!.title);
  });

  it('opens the first scene when the saved scene no longer exists', () => {
    localStorage.setItem(
      `dm-sidekick:v1:session:${campaign.id}`,
      JSON.stringify({ campaignId: campaign.id, currentSceneId: 'deleted-scene' }),
    );

    renderAt(`/c/${campaign.id}`);

    expectScene(first!.title);
  });
});
