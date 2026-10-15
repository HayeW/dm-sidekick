import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Link } from 'react-router';
import { getCampaign, getCampaigns } from '../../data/campaigns';
import {
  deleteImportedCampaign,
  isImportedCampaign,
  readCampaignFile,
  saveImportedCampaign,
} from '../../data/importedCampaigns';
import styles from './CampaignListPage.module.css';

/** A campaign file is a few kilobytes; a bigger file was picked by mistake (D55). */
const MAX_FILE_SIZE = 1024 * 1024;
/** The errors shown at once (D56); the DM fixes these and imports again. */
const MAX_ERRORS_SHOWN = 5;

/**
 * What shows above the list (D50): the file's errors (DC-112), the question whether to
 * replace an imported campaign with the same id (DC-111, D54), or whether to delete one
 * (DC-113, D51).
 */
type Panel =
  /** `more`: how many errors there are beyond the ones shown (D56). */
  | { kind: 'errors'; fileName: string; messages: string[]; more?: number }
  | { kind: 'replace'; fileName: string; text: string; existingName: string }
  | { kind: 'delete'; campaignId: string; name: string };

/**
 * DC-001: the list of campaigns the DM can choose from. DC-110: import one from a file;
 * DC-113: delete an imported one.
 */
export default function CampaignListPage() {
  const campaigns = getCampaigns();
  const [panel, setPanel] = useState<Panel>();
  // The list is read from storage on every render; this re-renders it after a change.
  const [, setChanges] = useState(0);
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
      setChanges((count) => count + 1);
    } else {
      setPanel({
        kind: 'errors',
        fileName,
        messages: ['There is no room to store it on this device.'],
      });
    }
  };

  const remove = (campaignId: string) => {
    deleteImportedCampaign(campaignId);
    closePanel();
    setChanges((count) => count + 1);
  };

  const importFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    // Picking the same file again (after fixing it) must fire a change again.
    input.value = '';
    if (!file) return;
    const pick = ++latestPick.current;
    if (file.size > MAX_FILE_SIZE) {
      // Not even read: a photo or video would freeze the phone (D55).
      const messages = ["This doesn't look like a campaign file: it is larger than 1 MB."];
      setPanel({ kind: 'errors', fileName: file.name, messages });
      return;
    }

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
      const messages = result.errors
        .slice(0, MAX_ERRORS_SHOWN)
        .map((error) => `Line ${error.line}: ${error.message}`);
      const more = result.errors.length - messages.length;
      setPanel({ kind: 'errors', fileName: file.name, messages, more });
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
          aria-labelledby="campaigns-panel-heading"
        >
          <h2 id="campaigns-panel-heading" ref={panelHeading} tabIndex={-1}>
            Could not import {panel.fileName}
          </h2>
          <ul className={styles.errors}>
            {panel.messages.map((message, index) => (
              <li key={index}>{message}</li>
            ))}
          </ul>
          {!!panel.more && (
            <p className={styles.more}>
              …and {panel.more} more {panel.more === 1 ? 'error' : 'errors'}.
            </p>
          )}
          <div className={styles.panelButtons}>
            <button type="button" className={styles.secondary} onClick={closePanel}>
              Close
            </button>
          </div>
        </section>
      )}

      {panel?.kind === 'replace' && (
        <section className={styles.panel} aria-labelledby="campaigns-panel-heading">
          <h2 id="campaigns-panel-heading" ref={panelHeading} tabIndex={-1}>
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

      {panel?.kind === 'delete' && (
        <section
          className={`${styles.panel} ${styles.problem}`}
          aria-labelledby="campaigns-panel-heading"
        >
          <h2 id="campaigns-panel-heading" ref={panelHeading} tabIndex={-1}>
            Delete “{panel.name}”?
          </h2>
          <p>This removes it from this device, with its current scene and combat.</p>
          <div className={styles.panelButtons}>
            <button type="button" className={styles.secondary} onClick={closePanel}>
              Cancel
            </button>
            <button
              type="button"
              className={styles.danger}
              onClick={() => remove(panel.campaignId)}
            >
              Delete
            </button>
          </div>
        </section>
      )}

      <ul className={styles.list}>
        {campaigns.map((campaign) => {
          const imported = isImportedCampaign(campaign.id);
          return (
            <li key={campaign.id} className={styles.item}>
              <Link to={`/c/${campaign.id}`} className={styles.card}>
                <span className={styles.name}>{campaign.name}</span>
                <span className={styles.meta}>
                  {campaign.scenes.length} {campaign.scenes.length === 1 ? 'scene' : 'scenes'}
                  {imported && ' · Imported'}
                </span>
              </Link>
              {/* Only imported campaigns can be deleted, not the demo campaigns (DC-113). */}
              {imported && (
                <button
                  type="button"
                  className={styles.delete}
                  aria-label={`Delete ${campaign.name}`}
                  onClick={() =>
                    setPanel({ kind: 'delete', campaignId: campaign.id, name: campaign.name })
                  }
                >
                  Delete
                </button>
              )}
            </li>
          );
        })}
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
