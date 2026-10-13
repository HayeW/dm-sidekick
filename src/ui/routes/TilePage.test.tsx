import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { getCampaign } from '../../data/campaigns';
import { pressBrowserBack, renderAt, renderWithBrowserBack, setupUser } from '../../test/app';

describe('DC-011 — Descriptions tile openen', () => {
  const campaign = getCampaign('shadows-over-millbrook')!;
  const scene = campaign.scenes[0]!;
  const block = scene.blocks.find((b) => b.type === 'descriptions')!;
  const [intro, inn] = block.type === 'descriptions' ? block.descriptions : [];
  const sceneUrl = `/c/${campaign.id}/s/${scene.id}`;

  async function openTile() {
    const user = setupUser();
    renderAt(sceneUrl);
    await user.click(screen.getByRole('link', { name: /^Descriptions/ }));
    return user;
  }

  function expectDescription(title: string, text: string) {
    expect(screen.getByRole('heading', { level: 1, name: title })).toBeInTheDocument();
    expect(screen.getByText(text)).toBeInTheDocument();
  }

  it('opens the first description with one tap', async () => {
    await openTile();

    expectDescription(intro!.title, intro!.text);
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
  });

  it('goes to the next and previous description with one tap each', async () => {
    const user = await openTile();

    await user.click(screen.getByRole('link', { name: /Next/ }));
    expectDescription(inn!.title, inn!.text);
    expect(screen.getByText('2 / 2')).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: /Previous/ }));
    expectDescription(intro!.title, intro!.text);
  });

  it('disables Previous at the first and Next at the last description', async () => {
    const user = await openTile();
    expect(screen.getByRole('button', { name: /Previous/ })).toBeDisabled();

    await user.click(screen.getByRole('link', { name: /Next/ }));
    expect(screen.getByRole('button', { name: /Next/ })).toBeDisabled();
  });

  it('hides Previous/Next when there is only one description', () => {
    const mill = campaign.scenes[2]!;
    renderAt(`/c/${campaign.id}/s/${mill.id}/b/${mill.blocks[0]!.id}`);

    expect(screen.queryByRole('navigation', { name: 'Descriptions' })).not.toBeInTheDocument();
  });

  it('returns to the scene with one tap, also after moving between descriptions', async () => {
    const user = await openTile();
    await user.click(screen.getByRole('link', { name: /Next/ }));

    await user.click(screen.getByRole('button', { name: new RegExp(scene.title) }));

    expect(screen.getByRole('heading', { level: 1, name: scene.title })).toBeInTheDocument();
  });

  it('leaves no extra history entries: after Back, the browser back goes to the campaign list', async () => {
    const user = setupUser();
    renderWithBrowserBack('/');
    await user.click(screen.getByRole('link', { name: new RegExp(campaign.name) }));
    await user.click(screen.getByRole('link', { name: /^Descriptions/ }));
    await user.click(screen.getByRole('link', { name: /Next/ }));
    await user.click(screen.getByRole('button', { name: new RegExp(scene.title) }));
    expect(screen.getByRole('heading', { level: 1, name: scene.title })).toBeInTheDocument();

    await pressBrowserBack();

    expect(screen.getByRole('heading', { level: 1, name: 'Campaigns' })).toBeInTheDocument();
  });

  it('starts the next description at the top of the page', async () => {
    const user = await openTile();
    vi.mocked(window.scrollTo).mockClear();

    await user.click(screen.getByRole('link', { name: /Next/ }));

    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
  });

  it('returns to the scene when a description was opened directly (deep link)', async () => {
    const user = setupUser();
    renderAt(`${sceneUrl}/b/${block.id}/d/${inn!.id}`);
    expectDescription(inn!.title, inn!.text);

    await user.click(screen.getByRole('button', { name: new RegExp(scene.title) }));

    expect(screen.getByRole('heading', { level: 1, name: scene.title })).toBeInTheDocument();
  });

  it('shows "not found" for an unknown description, with a way back to its scene', () => {
    renderAt(`${sceneUrl}/b/${block.id}/d/does-not-exist`);

    expect(screen.getByRole('heading', { name: 'Tile not found' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute('href', sceneUrl);
  });

  it('does not make other tiles openable', () => {
    renderAt(sceneUrl);

    expect(screen.queryAllByRole('link', { name: /^(Location|NPCs|DM Notes)/ })).toHaveLength(0);
  });
});

describe('DC-017 — Swipen tussen beschrijvingen', () => {
  const campaign = getCampaign('shadows-over-millbrook')!;
  const scene = campaign.scenes[0]!;
  const block = scene.blocks.find((b) => b.type === 'descriptions')!;
  const [intro, inn] = block.type === 'descriptions' ? block.descriptions : [];
  const blockUrl = `/c/${campaign.id}/s/${scene.id}/b/${block.id}`;

  function swipe(dx: number, dy = 0) {
    const main = screen.getByRole('main');
    fireEvent.touchStart(main, { touches: [{ clientX: 200, clientY: 300 }] });
    fireEvent.touchEnd(main, { changedTouches: [{ clientX: 200 + dx, clientY: 300 + dy }] });
  }

  function expectTitle(title: string) {
    expect(screen.getByRole('heading', { level: 1, name: title })).toBeInTheDocument();
  }

  it('opens the next description when swiping left', () => {
    renderAt(blockUrl);

    swipe(-100);

    expectTitle(inn!.title);
  });

  it('opens the previous description when swiping right', () => {
    renderAt(`${blockUrl}/d/${inn!.id}`);

    swipe(100);

    expectTitle(intro!.title);
  });

  it('does nothing when swiping past the first or last description', () => {
    renderAt(blockUrl);
    swipe(100);
    expectTitle(intro!.title);

    swipe(-100);
    swipe(-100);
    expectTitle(inn!.title);
  });

  it('does not treat vertical scrolling as a swipe', () => {
    renderAt(blockUrl);

    swipe(-60, 250);

    expectTitle(intro!.title);
  });

  it('does not treat a two-finger gesture (zoom) as a swipe', () => {
    renderAt(blockUrl);
    const main = screen.getByRole('main');

    fireEvent.touchStart(main, {
      touches: [
        { clientX: 200, clientY: 300 },
        { clientX: 250, clientY: 350 },
      ],
    });
    fireEvent.touchEnd(main, { changedTouches: [{ clientX: 50, clientY: 300 }] });

    expectTitle(intro!.title);
  });

  it('does not treat panning while zoomed in as a swipe', () => {
    renderAt(blockUrl);
    Object.defineProperty(window, 'visualViewport', { value: { scale: 2 }, configurable: true });
    try {
      swipe(-100);
    } finally {
      Object.defineProperty(window, 'visualViewport', { value: undefined, configurable: true });
    }

    expectTitle(intro!.title);
  });

  it('starts the swiped-to description at the top of the page', () => {
    renderAt(blockUrl);
    vi.mocked(window.scrollTo).mockClear();

    swipe(-100);

    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
  });

  it('returns to the scene with one tap after swiping, without extra history entries', async () => {
    const user = setupUser();
    renderWithBrowserBack('/');
    await user.click(screen.getByRole('link', { name: new RegExp(campaign.name) }));
    await user.click(screen.getByRole('link', { name: /^Descriptions/ }));
    swipe(-100);
    expectTitle(inn!.title);

    await user.click(screen.getByRole('button', { name: new RegExp(scene.title) }));
    expectTitle(scene.title);

    await pressBrowserBack();
    expectTitle('Campaigns');
  });
});
