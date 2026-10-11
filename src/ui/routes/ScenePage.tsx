import { useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { getCampaign } from '../../data/campaigns';
import { getActiveCombat, setActiveCombat } from '../../data/combats';
import { saveCurrentScene } from '../../data/storage';
import type { Encounter } from '../../domain/campaign';
import { startCombat } from '../../domain/combat';
import { canOpenTile, findScene, neighbours } from '../../domain/scene';
import SceneTile from '../components/SceneTile';
import StepNav from '../components/StepNav';
import styles from './ScenePage.module.css';

/**
 * DC-010: a scene's content blocks as compact tiles, in array order.
 * DC-015, DC-016: previous/next scene with one tap.
 * DC-080: the scene shown is remembered as the current scene.
 * DC-043: an encounter tile starts combat with one tap, or resumes the active one (D1).
 */
export default function ScenePage() {
  const { campaignId = '', sceneId = '' } = useParams();
  const navigate = useNavigate();
  const campaign = getCampaign(campaignId);
  const scene = campaign && findScene(campaign, sceneId);
  const currentSceneId = scene?.id;

  // Saving is a side effect, so it runs in an effect after rendering, and only when the
  // shown scene changes. Hooks must run before the early return below.
  useEffect(() => {
    if (currentSceneId) saveCurrentScene(campaignId, currentSceneId);
  }, [campaignId, currentSceneId]);

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
  const combatUrl = `/c/${campaign.id}/combat`;
  const startCombatFrom = (encounter: Encounter) => {
    setActiveCombat(startCombat(campaign, scene.id, encounter, Math.random));
    navigate(combatUrl);
  };
  const combat = {
    to: combatUrl,
    active: getActiveCombat(campaign.id) !== undefined,
    onStart: startCombatFrom,
  };

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
              combat={combat}
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
