import { Link } from 'react-router';
import type { Campaign, ContentBlock } from '../../domain/campaign';
import { enemySummary, findEncounter } from '../../domain/scene';
import styles from './SceneTile.module.css';

const labels: Record<ContentBlock['type'], string> = {
  intro: 'Intro',
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
};

/** DC-010: compact view of one content block. */
export default function SceneTile({ block, campaign, openTo }: Props) {
  const label = labels[block.type];
  const content = (
    <>
      <h2 className={styles.label}>{label}</h2>
      <TileBody block={block} campaign={campaign} />
    </>
  );

  return (
    <section className={`${styles.tile} ${styles[block.type]}`} aria-label={label}>
      {openTo ? (
        <Link to={openTo} className={styles.open}>
          {content}
        </Link>
      ) : (
        content
      )}
    </section>
  );
}

function TileBody({ block, campaign }: Omit<Props, 'openTo'>) {
  switch (block.type) {
    case 'intro':
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
        </>
      );
    }
  }
}
