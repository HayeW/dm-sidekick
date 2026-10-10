import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { getCampaign } from '../../data/campaigns';
import type { Description, DescriptionsBlock, Scene } from '../../domain/campaign';
import { findBlock, findDescription, findScene, neighbours } from '../../domain/scene';
import StepNav from '../components/StepNav';
import { useSwipe } from '../swipe';
import styles from './TilePage.module.css';

/** DC-011: an opened tile. Only Descriptions tiles open in this slice; others are P1. */
export default function TilePage() {
  const { campaignId = '', sceneId = '', blockId = '', descriptionId } = useParams();
  const campaign = getCampaign(campaignId);
  const scene = campaign && findScene(campaign, sceneId);
  const block = scene && findBlock(scene, blockId);
  const description = block?.type === 'descriptions' && findDescription(block, descriptionId);

  if (!campaign || !scene || !block || block.type !== 'descriptions' || !description) {
    // Back to the deepest level that does exist: the scene, else the campaign, else the list.
    let backTo = '/';
    if (campaign && scene) backTo = `/c/${campaign.id}/s/${scene.id}`;
    else if (campaign) backTo = `/c/${campaign.id}`;

    return (
      <main className="page">
        <h1>Tile not found</h1>
        <Link to={backTo}>Back</Link>
      </main>
    );
  }

  return (
    <DescriptionView
      sceneUrl={`/c/${campaign.id}/s/${scene.id}`}
      scene={scene}
      block={block}
      description={description}
    />
  );
}

type Props = {
  sceneUrl: string;
  scene: Scene;
  block: DescriptionsBlock;
  description: Description;
};

/**
 * One read-aloud text, large and readable, with previous/next by button (D11) or by
 * swiping (DC-017), and one tap back to the scene.
 */
function DescriptionView({ sceneUrl, scene, block, description }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const descriptionUrl = (id: string) => `${sceneUrl}/b/${block.id}/d/${id}`;
  const { previous, next } = neighbours(block.descriptions, description.id);
  const position = block.descriptions.indexOf(description) + 1;
  const total = block.descriptions.length;

  // Swiping does exactly what the buttons do: replace the entry, keep the state.
  const swipe = useSwipe((direction) => {
    const target = direction === 'left' ? next : previous;
    if (target) navigate(descriptionUrl(target.id), { replace: true, state: location.state });
  });

  // Opened from the scene tile: go back in history, so the phone's back button doesn't
  // return here. Opened directly (deep link): replace with the scene. Previous/next
  // replace the history entry and keep this state, so Back is always one tap.
  const fromScene = (location.state as { fromScene?: boolean } | null)?.fromScene === true;
  function back() {
    if (fromScene) navigate(-1);
    else navigate(sceneUrl, { replace: true });
  }

  return (
    <main className={`page ${styles.screen}`} {...swipe}>
      <button type="button" className={styles.back} onClick={back}>
        ‹ {scene.title}
      </button>
      <div className={styles.heading}>
        <h1>{description.title}</h1>
        {total > 1 && (
          <span className={styles.position}>
            {position} / {total}
          </span>
        )}
      </div>
      <p className={styles.readAloud}>{description.text}</p>
      {total > 1 && (
        <StepNav
          label="Descriptions"
          replace
          previousTo={previous && descriptionUrl(previous.id)}
          nextTo={next && descriptionUrl(next.id)}
          state={location.state}
        />
      )}
    </main>
  );
}
