import { Link, useParams } from 'react-router';
import { getCampaign } from '../../data/campaigns';
import { getActiveCombat } from '../../data/combats';
import type { Combatant } from '../../domain/combat';
import { findScene } from '../../domain/scene';
import styles from './CombatPage.module.css';

/**
 * DC-053: all combatants in their current order.
 * DC-060: current HP for every combatant that is not a player character (decision D3).
 */
export default function CombatPage() {
  const { campaignId = '' } = useParams();
  const campaign = getCampaign(campaignId);
  const combat = campaign && getActiveCombat(campaign.id);

  if (!campaign || !combat) {
    return (
      <main className="page">
        <h1>{campaign ? 'No active combat' : 'Campaign not found'}</h1>
        <Link to={campaign ? `/c/${campaign.id}` : '/'}>
          {campaign ? 'Back to campaign' : 'Back to campaigns'}
        </Link>
      </main>
    );
  }

  const scene = findScene(campaign, combat.sceneId);

  return (
    <main className="page">
      {/* Back to where the combat started; to the campaign if that scene no longer exists. */}
      <Link
        to={scene ? `/c/${campaign.id}/s/${scene.id}` : `/c/${campaign.id}`}
        className={styles.back}
      >
        ‹ {scene?.title ?? campaign.name}
      </Link>
      <h1>Combat</h1>
      <ol className={styles.combatants} aria-label="Combat order">
        {combat.combatants.map((combatant) => (
          <CombatantRow key={combatant.id} combatant={combatant} />
        ))}
      </ol>
    </main>
  );
}

function CombatantRow({ combatant }: { combatant: Combatant }) {
  const isPlayer = combatant.type === 'PLAYER';
  return (
    <li className={`${styles.row} ${isPlayer ? styles.player : ''}`}>
      <span className={styles.name}>{combatant.name}</span>
      {isPlayer ? (
        <span className={styles.pc}>PC</span>
      ) : (
        combatant.hp !== null && (
          <span className={styles.hp}>
            {combatant.hp}/{combatant.maxHp} HP
          </span>
        )
      )}
    </li>
  );
}
