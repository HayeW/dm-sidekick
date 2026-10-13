import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { getCampaign } from '../../data/campaigns';
import { getActiveCombat } from '../../data/combats';
import { findEncounter } from '../../domain/scene';
import type { QuickAccessState } from '../components/TopBar';
import styles from './QuickAccessPage.module.css';

/**
 * DC-020: Quick Access, the escape hatch for things outside the current scene (requirements
 * §6). A screen with its own URL, so Back closes it and a refresh keeps it open (D23).
 * DC-021: its items (D24). Choosing one replaces this screen in the history, so Back from the
 * item returns to the screen Quick Access was opened from (D23).
 */
export default function QuickAccessPage() {
  const { campaignId = '' } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const campaign = getCampaign(campaignId);

  if (!campaign) {
    return (
      <main className="page">
        <h1>Campaign not found</h1>
        <Link to="/">Back to campaigns</Link>
      </main>
    );
  }

  // Opened directly (a link in a new tab), there is no screen to go back to.
  const openedDirectly = location.key === 'default';
  // Close does what Back does; opened directly, it opens the campaign, which shows the
  // current scene (DC-003).
  const close = () => {
    if (openedDirectly) navigate(`/c/${campaign.id}`, { replace: true });
    else navigate(-1);
  };
  const openedFrom = (location.state as Partial<QuickAccessState> | null)?.quickFrom;

  const combat = getActiveCombat(campaign.id);
  const encounter = combat?.encounterId ? findEncounter(campaign, combat.encounterId) : undefined;
  const combatUrl = `/c/${campaign.id}/combat`;

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
              disabled without a combat (D27). Opened from the combat itself, it just closes. */}
          {!combat ? (
            <button type="button" className={styles.item} disabled>
              <Item title="Combat" detail="No active combat" />
            </button>
          ) : openedFrom === combatUrl ? (
            <button type="button" className={styles.item} onClick={close}>
              <Item title="Combat" detail={encounter?.name ?? 'In progress'} />
            </button>
          ) : (
            // Opened directly, keep this screen in the history, so Back from combat stays in the app.
            <Link to={combatUrl} replace={!openedDirectly} className={styles.item}>
              <Item title="Combat" detail={encounter?.name ?? 'In progress'} />
            </Link>
          )}
        </li>
      </ul>
    </main>
  );
}

function Item({ title, detail }: { title: string; detail: string }) {
  return (
    <>
      <span className={styles.text}>
        <span className={styles.title}>{title}</span>
        <span className={styles.detail}>{detail}</span>
      </span>
      <span className={styles.chevron} aria-hidden="true">
        ›
      </span>
    </>
  );
}
