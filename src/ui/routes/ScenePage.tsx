import { Link, useParams } from 'react-router';
import { getCampaign } from '../../data/campaigns';
import { canOpenTile, findScene, neighbours } from '../../domain/scene';
import SceneTile from '../components/SceneTile';
import StepNav from '../components/StepNav';
import styles from './ScenePage.module.css';

/**
 * DC-010: a scene's content blocks as compact tiles, in array order.
 * DC-015, DC-016: previous/next scene with one tap.
 */
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

  const sceneUrl = (id: string) => `/c/${campaign.id}/s/${id}`;
  const { previous, next } = neighbours(campaign.scenes, scene.id);

  return (
    <main className="page">
      <Link to="/" className={styles.campaign}>
        ‹ {campaign.name}
      </Link>
      <h1>{scene.title}</h1>
      <ul className={styles.tiles}>
        {scene.blocks.map((block) => (
          <li key={block.id}>
            <SceneTile
              block={block}
              campaign={campaign}
              openTo={canOpenTile(block) ? `${sceneUrl(scene.id)}/b/${block.id}` : undefined}
            />
          </li>
        ))}
      </ul>
      <StepNav
        label="Scenes"
        replace={false}
        previousTo={previous && sceneUrl(previous.id)}
        nextTo={next && sceneUrl(next.id)}
      />
    </main>
  );
}
