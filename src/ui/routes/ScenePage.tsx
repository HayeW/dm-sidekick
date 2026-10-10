import { Link, useParams } from 'react-router';
import { getCampaign } from '../../data/campaigns';
import { findScene } from '../../domain/scene';
import SceneTile from '../components/SceneTile';
import styles from './ScenePage.module.css';

/** DC-010: a scene's content blocks as compact tiles, in array order. */
export default function ScenePage() {
  const { campaignId = '', sceneId = '' } = useParams();
  const campaign = getCampaign(campaignId);
  const scene = campaign && findScene(campaign, sceneId);

  if (!campaign || !scene) {
    return (
      <main className="page">
        <h1>{campaign ? 'Scene not found' : 'Campaign not found'}</h1>
        <Link to={campaign ? `/c/${campaign.id}` : '/'}>
          {campaign ? 'Back to campaign' : 'Back to campaigns'}
        </Link>
      </main>
    );
  }

  return (
    <main className="page">
      <Link to="/" className={styles.campaign}>
        ‹ {campaign.name}
      </Link>
      <h1>{scene.title}</h1>
      <ul className={styles.tiles}>
        {scene.blocks.map((block) => (
          <li key={block.id}>
            <SceneTile block={block} campaign={campaign} />
          </li>
        ))}
      </ul>
    </main>
  );
}
