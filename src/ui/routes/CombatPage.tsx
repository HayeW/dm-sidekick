import { useReducer, type ReactNode } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { getCampaign } from '../../data/campaigns';
import { getActiveCombat, setActiveCombat } from '../../data/combats';
import {
  applyDamage,
  DAMAGE_AMOUNTS,
  isDead,
  moveCombatant,
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
 * DC-064, DC-052: in reorder mode every combatant can be moved up or down (decision D17).
 * A new combat opens in reorder mode, because placing the PCs is the first thing to do.
 */
export default function CombatPage() {
  const { campaignId = '' } = useParams();
  // The mode is part of the URL, so a refresh keeps it. Switching replaces the history entry,
  // so Back still returns to the scene in one tap.
  const [searchParams, setSearchParams] = useSearchParams();
  const reordering = searchParams.get('mode') === 'reorder';
  const setReordering = (on: boolean) =>
    setSearchParams(on ? { mode: 'reorder' } : {}, { replace: true });
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
  const move = (combatantId: string, direction: 'up' | 'down') =>
    change((latest) => moveCombatant(latest, combatantId, direction));
  const last = combat.combatants.length - 1;

  return (
    <main className="page">
      {/* Back to where the combat started; to the campaign if that scene no longer exists. */}
      <Link
        to={scene ? `/c/${campaign.id}/s/${scene.id}` : `/c/${campaign.id}`}
        className={styles.back}
      >
        ‹ {scene?.title ?? campaign.name}
      </Link>
      <div className={styles.header}>
        <h1>Combat</h1>
        <button
          type="button"
          className={reordering ? styles.done : styles.reorder}
          onClick={() => setReordering(!reordering)}
        >
          {reordering ? 'Done' : 'Reorder'}
        </button>
      </div>
      {reordering && <p className={styles.hint}>Move everyone into place, then tap Done.</p>}
      <ol className={styles.combatants} aria-label="Combat order">
        {combat.combatants.map((combatant, index) => (
          <CombatantRow
            key={combatant.id}
            combatant={combatant}
            controls={
              reordering ? (
                <MoveButtons
                  combatant={combatant}
                  isFirst={index === 0}
                  isLast={index === last}
                  onMove={move}
                />
              ) : (
                <DamageButtons combatant={combatant} onDamage={damage} />
              )
            }
          />
        ))}
      </ol>
    </main>
  );
}

type RowProps = {
  combatant: Combatant;
  /** Damage buttons, or move buttons in reorder mode. */
  controls: ReactNode;
};

function CombatantRow({ combatant, controls }: RowProps) {
  const isPlayer = combatant.hp === null;
  const dead = isDead(combatant);
  return (
    <li className={`${styles.row} ${isPlayer ? styles.player : ''} ${dead ? styles.dead : ''}`}>
      <span className={styles.info}>
        <span className={styles.name}>{combatant.name}</span>
        {isPlayer ? (
          // Player characters: no HP (D3).
          <span className={styles.pc}>PC</span>
        ) : dead ? (
          <span className={styles.deadLabel}>DEAD</span>
        ) : (
          <span className={styles.hp}>
            {combatant.hp}/{combatant.maxHp} HP
          </span>
        )}
      </span>
      {controls}
    </li>
  );
}

function DamageButtons({
  combatant,
  onDamage,
}: {
  combatant: Combatant;
  onDamage: (combatantId: string, amount: number) => void;
}) {
  // Player characters have no damage buttons (D3).
  if (combatant.hp === null) return null;
  return (
    <span className={styles.controls}>
      {DAMAGE_AMOUNTS.map((amount) => (
        <button
          key={amount}
          type="button"
          aria-label={`${amount} damage to ${combatant.name}`}
          disabled={isDead(combatant)}
          onClick={() => onDamage(combatant.id, amount)}
        >
          −{amount}
        </button>
      ))}
    </span>
  );
}

function MoveButtons({
  combatant,
  isFirst,
  isLast,
  onMove,
}: {
  combatant: Combatant;
  isFirst: boolean;
  isLast: boolean;
  onMove: (combatantId: string, direction: 'up' | 'down') => void;
}) {
  return (
    <span className={styles.controls}>
      <button
        type="button"
        aria-label={`Move ${combatant.name} up`}
        disabled={isFirst}
        onClick={() => onMove(combatant.id, 'up')}
      >
        ▲
      </button>
      <button
        type="button"
        aria-label={`Move ${combatant.name} down`}
        disabled={isLast}
        onClick={() => onMove(combatant.id, 'down')}
      >
        ▼
      </button>
    </span>
  );
}
