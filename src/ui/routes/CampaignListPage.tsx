import { Link } from 'react-router';
import { getCampaigns } from '../../data/campaigns';
import styles from './CampaignListPage.module.css';

/** DC-001: the list of campaigns the DM can choose from. */
export default function CampaignListPage() {
  const campaigns = getCampaigns();

  return (
    <main className="page">
      <h1>Campaigns</h1>
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
    </main>
  );
}
