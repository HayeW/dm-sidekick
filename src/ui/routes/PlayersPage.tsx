import { useParams } from 'react-router';
import { getCampaign } from '../../data/campaigns';
import { EntityNotFound } from '../components/EntityScreens';
import TopBar from '../components/TopBar';
import { useBack } from '../useBack';
import styles from './PlayersPage.module.css';

/**
 * DC-031 / DC-114: the campaign's own player characters, opened from Quick Access (D58), in
 * the order they join combat after the enemies (DC-051).
 */
export default function PlayersPage() {
  const { campaignId = '' } = useParams();
  const campaign = getCampaign(campaignId);
  // Opened directly, back goes to the campaign, which shows the current scene (DC-003).
  const { back } = useBack(`/c/${campaignId}`);

  if (!campaign) {
    return <EntityNotFound heading="Campaign not found" to="/" label="Back to campaigns" />;
  }

  const players = campaign.playerCharacters;
  return (
    <main className="page">
      <TopBar back={{ onClick: back }} backLabel="Back" campaignId={campaign.id} />
      <h1>Player characters</h1>
      {players.length === 0 ? (
        <p className={styles.empty}>No player characters yet.</p>
      ) : (
        <ul className={styles.players} aria-label="Player characters">
          {players.map((player) => (
            <li key={player.id} className={styles.player}>
              {player.name}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
