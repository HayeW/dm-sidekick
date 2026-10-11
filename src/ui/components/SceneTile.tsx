import { Link } from 'react-router';
import type { Campaign, ContentBlock, Encounter } from '../../domain/campaign';
import { enemySummary, findEncounter } from '../../domain/scene';
import styles from './SceneTile.module.css';

const labels: Record<ContentBlock['type'], string> = {
  descriptions: 'Descriptions',
  encounter: 'Encounter',
  location: 'Location',
  npcs: 'NPCs',
  notes: 'DM Notes',
};

type Props = {
  block: ContentBlock;
  campaign: Campaign;
  /** Detail screen URL; when set, the whole tile opens it with one tap (DC-011). */
  openTo?: string;
  /** Encounter tiles: start a new combat, or resume the active one (DC-043, decision D1). */
  combat?: CombatAction;
};

type CombatAction = {
  /** Combat screen URL, used to resume. */
  to: string;
  active: boolean;
  onStart: (encounter: Encounter) => void;
};

/** DC-010: compact view of one content block. */
export default function SceneTile({ block, campaign, openTo, combat }: Props) {
  const label = labels[block.type];
  const content = (
    <>
      <h2 className={styles.label}>
        {block.type === 'descriptions' && block.descriptions.length > 1
          ? `${label} · ${block.descriptions.length}`
          : label}
      </h2>
      <TileBody block={block} campaign={campaign} combat={combat} />
    </>
  );

  return (
    <section className={`${styles.tile} ${styles[block.type]}`} aria-label={label}>
      {openTo ? (
        <Link to={openTo} state={{ fromScene: true }} className={styles.open}>
          {content}
        </Link>
      ) : (
        content
      )}
    </section>
  );
}

function TileBody({ block, campaign, combat }: Omit<Props, 'openTo'>) {
  switch (block.type) {
    case 'descriptions': {
      const first = block.descriptions[0];
      if (!first) return <p className={styles.missing}>No descriptions</p>;
      return <p className={styles.clamp}>{first.text}</p>;
    }
    case 'notes':
      return <p className={styles.clamp}>{block.text}</p>;
    case 'location':
      return (
        <>
          <p className={styles.title}>{block.title}</p>
          <p className={styles.clamp}>{block.text}</p>
        </>
      );
    case 'npcs':
      return <p className={styles.clamp}>{block.names.join(', ')}</p>;
    case 'encounter': {
      const encounter = findEncounter(campaign, block.encounterId);
      if (!encounter) return <p className={styles.missing}>Encounter not found</p>;
      return (
        <>
          <p className={styles.title}>{encounter.name}</p>
          <p>{enemySummary(encounter)}</p>
          {combat &&
            (combat.active ? (
              <Link to={combat.to} className={styles.combat}>
                Resume combat
              </Link>
            ) : (
              <button
                type="button"
                className={styles.combat}
                onClick={() => combat.onStart(encounter)}
              >
                Start combat
              </button>
            ))}
        </>
      );
    }
  }
}
