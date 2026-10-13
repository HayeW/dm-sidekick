import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { getCampaign } from '../../data/campaigns';
import styles from './QuickAccessPage.module.css';

/**
 * DC-020: Quick Access, the escape hatch for things outside the current scene (requirements
 * §6). A screen with its own URL, so Back closes it and a refresh keeps it open (D23).
 * The items follow in later steps (DC-021, D24).
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

  // Close does what Back does. Opened directly (a link in a new tab), there is no screen to
  // go back to, so it opens the campaign, which shows the current scene (DC-003).
  const close = () => {
    if (location.key === 'default') navigate(`/c/${campaign.id}`, { replace: true });
    else navigate(-1);
  };

  return (
    <main className="page">
      <div className={styles.header}>
        <h1>Quick Access</h1>
        <button type="button" className={styles.close} onClick={close}>
          <span aria-hidden="true">✕</span> Close
        </button>
      </div>
    </main>
  );
}
