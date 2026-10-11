import { useReducer } from 'react';
import { Link, useParams } from 'react-router';
import { getCampaign } from '../../data/campaigns';
import { getActiveCombat, setActiveCombat } from '../../data/combats';
import {
  applyDamage,
  DAMAGE_AMOUNTS,
  isDead,
  type Combat,
  type Combatant,
} from '../../domain/combat';
import { findScene } from '../../domain/scene';
import styles from './CombatPage.module.css';

/**
 * DC-053: all combatants in their current order.
 * DC-060: current HP for every combatant that is not a player character (decision D3).
 * DC-061: one tap on a damage button lowers HP straight away; every change is saved.
 * DC-063: a combatant at 0 HP is shown as DEAD and stays in place.
 */
export default function CombatPage() {
  const { campaignId = '' } = useParams();
  const campaign = getCampaign(campaignId);
  const combat = campaign && getActiveCombat(campaign.id);
  // The combat lives in the data layer; after changing it, render again to show it.
  const [, rerender] = useReducer((n: number) => n + 1, 0);

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
  /** Applies a change to the latest saved combat, so quick taps never overwrite each other. */
  const change = (update: (latest: Combat) => Combat) => {
    setActiveCombat(update(getActiveCombat(campaign.id) ?? combat));
    rerender();
  };
  const damage = (combatantId: string, amount: number) =>
    change((latest) => applyDamage(latest, combatantId, amount));

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
          <CombatantRow key={combatant.id} combatant={combatant} onDamage={damage} />
        ))}
      </ol>
    </main>
  );
}

type RowProps = {
  combatant: Combatant;
  onDamage: (combatantId: string, amount: number) => void;
};

function CombatantRow({ combatant, onDamage }: RowProps) {
  if (combatant.hp === null) {
    // Player characters: no HP and no damage buttons (D3).
    return (
      <li className={`${styles.row} ${styles.player}`}>
        <span className={styles.name}>{combatant.name}</span>
        <span className={styles.pc}>PC</span>
      </li>
    );
  }

  const dead = isDead(combatant);
  return (
    <li className={`${styles.row} ${dead ? styles.dead : ''}`}>
      <span className={styles.info}>
        <span className={styles.name}>{combatant.name}</span>
        {dead ? (
          <span className={styles.deadLabel}>DEAD</span>
        ) : (
          <span className={styles.hp}>
            {combatant.hp}/{combatant.maxHp} HP
          </span>
        )}
      </span>
      <span className={styles.damage}>
        {DAMAGE_AMOUNTS.map((amount) => (
          <button
            key={amount}
            type="button"
            aria-label={`${amount} damage to ${combatant.name}`}
            disabled={dead}
            onClick={() => onDamage(combatant.id, amount)}
          >
            −{amount}
          </button>
        ))}
      </span>
    </li>
  );
}
