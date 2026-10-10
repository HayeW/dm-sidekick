import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { getCampaign } from '../../data/campaigns';
import { findBlock, findDescription, findScene, neighbours } from '../../domain/scene';
import styles from './TilePage.module.css';

/**
 * DC-011: an opened Descriptions tile — one read-aloud text at a time, large and readable,
 * previous/next between descriptions and one tap back to the scene (decision D11).
 */
export default function TilePage() {
  const { campaignId = '', sceneId = '', blockId = '', descriptionId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const campaign = getCampaign(campaignId);
  const scene = campaign && findScene(campaign, sceneId);
  const block = scene && findBlock(scene, blockId);
  // Only Descriptions tiles open in this slice; Location/NPCs/Notes are P1.
  const description = block?.type === 'descriptions' && findDescription(block, descriptionId);

  if (!campaign || !scene || !block || block.type !== 'descriptions' || !description) {
    return (
      <main className="page">
        <h1>Tile not found</h1>
        <Link to={campaign ? `/c/${campaign.id}` : '/'}>Back</Link>
      </main>
    );
  }

  const sceneUrl = `/c/${campaign.id}/s/${scene.id}`;
  const descriptionUrl = (id: string) => `${sceneUrl}/b/${block.id}/d/${id}`;
  const { previous, next } = neighbours(block.descriptions, description.id);
  const position = block.descriptions.indexOf(description) + 1;
  const total = block.descriptions.length;

  // Opened from the scene tile: go back in history, so the phone's back button doesn't
  // return here. Opened directly (deep link): replace with the scene. Previous/next
  // replace the history entry and keep this state, so Back is always one tap.
  const fromScene = (location.state as { fromScene?: boolean } | null)?.fromScene === true;
  function back() {
    if (fromScene) navigate(-1);
    else navigate(sceneUrl, { replace: true });
  }

  return (
    <main className="page">
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
        <nav className={styles.nav} aria-label="Descriptions">
          <StepLink to={previous && descriptionUrl(previous.id)} state={location.state}>
            ◀ Previous
          </StepLink>
          <StepLink to={next && descriptionUrl(next.id)} state={location.state}>
            Next ▶
          </StepLink>
        </nav>
      )}
    </main>
  );
}

type StepLinkProps = { to: string | undefined; state: unknown; children: string };

/** Previous/next: a link when there is somewhere to go, otherwise a disabled button. */
function StepLink({ to, state, children }: StepLinkProps) {
  if (!to) {
    return (
      <button type="button" className={styles.step} disabled>
        {children}
      </button>
    );
  }
  return (
    <Link to={to} replace state={state} className={styles.step}>
      {children}
    </Link>
  );
}
