import { Link, useParams } from 'react-router';
import { getCampaign } from '../../data/campaigns';

/**
 * Placeholder target for selecting a campaign (DC-001).
 * DC-002 replaces this with "open the right scene".
 */
export default function CampaignPage() {
  const { campaignId = '' } = useParams();
  const campaign = getCampaign(campaignId);

  if (!campaign) {
    return (
      <main className="page">
        <h1>Campaign not found</h1>
        <Link to="/">Back to campaigns</Link>
      </main>
    );
  }

  return (
    <main className="page">
      <h1>{campaign.name}</h1>
      <p>Opening a campaign arrives in DC-002.</p>
      <Link to="/">Back to campaigns</Link>
    </main>
  );
}
