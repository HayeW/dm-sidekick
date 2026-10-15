import { screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getCampaigns } from '../../data/campaigns';
import { saveImportedCampaign } from '../../data/importedCampaigns';
import { combatOrder, renderAt, setupUser } from '../../test/app';

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

/** A campaign file as the DM writes it on the PC. */
const hollowmere = (secondScene = 'The Bridge') =>
  [
    '# Hollowmere',
    '',
    '## Encounters',
    '',
    '### Trolls',
    '',
    '- 2 × Troll, 30 HP',
    '',
    '## Scene: The Gate',
    '',
    '### Read-aloud: Intro',
    '',
    'Fog rolls over the marsh.',
    '',
    `## Scene: ${secondScene}`,
    '',
    '### Encounter: Trolls',
  ].join('\n');

const asFile = (text: string, name = 'hollowmere.md') =>
  new File([text], name, { type: 'text/markdown' });

/** Picks a file in the device's file picker behind "Import campaign". */
async function importFile(user: ReturnType<typeof setupUser>, file: File) {
  await user.upload(screen.getByLabelText('Campaign file'), file);
}

const campaignLink = (name: RegExp) => screen.queryByRole('link', { name });

describe('DC-110 — Campaign importeren uit een Markdown-bestand', () => {
  it('has an Import campaign button that opens the file picker for Markdown files', () => {
    renderAt('/');

    expect(screen.getByRole('button', { name: 'Import campaign' })).toBeInTheDocument();
    expect(screen.getByLabelText('Campaign file')).toHaveAttribute(
      'accept',
      expect.stringContaining('.md'),
    );
  });

  it('imports a file: the campaign is in the list, opens and can be played', async () => {
    const user = setupUser();
    renderAt('/');

    await importFile(user, asFile(hollowmere()));
    await user.click(await screen.findByRole('link', { name: /Hollowmere/ }));

    expect(screen.getByRole('heading', { level: 1, name: 'The Gate' })).toBeInTheDocument();
    await user.click(
      within(screen.getByRole('navigation', { name: 'Scenes' })).getByRole('link', {
        name: /Next/,
      }),
    );
    await user.click(screen.getByRole('button', { name: 'Start combat' }));
    expect(combatOrder()).toEqual(['Troll 1 · 30/30 HP', 'Troll 2 · 30/30 HP']);
  });

  it('keeps the imported campaign after a refresh, next to the demo campaigns', async () => {
    const user = setupUser();
    const { unmount } = renderAt('/');
    await importFile(user, asFile(hollowmere()));
    await screen.findByRole('link', { name: /Hollowmere/ });
    unmount();

    renderAt('/');

    expect(campaignLink(/Hollowmere/)).toBeInTheDocument();
    expect(campaignLink(/Shadows over Millbrook/)).toBeInTheDocument();
  });
});

describe('DC-112 — Duidelijke foutmeldingen bij importeren', () => {
  const broken = ['# Hollowmere', '## Monsters', '## Scene: The Gate', '### NPCs', '- Marta'];

  it('shows every error with its line number, and imports nothing', async () => {
    const user = setupUser();
    renderAt('/');

    await importFile(user, asFile(broken.join('\n'), 'campaign.md'));

    const panel = await screen.findByRole('region', { name: 'Could not import campaign.md' });
    expect(
      within(panel)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual([
      'Line 2: unknown section "## Monsters". Expected NPCs, Locations, Encounters, Notes or Scene: ….',
      'Line 5: "- Marta" — there is no NPC with that name.',
    ]);
    expect(campaignLink(/Hollowmere/)).not.toBeInTheDocument();
  });

  it('brings the panel into view, and gives focus back to the button when it closes', async () => {
    const user = setupUser();
    renderAt('/');
    await importFile(user, asFile(broken.join('\n'), 'campaign.md'));

    expect(await screen.findByRole('heading', { name: /Could not import/ })).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Close' }));

    expect(screen.queryByRole('region')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Import campaign' })).toHaveFocus();
  });

  it('does not replace an imported campaign when the new file has errors', async () => {
    const user = setupUser();
    saveImportedCampaign(hollowmere());
    renderAt('/');

    await importFile(user, asFile(broken.join('\n')));
    await screen.findByRole('region', { name: /Could not import/ });

    expect(screen.queryByRole('button', { name: 'Replace' })).not.toBeInTheDocument();
    renderAt('/c/imported-hollowmere/s/scene-the-bridge');
    expect(screen.getByRole('heading', { level: 1, name: 'The Bridge' })).toBeInTheDocument();
  });
});

describe('DC-111 — Bestaande campaign vervangen', () => {
  async function reimport(answer: 'Replace' | 'Cancel') {
    const user = setupUser();
    saveImportedCampaign(hollowmere('The Bridge'));
    renderAt('/');
    await importFile(user, asFile(hollowmere('The Ford').replace('# Hollowmere', '# HOLLOWMERE')));
    const panel = await screen.findByRole('region', { name: 'Replace “Hollowmere”?' });
    expect(panel).toHaveTextContent('This overwrites the imported version.');
    await user.click(within(panel).getByRole('button', { name: answer }));
    return user;
  }

  it('asks first, and replaces the campaign with the same name', async () => {
    await reimport('Replace');

    expect(screen.queryByRole('region')).not.toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /HOLLOWMERE/i })).toHaveLength(1);
    renderAt('/c/imported-hollowmere/s/scene-the-ford');
    expect(screen.getByRole('heading', { level: 1, name: 'The Ford' })).toBeInTheDocument();
  });

  it('changes nothing on Cancel', async () => {
    await reimport('Cancel');

    expect(screen.queryByRole('region')).not.toBeInTheDocument();
    expect(campaignLink(/^Hollowmere/)).toBeInTheDocument();
    renderAt('/c/imported-hollowmere/s/scene-the-bridge');
    expect(screen.getByRole('heading', { level: 1, name: 'The Bridge' })).toBeInTheDocument();
  });

  it('keeps the current scene after a re-import, if it still exists (D49)', async () => {
    const user = setupUser();
    saveImportedCampaign(hollowmere());
    renderAt('/c/imported-hollowmere/s/scene-the-bridge').unmount();
    renderAt('/');

    await importFile(user, asFile(hollowmere().replace('Fog rolls', 'Rain falls')));
    await user.click(await screen.findByRole('button', { name: 'Replace' }));
    await user.click(screen.getByRole('link', { name: /Hollowmere/ }));

    expect(screen.getByRole('heading', { level: 1, name: 'The Bridge' })).toBeInTheDocument();
  });
});

describe('DC-112 — Duidelijke foutmeldingen: het apparaat', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const storageFull = () =>
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });

  it('tells the DM when there is no room to store the campaign', async () => {
    const user = setupUser();
    storageFull();
    renderAt('/');

    await importFile(user, asFile(hollowmere()));

    const panel = await screen.findByRole('region', { name: 'Could not import hollowmere.md' });
    expect(panel).toHaveTextContent('There is no room to store it on this device.');
    expect(campaignLink(/Hollowmere/)).not.toBeInTheDocument();
  });

  it('tells the DM when there is no room for the replacement, and keeps the old version', async () => {
    const user = setupUser();
    saveImportedCampaign(hollowmere('The Bridge'));
    renderAt('/');
    await importFile(user, asFile(hollowmere('The Ford')));
    storageFull();

    await user.click(await screen.findByRole('button', { name: 'Replace' }));

    expect(
      screen.getByRole('region', { name: 'Could not import hollowmere.md' }),
    ).toBeInTheDocument();
    renderAt('/c/imported-hollowmere/s/scene-the-bridge');
    expect(screen.getByRole('heading', { level: 1, name: 'The Bridge' })).toBeInTheDocument();
  });

  it('tells the DM when the file cannot be read', async () => {
    const user = setupUser();
    vi.spyOn(FileReader.prototype, 'readAsText').mockImplementation(function (this: FileReader) {
      this.onerror?.(new ProgressEvent('error') as ProgressEvent<FileReader>);
    });
    renderAt('/');

    await importFile(user, asFile(hollowmere()));

    const panel = await screen.findByRole('region', { name: 'Could not import hollowmere.md' });
    expect(panel).toHaveTextContent('The file could not be read.');
  });
});

describe('DC-113 — Geïmporteerde campaign verwijderen', () => {
  it('marks imported campaigns, and offers Delete only for them', () => {
    saveImportedCampaign(hollowmere());
    renderAt('/');

    expect(campaignLink(/Hollowmere/)).toHaveTextContent('Imported');
    expect(campaignLink(/Shadows over Millbrook/)).not.toHaveTextContent('Imported');
    expect(screen.getAllByRole('button', { name: /^Delete/ }).map((b) => b.ariaLabel)).toEqual([
      'Delete Hollowmere',
    ]);
  });

  it('asks first, then deletes the campaign and its session', async () => {
    const user = setupUser();
    saveImportedCampaign(hollowmere());
    // A current scene and an active combat, as after playing.
    const { unmount } = renderAt('/c/imported-hollowmere/s/scene-the-bridge');
    await user.click(screen.getByRole('button', { name: 'Start combat' }));
    unmount();
    renderAt('/');

    await user.click(screen.getByRole('button', { name: 'Delete Hollowmere' }));
    const panel = screen.getByRole('region', { name: 'Delete “Hollowmere”?' });
    expect(campaignLink(/Hollowmere/)).toBeInTheDocument(); // nothing deleted yet
    await user.click(within(panel).getByRole('button', { name: 'Delete' }));

    expect(screen.queryByRole('region')).not.toBeInTheDocument();
    expect(campaignLink(/Hollowmere/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Import campaign' })).toHaveFocus();
    expect(localStorage.getItem('dm-sidekick:v1:session:imported-hollowmere')).toBeNull();
  });

  it('starts fresh when the deleted campaign is imported again', async () => {
    const user = setupUser();
    saveImportedCampaign(hollowmere());
    const { unmount } = renderAt('/c/imported-hollowmere/s/scene-the-bridge');
    await user.click(screen.getByRole('button', { name: 'Start combat' }));
    unmount();
    const list = renderAt('/');
    await user.click(screen.getByRole('button', { name: 'Delete Hollowmere' }));
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    await importFile(user, asFile(hollowmere()));
    await user.click(await screen.findByRole('link', { name: /Hollowmere/ }));

    expect(screen.getByRole('heading', { level: 1, name: 'The Gate' })).toBeInTheDocument();
    list.unmount();
    renderAt('/c/imported-hollowmere/combat');
    expect(screen.getByRole('heading', { name: 'No active combat' })).toBeInTheDocument();
  });

  it('changes nothing on Cancel', async () => {
    const user = setupUser();
    saveImportedCampaign(hollowmere());
    renderAt('/');

    await user.click(screen.getByRole('button', { name: 'Delete Hollowmere' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('region')).not.toBeInTheDocument();
    expect(campaignLink(/Hollowmere/)).toBeInTheDocument();
  });
});

describe('DC-112 — Duidelijke foutmeldingen: een verkeerd bestand', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('refuses a file over 1 MB without reading it (D55)', async () => {
    const user = setupUser();
    const read = vi.spyOn(FileReader.prototype, 'readAsText');
    renderAt('/');

    await importFile(user, asFile('x'.repeat(1024 * 1024 + 1), 'export.txt'));

    const panel = await screen.findByRole('region', { name: 'Could not import export.txt' });
    expect(
      within(panel)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(["This doesn't look like a campaign file: it is larger than 1 MB."]);
    expect(read).not.toHaveBeenCalled();
  });

  it('accepts a file of exactly 1 MB', async () => {
    const user = setupUser();
    const text = hollowmere();
    // Bytes, not characters: "×" takes two.
    const file = asFile(text + ' '.repeat(1024 * 1024 - new Blob([text]).size));
    expect(file.size).toBe(1024 * 1024);
    renderAt('/');

    await importFile(user, file);

    expect(await screen.findByRole('link', { name: /Hollowmere/ })).toBeInTheDocument();
  });

  it('shows the first five errors and how many more there are (D56)', async () => {
    const user = setupUser();
    const junk = Array.from({ length: 6 }, (_, index) => `junk ${index + 1}`);
    renderAt('/');

    // No campaign name, no scene, and six lines of loose text: eight errors.
    await importFile(user, asFile(junk.join('\n'), 'notes.md'));

    const panel = await screen.findByRole('region', { name: 'Could not import notes.md' });
    expect(within(panel).getAllByRole('listitem')).toHaveLength(5);
    expect(within(panel).getAllByRole('listitem')[0]).toHaveTextContent(/^Line 1: /);
    expect(panel).toHaveTextContent('…and 3 more errors.');
  });

  it('says "1 more error" for one', async () => {
    const user = setupUser();
    renderAt('/');

    // No campaign name, no scene, and four lines of loose text: six errors.
    await importFile(user, asFile(['a', 'b', 'c', 'd'].join('\n'), 'notes.md'));

    expect(await screen.findByText('…and 1 more error.')).toBeInTheDocument();
  });

  it('shows exactly five errors without a "more" line', async () => {
    const user = setupUser();
    renderAt('/');

    // No campaign name, no scene, and three lines of loose text: five errors.
    await importFile(user, asFile(['a', 'b', 'c'].join('\n'), 'notes.md'));

    const panel = await screen.findByRole('region', { name: 'Could not import notes.md' });
    expect(within(panel).getAllByRole('listitem')).toHaveLength(5);
    expect(within(panel).queryByText(/more error/)).not.toBeInTheDocument();
  });
});
