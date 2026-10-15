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
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router';
import { getCampaign } from '../../data/campaigns';
import { endActiveCombat, getActiveCombat, setActiveCombat } from '../../data/combats';
import {
  addCombatant,
  applyDamage,
  applyHealing,
  DAMAGE_AMOUNTS,
  HEAL_AMOUNTS,
  isDead,
  isFullHp,
  moveCombatant,
  moveCombatantTo,
  removeCombatant,
  type Combat,
  type Combatant,
  type NewCombatant,
} from '../../domain/combat';
import { findEncounter, findScene } from '../../domain/scene';
import TopBar from '../components/TopBar';
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
 * DC-062: in heal mode the damage buttons become +1/+5/+10, up to max HP; healing revives
 * the dead (D36–D41).
 * DC-020: Quick Access opens from the top bar (D22).
 * DC-072: End combat at the bottom (D63) asks first in a panel at the top (D64), then goes
 * to the combat's scene (D65).
 */
export default function CombatPage() {
  const { campaignId = '' } = useParams();
  // The mode is part of the URL, so a refresh keeps it. Switching replaces the history entry,
  // so Back still returns to the scene in one tap (D17, D42). Reorder and heal mode exclude
  // each other (D39).
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const fromSceneId = (location.state as Partial<CombatOpenedFrom> | null)?.fromSceneId;
  const modeParam = searchParams.get('mode');
  const mode: Mode = modeParam === 'reorder' || modeParam === 'heal' ? modeParam : 'normal';
  const setMode = (next: Mode) =>
    // Keeps where the combat was opened from, for End combat.
    setSearchParams(next === 'normal' ? {} : { mode: next }, {
      replace: true,
      state: location.state as unknown,
    });
  const reordering = mode === 'reorder';
  const healing = mode === 'heal';
  const campaign = getCampaign(campaignId);
  const combat = campaign && getActiveCombat(campaign.id);
  // The combat lives in the data layer; after changing it, render again to show it.
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  const navigate = useNavigate();
  /** The End combat question is open (D64). */
  const [confirmingEnd, setConfirmingEnd] = useState(false);
  const endButton = useRef<HTMLButtonElement>(null);
  const endHeading = useRef<HTMLHeadingElement>(null);
  // The panel is at the top, the button at the bottom: bring the question into view.
  useEffect(() => {
    if (confirmingEnd) endHeading.current?.focus();
  }, [confirmingEnd]);

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
  const heal = (combatantId: string, amount: number) =>
    change((latest) => applyHealing(latest, combatantId, amount));
  const move = (combatantId: string, direction: 'up' | 'down') =>
    change((latest) => moveCombatant(latest, combatantId, direction));
  const moveTo = (combatantId: string, to: number) =>
    change((latest) => moveCombatantTo(latest, combatantId, to));
  const remove = (combatantId: string) => change((latest) => removeCombatant(latest, combatantId));
  const add = (newCombatant: NewCombatant) => {
    change((latest) => addCombatant(latest, newCombatant));
    setMode('reorder');
  };
  const sceneUrl = scene ? `/c/${campaign.id}/s/${scene.id}` : `/c/${campaign.id}`;
  const encounter = combat.encounterId ? findEncounter(campaign, combat.encounterId) : undefined;
  const end = () => {
    endActiveCombat(campaign.id);
    // Opened from its own scene, that scene is the entry before this one: go back to it, so
    // the history doesn't hold the scene twice. Otherwise replace this screen: Back must not
    // return to a combat that no longer exists.
    if (scene && fromSceneId === scene.id) void navigate(-1);
    else void navigate(sceneUrl, { replace: true });
  };
  const cancelEnd = () => {
    setConfirmingEnd(false);
    endButton.current?.focus();
  };

  return (
    <main className="page">
      {/* Back to where the combat started; to the campaign if that scene no longer exists. */}
      <TopBar
        back={{ to: sceneUrl }}
        backLabel={scene?.title ?? campaign.name}
        campaignId={campaign.id}
      />
      <h1>Combat</h1>
      {confirmingEnd && (
        <section className={styles.endPanel} aria-labelledby="end-combat-heading">
          <h2 id="end-combat-heading" ref={endHeading} tabIndex={-1}>
            {/* D67: a combat without a known encounter is "the current combat". */}
            {encounter ? `End the combat against ${encounter.name}?` : 'End the current combat?'}
          </h2>
          <p>HP and order are lost.</p>
          <div className={styles.endButtons}>
            <button type="button" className={styles.cancel} onClick={cancelEnd}>
              Cancel
            </button>
            <button type="button" className={styles.endConfirm} onClick={end}>
              End combat
            </button>
          </div>
        </section>
      )}
      {reordering && (
        <p className={styles.hint}>Drag ≡ to move everyone into place, then tap Done below.</p>
      )}
      {healing && (
        <p className={`${styles.hint} ${styles.healHint}`}>
          Healing: tap +1, +5 or +10, then tap Done below.
        </p>
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
              controls={
                healing ? (
                  <HealButtons combatant={combatant} onHeal={heal} />
                ) : (
                  <DamageButtons combatant={combatant} onDamage={damage} />
                )
              }
            />
          ))}
        </ol>
      )}
      {/* Below the list, in thumb reach and away from Quick in the top bar (D29). An open
          add form wraps onto its own line under these buttons. */}
      <div className={styles.actions}>
        <AddCombatant onAdd={add} />
        {/* Kept together, so they wrap as one group to the right. */}
        <div className={styles.modeButtons}>
          {/* Heal mode (D40, D41): green and unmistakable, so it is never mistaken for damage.
              It reads "Done" like reorder mode's button, so it keeps its width and the row
              doesn't wrap; screen readers hear "Done healing". */}
          <button
            type="button"
            className={healing ? styles.doneHealing : styles.heal}
            aria-label={healing ? 'Done healing' : undefined}
            onClick={() => setMode(healing ? 'normal' : 'heal')}
          >
            {healing ? 'Done' : 'Heal'}
          </button>
          <button
            type="button"
            className={reordering ? styles.done : styles.reorder}
            onClick={() => setMode(reordering ? 'normal' : 'reorder')}
          >
            {reordering ? 'Done' : 'Reorder'}
          </button>
        </div>
      </div>
      {/* Rare and final: small, quiet and last, away from the damage buttons (D63). */}
      <button
        ref={endButton}
        type="button"
        className={styles.endCombat}
        onClick={() => setConfirmingEnd(true)}
      >
        End combat
      </button>
    </main>
  );
}

type Mode = 'normal' | 'reorder' | 'heal';

/** Navigation state: the scene that opened the combat screen, with Start or Resume combat. */
export type CombatOpenedFrom = { fromSceneId: string };

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

/** Heal mode (DC-062): green +1/+5/+10; disabled at full HP, enabled for the dead (D36, D37). */
function HealButtons({
  combatant,
  onHeal,
}: {
  combatant: Combatant;
  onHeal: (combatantId: string, amount: number) => void;
}) {
  // Combatants without HP have nothing to heal: PCs (D3) and those added without HP (D8).
  if (combatant.hp === null) return null;
  return (
    <span className={`${styles.controls} ${styles.healControls}`}>
      {HEAL_AMOUNTS.map((amount) => (
        <button
          key={amount}
          type="button"
          aria-label={`${amount} healing to ${combatant.name}`}
          disabled={isFullHp(combatant)}
          onClick={() => onHeal(combatant.id, amount)}
        >
          +{amount}
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
