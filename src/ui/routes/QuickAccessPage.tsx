import { Link, useLocation, useParams } from 'react-router';
import { getCampaign } from '../../data/campaigns';
import { getActiveCombat } from '../../data/combats';
import { findEncounter } from '../../domain/scene';
import ListRow from '../components/ListRow';
import type { QuickAccessState } from '../components/TopBar';
import { useBack } from '../useBack';
import styles from './QuickAccessPage.module.css';

/**
 * DC-020: Quick Access, the escape hatch for things outside the current scene (requirements
 * §6). A screen with its own URL, so Back closes it and a refresh keeps it open (D23).
 * DC-021: its items (D24). Choosing one replaces this screen in the history, so Back from the
 * item returns to the screen Quick Access was opened from (D23).
 */
export default function QuickAccessPage() {
  const { campaignId = '' } = useParams();
  const location = useLocation();
  const campaign = getCampaign(campaignId);
  // Close does what Back does; opened directly, it opens the campaign, which shows the
  // current scene (DC-003).
  const { back: close, openedDirectly } = useBack(`/c/${campaignId}`);

  if (!campaign) {
    return (
      <main className="page">
        <h1>Campaign not found</h1>
        <Link to="/">Back to campaigns</Link>
      </main>
    );
  }

  const openedFrom = (location.state as Partial<QuickAccessState> | null)?.quickFrom;
  /**
   * An item leading to `to`. Back to the screen Quick Access was opened from, it just closes.
   * Opened directly, it keeps this screen in the history, so Back stays in the app (D23).
   */
  const item = (to: string, title: string, detail: string) =>
    openedFrom === to ? (
      <ListRow onClick={close} title={title} detail={detail} />
    ) : (
      <ListRow to={to} replace={!openedDirectly} title={title} detail={detail} />
    );

  const combat = getActiveCombat(campaign.id);
  const encounter = combat?.encounterId ? findEncounter(campaign, combat.encounterId) : undefined;
  const npcCount = campaign.npcs.length;
  const locationCount = campaign.locations.length;
  const noteCount = campaign.notes.length;

  return (
    <main className="page">
      <div className={styles.header}>
        <h1>Quick Access</h1>
        <button type="button" className={styles.close} onClick={close}>
          <span aria-hidden="true">✕</span> Close
        </button>
      </div>
      <ul className={styles.items} aria-label="Quick Access items">
        <li>
          {/* Combat: back to the active combat from anywhere (D24). Always in the same place,
              disabled without a combat (D27). */}
          {combat ? (
            item(`/c/${campaign.id}/combat`, 'Combat', encounter?.name ?? 'In progress')
          ) : (
            <ListRow disabled title="Combat" detail="No active combat" />
          )}
        </li>
        <li>
          {item(
            `/c/${campaign.id}/npcs`,
            'Campaign NPCs',
            npcCount === 1 ? '1 NPC' : `${npcCount} NPCs`,
          )}
        </li>
        <li>
          {item(
            `/c/${campaign.id}/locations`,
            'Locations',
            locationCount === 1 ? '1 location' : `${locationCount} locations`,
          )}
        </li>
        <li>
          {item(
            `/c/${campaign.id}/notes`,
            'Campaign Notes',
            noteCount === 1 ? '1 note' : `${noteCount} notes`,
          )}
        </li>
      </ul>
    </main>
  );
}
