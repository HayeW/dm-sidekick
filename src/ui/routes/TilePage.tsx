import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { getCampaign } from '../../data/campaigns';
import { findBlock, findScene } from '../../domain/scene';
import styles from './TilePage.module.css';

/** DC-011: an opened Intro tile — read-aloud text, large and readable, one tap back. */
export default function TilePage() {
  const { campaignId = '', sceneId = '', blockId = '' } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const campaign = getCampaign(campaignId);
  const scene = campaign && findScene(campaign, sceneId);
  const block = scene && findBlock(scene, blockId);

  // Only Intro tiles open in this slice (DC-011); Location/NPCs/Notes are P1.
  if (!campaign || !scene || !block || block.type !== 'intro') {
    return (
      <main className="page">
        <h1>Tile not found</h1>
        <Link to={campaign ? `/c/${campaign.id}` : '/'}>Back</Link>
      </main>
    );
  }

  const sceneUrl = `/c/${campaign.id}/s/${scene.id}`;

  // Came here from the scene: go back in history, so the phone's back button doesn't
  // return to this screen. Opened directly (refresh, deep link): replace with the scene.
  function back() {
    if (location.key !== 'default') navigate(-1);
    else navigate(sceneUrl, { replace: true });
  }

  return (
    <main className="page">
      <button type="button" className={styles.back} onClick={back}>
        ‹ {scene.title}
      </button>
      <h1>Intro</h1>
      <p className={styles.readAloud}>{block.text}</p>
    </main>
  );
}
