import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Link } from 'react-router';
import { getCampaign, getCampaigns } from '../../data/campaigns';
import { readCampaignFile, saveImportedCampaign } from '../../data/importedCampaigns';
import styles from './CampaignListPage.module.css';

/**
 * What the import shows above the list (D50): the file's errors (DC-112), or the question
 * whether to replace an imported campaign with the same id (DC-111, D54).
 */
type Panel =
  | { kind: 'errors'; fileName: string; messages: string[] }
  | { kind: 'replace'; fileName: string; text: string; existingName: string };

/** DC-001: the list of campaigns the DM can choose from; DC-110: import one from a file. */
export default function CampaignListPage() {
  const campaigns = getCampaigns();
  const [panel, setPanel] = useState<Panel>();
  // The list is read from storage on every render; this re-renders it after an import.
  const [, setImports] = useState(0);
  const fileInput = useRef<HTMLInputElement>(null);
  const importButton = useRef<HTMLButtonElement>(null);
  const panelHeading = useRef<HTMLHeadingElement>(null);
  /** Counts the files picked, so only the last one picked decides, also if it reads faster. */
  const latestPick = useRef(0);

  // The panel is above the list, the button below it: bring the panel into view.
  useEffect(() => {
    panelHeading.current?.focus();
  }, [panel]);

  /** Closes the panel; focus goes back to the button, not lost with the panel's buttons. */
  const closePanel = () => {
    setPanel(undefined);
    importButton.current?.focus();
  };

  const save = (text: string, fileName: string) => {
    if (saveImportedCampaign(text)) {
      closePanel();
      setImports((count) => count + 1);
    } else {
      setPanel({
        kind: 'errors',
        fileName,
        messages: ['There is no room to store it on this device.'],
      });
    }
  };

  const importFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    // Picking the same file again (after fixing it) must fire a change again.
    input.value = '';
    if (!file) return;
    const pick = ++latestPick.current;

    let text: string;
    try {
      text = await readText(file);
      if (pick !== latestPick.current) return;
    } catch {
      if (pick !== latestPick.current) return;
      // E.g. a cloud file that could not be downloaded.
      setPanel({ kind: 'errors', fileName: file.name, messages: ['The file could not be read.'] });
      return;
    }
    const result = readCampaignFile(text);
    if ('errors' in result) {
      const messages = result.errors.map((error) => `Line ${error.line}: ${error.message}`);
      setPanel({ kind: 'errors', fileName: file.name, messages });
      return;
    }
    const existing = getCampaign(result.campaign.id);
    if (existing) {
      setPanel({ kind: 'replace', fileName: file.name, text, existingName: existing.name });
    } else save(text, file.name);
  };

  return (
    <main className="page">
      <h1>Campaigns</h1>

      {panel?.kind === 'errors' && (
        <section
          className={`${styles.panel} ${styles.problem}`}
          aria-labelledby="import-panel-heading"
        >
          <h2 id="import-panel-heading" ref={panelHeading} tabIndex={-1}>
            Could not import {panel.fileName}
          </h2>
          <ul className={styles.errors}>
            {panel.messages.map((message, index) => (
              <li key={index}>{message}</li>
            ))}
          </ul>
          <div className={styles.panelButtons}>
            <button type="button" className={styles.secondary} onClick={closePanel}>
              Close
            </button>
          </div>
        </section>
      )}

      {panel?.kind === 'replace' && (
        <section className={styles.panel} aria-labelledby="import-panel-heading">
          <h2 id="import-panel-heading" ref={panelHeading} tabIndex={-1}>
            Replace “{panel.existingName}”?
          </h2>
          <p>This overwrites the imported version.</p>
          <div className={styles.panelButtons}>
            <button type="button" className={styles.secondary} onClick={closePanel}>
              Cancel
            </button>
            <button
              type="button"
              className={styles.primary}
              onClick={() => save(panel.text, panel.fileName)}
            >
              Replace
            </button>
          </div>
        </section>
      )}

      <ul className={styles.list}>
        {campaigns.map((campaign) => (
          <li key={campaign.id}>
            <Link to={`/c/${campaign.id}`} className={styles.card}>
              <span className={styles.name}>{campaign.name}</span>
              <span className={styles.meta}>
                {campaign.scenes.length} {campaign.scenes.length === 1 ? 'scene' : 'scenes'}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <button
        ref={importButton}
        type="button"
        className={styles.import}
        onClick={() => fileInput.current?.click()}
      >
        Import campaign
      </button>
      <input
        ref={fileInput}
        type="file"
        accept=".md,.markdown,text/markdown,text/plain"
        aria-label="Campaign file"
        hidden
        onChange={(event) => void importFile(event)}
      />
    </main>
  );
}

/** The file's text, read as UTF-8. FileReader rather than `file.text()`: older phones lack it. */
function readText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('Could not read the file'));
    reader.readAsText(file);
  });
}
