import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { getCampaigns } from '../../data/campaigns';
import { saveImportedCampaign } from '../../data/importedCampaigns';
import { renderAt, setupUser } from '../../test/app';

describe('DC-001 — Campaigns tonen', () => {
  it('shows a list with the name of every campaign', () => {
    renderAt('/');

    expect(screen.getByRole('heading', { name: 'Campaigns' })).toBeInTheDocument();
    for (const campaign of getCampaigns()) {
      expect(screen.getByRole('link', { name: new RegExp(campaign.name) })).toBeInTheDocument();
    }
  });

  it('opens the selected campaign with one tap', async () => {
    const user = setupUser();
    const campaign = getCampaigns()[0]!;
    renderAt('/');

    await user.click(screen.getByRole('link', { name: new RegExp(campaign.name) }));

    expect(
      screen.getByRole('heading', { level: 1, name: campaign.scenes[0]!.title }),
    ).toBeInTheDocument();
  });

  it('shows an imported campaign after the demo campaigns, and opens its first scene', async () => {
    const user = setupUser();
    saveImportedCampaign(
      ['# Hollowmere', '## Scene: The Bridge', '### DM notes', 'Trolls.'].join('\n'),
    );
    renderAt('/');

    const names = screen.getAllByRole('link').map((link) => link.textContent);
    expect(names.at(-1)).toMatch(/^Hollowmere/);
    await user.click(screen.getByRole('link', { name: /Hollowmere/ }));

    expect(screen.getByRole('heading', { level: 1, name: 'The Bridge' })).toBeInTheDocument();
  });

  it('shows "not found" for an unknown campaign', () => {
    renderAt('/c/does-not-exist');

    expect(screen.getByRole('heading', { name: 'Campaign not found' })).toBeInTheDocument();
  });
});
