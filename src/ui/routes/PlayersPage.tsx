import { useRef, useState, type FormEvent, type RefObject } from 'react';
import { useParams } from 'react-router';
import type { PlayerCharacter } from '../../domain/campaign';
import {
  addPlayer,
  removePlayer,
  renamePlayer,
  type PlayerChange,
} from '../../domain/playerCharacters';
import { getCampaign } from '../../data/campaigns';
import { savePlayers } from '../../data/playerCharacters';
import { EntityNotFound } from '../components/EntityScreens';
import TopBar from '../components/TopBar';
import { useBack } from '../useBack';
import styles from './PlayersPage.module.css';

const NO_ROOM = 'There is no room to store it on this device.';

/**
 * DC-031 / DC-114: the campaign's own player characters, opened from Quick Access (D58), in
 * the order they join combat after the enemies (DC-051). DC-030 / DC-114: add one below the
 * list, tap a name to rename it, Remove with one tap and no confirmation (D60).
 */
export default function PlayersPage() {
  const { campaignId = '' } = useParams();
  const campaign = getCampaign(campaignId);
  // Opened directly, back goes to the campaign, which shows the current scene (DC-003).
  const { back } = useBack(`/c/${campaignId}`);
  // The list is read from storage on every render; this re-renders it after a change.
  const [, setChanges] = useState(0);
  /** The player being renamed; one at a time. */
  const [renaming, setRenaming] = useState<string>();
  const addInput = useRef<HTMLInputElement>(null);
  /** After a rename closes, focus goes back to that player's name, not lost with the form. */
  const focusAfterRename = useRef<string>(undefined);
  /** Why a Remove wasn't stored; it has no field of its own to show it next to. */
  const [removeProblem, setRemoveProblem] = useState<string>();

  if (!campaign) {
    return <EntityNotFound heading="Campaign not found" to="/" label="Back to campaigns" />;
  }

  /** Stores a changed list. Returns why it wasn't stored, or undefined when it was. */
  const store = (change: PlayerChange): string | undefined => {
    if ('error' in change) return change.error;
    if (!savePlayers(campaign.id, change.players)) return NO_ROOM;
    setChanges((count) => count + 1);
    return undefined;
  };

  const stopRenaming = (playerId: string) => {
    focusAfterRename.current = playerId;
    setRenaming(undefined);
  };

  const remove = (player: PlayerCharacter) => {
    const problem = store({ players: removePlayer(campaign.playerCharacters, player.id) });
    setRemoveProblem(problem);
    // The Remove button is gone with its row; the add field is always there.
    if (!problem) addInput.current?.focus();
  };

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
              {renaming === player.id ? (
                <RenameForm
                  player={player}
                  onSave={(name) => {
                    const problem = store(renamePlayer(players, player.id, name));
                    if (!problem) stopRenaming(player.id);
                    return problem;
                  }}
                  onCancel={() => stopRenaming(player.id)}
                />
              ) : (
                <>
                  <button
                    ref={(button) => {
                      if (button && focusAfterRename.current === player.id) {
                        focusAfterRename.current = undefined;
                        button.focus();
                      }
                    }}
                    type="button"
                    className={styles.name}
                    aria-label={`Rename ${player.name}`}
                    onClick={() => setRenaming(player.id)}
                  >
                    {player.name}
                  </button>
                  <button
                    type="button"
                    className={styles.remove}
                    aria-label={`Remove ${player.name}`}
                    onClick={() => remove(player)}
                  >
                    Remove
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      {removeProblem && (
        <p className={styles.problem} role="alert">
          {removeProblem}
        </p>
      )}
      <AddForm inputRef={addInput} onAdd={(name) => store(addPlayer(players, name))} />
    </main>
  );
}

/**
 * The name field below the list (D60). After adding it is empty again and keeps focus, so
 * a whole party can be typed in a row. A refused name stays, with the reason below it.
 */
function AddForm({
  inputRef,
  onAdd,
}: {
  inputRef: RefObject<HTMLInputElement | null>;
  onAdd: (name: string) => string | undefined;
}) {
  const [name, setName] = useState('');
  const [problem, setProblem] = useState<string>();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const refused = onAdd(name);
    setProblem(refused);
    if (!refused) setName('');
    inputRef.current?.focus();
  };

  return (
    <form className={styles.form} aria-label="Add player" onSubmit={submit}>
      <label className={styles.field}>
        <span>Player name</span>
        <input
          ref={inputRef}
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setProblem(undefined);
          }}
          autoComplete="off"
          enterKeyHint="done"
          aria-invalid={problem !== undefined}
          aria-describedby={problem ? 'add-player-problem' : undefined}
        />
      </label>
      <button type="submit" className={styles.primary}>
        Add
      </button>
      {problem && (
        <p id="add-player-problem" className={styles.problem} role="alert">
          {problem}
        </p>
      )}
    </form>
  );
}

/** Renaming in place (D60): Enter or Save keeps the new name, Escape or Cancel the old. */
function RenameForm({
  player,
  onSave,
  onCancel,
}: {
  player: PlayerCharacter;
  onSave: (name: string) => string | undefined;
  onCancel: () => void;
}) {
  const [name, setName] = useState(player.name);
  const [problem, setProblem] = useState<string>();
  const problemId = `rename-${player.id}-problem`;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setProblem(onSave(name));
  };

  return (
    <form className={styles.form} aria-label={`Rename ${player.name}`} onSubmit={submit}>
      <label className={styles.field}>
        <span>New name for {player.name}</span>
        <input
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setProblem(undefined);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') onCancel();
          }}
          autoFocus
          autoComplete="off"
          enterKeyHint="done"
          aria-invalid={problem !== undefined}
          aria-describedby={problem ? problemId : undefined}
        />
      </label>
      <div className={styles.formButtons}>
        <button type="button" className={styles.secondary} onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className={styles.primary}>
          Save
        </button>
      </div>
      {problem && (
        <p id={problemId} className={styles.problem} role="alert">
          {problem}
        </p>
      )}
    </form>
  );
}
