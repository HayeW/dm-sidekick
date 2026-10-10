import { Link, Navigate, useParams } from 'react-router';
import { getCampaign } from '../../data/campaigns';
import { loadSession } from '../../data/storage';
import { openingScene } from '../../domain/scene';

/** DC-002, DC-003: opening a campaign goes straight to the last used (or first) scene. */
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

  const scene = openingScene(campaign, loadSession(campaign.id)?.currentSceneId);
  if (!scene) {
    return (
      <main className="page">
        <h1>{campaign.name}</h1>
        <p>This campaign has no scenes yet.</p>
        <Link to="/">Back to campaigns</Link>
      </main>
    );
  }

  return <Navigate to={`/c/${campaign.id}/s/${scene.id}`} replace />;
}
