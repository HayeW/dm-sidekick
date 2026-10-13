import {
  useEffect,
  useReducer,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { getCampaign } from '../../data/campaigns';
import { getActiveCombat, setActiveCombat } from '../../data/combats';
import {
  addCombatant,
  applyDamage,
  DAMAGE_AMOUNTS,
  isDead,
  moveCombatant,
  moveCombatantTo,
  removeCombatant,
  type Combat,
  type Combatant,
  type NewCombatant,
} from '../../domain/combat';
import { findScene } from '../../domain/scene';
import { useDragReorder } from '../dragReorder';
import styles from './CombatPage.module.css';

/**
 * DC-053: all combatants in their current order.
 * DC-060: current HP for every combatant that is not a player character (decision D3).
 * DC-061: one tap on a damage button lowers HP straight away; every change is saved.
 * DC-063: a combatant at 0 HP is shown as DEAD and stays in place.
 * DC-064, DC-052: in reorder mode every combatant can be dragged to its place by its handle,
 * or moved one place with the arrow keys on the handle (decisions D17, D21).
 * A new combat opens in reorder mode, because placing the PCs is the first thing to do.
 * DC-065, DC-066: a combatant added below the list goes to the bottom, not alphabetically;
 * the screen then switches to reorder mode to move it into place (decision D18).
 * DC-067: in reorder mode every combatant can be removed with one tap (D18).
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
  const moveTo = (combatantId: string, to: number) =>
    change((latest) => moveCombatantTo(latest, combatantId, to));
  const remove = (combatantId: string) => change((latest) => removeCombatant(latest, combatantId));
  const add = (newCombatant: NewCombatant) => {
    change((latest) => addCombatant(latest, newCombatant));
    setReordering(true);
  };

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
      {reordering && (
        <p className={styles.hint}>Drag ≡ to move everyone into place, then tap Done.</p>
      )}
      {reordering ? (
        <ReorderList
          combatants={combat.combatants}
          onMove={move}
          onMoveTo={moveTo}
          onRemove={remove}
        />
      ) : (
        <ol className={styles.combatants} aria-label="Combat order">
          {combat.combatants.map((combatant) => (
            <CombatantRow
              key={combatant.id}
              combatant={combatant}
              controls={<DamageButtons combatant={combatant} onDamage={damage} />}
            />
          ))}
        </ol>
      )}
      <AddCombatant onAdd={add} />
    </main>
  );
}

type RowProps = {
  combatant: Combatant;
  /** Before the name: the remove button in reorder mode. */
  leading?: ReactNode;
  /** After the name: damage buttons, or the drag handle in reorder mode. */
  controls: ReactNode;
  dragged?: boolean;
  style?: CSSProperties;
};

function CombatantRow({ combatant, leading, controls, dragged = false, style }: RowProps) {
  const isPlayer = combatant.type === 'PLAYER';
  const dead = isDead(combatant);
  return (
    <li
      className={`${styles.row} ${isPlayer ? styles.player : ''} ${dead ? styles.dead : ''} ${dragged ? styles.dragged : ''}`}
      style={style}
    >
      {leading}
      <span className={styles.info}>
        <span className={styles.name}>{combatant.name}</span>
        {isPlayer ? (
          // Player characters: no HP (D3).
          <span className={styles.pc}>PC</span>
        ) : dead ? (
          <span className={styles.deadLabel}>DEAD</span>
        ) : combatant.hp === null ? null : (
          // An added combatant may have no HP (D8): name only.
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
  // Combatants without HP have no damage buttons: PCs (D3) and those added without HP (D8).
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

/**
 * Reorder mode (D17, D21): every row has ✕ on the left and a ≡ drag handle on the right, far
 * apart so grabbing the handle never removes anyone. Dragging the handle moves the combatant
 * to where it is dropped; the arrow keys on the handle move it one place.
 */
function ReorderList({
  combatants,
  onMove,
  onMoveTo,
  onRemove,
}: {
  combatants: Combatant[];
  onMove: (combatantId: string, direction: 'up' | 'down') => void;
  onMoveTo: (combatantId: string, to: number) => void;
  onRemove: (combatantId: string) => void;
}) {
  const listRef = useRef<HTMLOListElement>(null);
  const drag = useDragReorder(
    listRef,
    combatants.map((combatant) => combatant.id),
    onMoveTo,
  );
  // Moving a row can move its DOM node, which loses focus; this handle gets it back.
  const refocus = useRef<string | null>(null);
  useEffect(() => {
    const id = refocus.current;
    if (id === null || !listRef.current) return;
    refocus.current = null;
    Array.from(listRef.current.querySelectorAll<HTMLElement>('[data-handle]'))
      .find((handle) => handle.dataset.handle === id)
      ?.focus();
  });

  const onKeyDown = (event: KeyboardEvent, combatantId: string) => {
    const direction = { ArrowUp: 'up', ArrowDown: 'down' } as const;
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
    event.preventDefault(); // don't scroll the page
    refocus.current = combatantId;
    onMove(combatantId, direction[event.key]);
  };

  return (
    <ol
      ref={listRef}
      className={`${styles.combatants} ${drag.dragging ? styles.sorting : ''}`}
      aria-label="Combat order"
    >
      {combatants.map((combatant, index) => (
        <CombatantRow
          key={combatant.id}
          combatant={combatant}
          dragged={drag.isDragged(index)}
          style={drag.rowStyle(index)}
          leading={
            // One tap, no confirmation (D7, D18): only reachable in reorder mode.
            <button
              type="button"
              className={styles.remove}
              aria-label={`Remove ${combatant.name}`}
              onClick={() => onRemove(combatant.id)}
            >
              ✕
            </button>
          }
          controls={
            <button
              type="button"
              className={styles.handle}
              aria-label={`Move ${combatant.name}`}
              aria-keyshortcuts="ArrowUp ArrowDown"
              data-handle={combatant.id}
              onKeyDown={(event) => onKeyDown(event, combatant.id)}
              {...drag.handleProps(combatant.id, index)}
            >
              ≡
            </button>
          }
        />
      ))}
    </ol>
  );
}

/**
 * "+ Add combatant" below the list opens a small inline form: name (required) and HP
 * (optional) (DC-065, decision D8). Enter in the name field moves on to HP rather than
 * adding, so the phone's Next key cannot add a combatant without its HP by accident (D18).
 * The form closes again after adding.
 */
function AddCombatant({ onAdd }: { onAdd: (newCombatant: NewCombatant) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [hp, setHp] = useState('');
  const hpInput = useRef<HTMLInputElement>(null);

  const hpValue = hp.trim() === '' ? null : Number(hp);
  const hpValid = hpValue === null || (Number.isInteger(hpValue) && hpValue > 0);
  const canAdd = name.trim() !== '' && hpValid;

  const close = () => {
    setOpen(false);
    setName('');
    setHp('');
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!canAdd) return;
    onAdd({ name, hp: hpValue });
    close();
  };

  if (!open) {
    return (
      <button type="button" className={styles.addButton} onClick={() => setOpen(true)}>
        + Add combatant
      </button>
    );
  }
  return (
    <form className={styles.addForm} aria-label="Add combatant" onSubmit={submit}>
      <label className={styles.field}>
        <span>Name</span>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoFocus
          autoComplete="off"
          enterKeyHint="next"
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return;
            event.preventDefault();
            hpInput.current?.focus();
          }}
        />
      </label>
      <label className={`${styles.field} ${styles.hpField}`}>
        <span>HP (optional)</span>
        <input
          ref={hpInput}
          type="number"
          inputMode="numeric"
          min={1}
          step={1}
          value={hp}
          onChange={(event) => setHp(event.target.value)}
          aria-invalid={!hpValid}
          enterKeyHint="done"
        />
      </label>
      <div className={styles.formButtons}>
        <button type="button" className={styles.cancel} onClick={close}>
          Cancel
        </button>
        <button type="submit" className={styles.add} disabled={!canAdd}>
          Add
        </button>
      </div>
    </form>
  );
}
