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
};

/** DC-010: compact view of one content block. Opening tiles comes in later stories. */
export default function SceneTile({ block, campaign }: Props) {
  const label = labels[block.type];

  return (
    <section className={`${styles.tile} ${styles[block.type]}`} aria-label={label}>
      <h2 className={styles.label}>{label}</h2>
      <TileBody block={block} campaign={campaign} />
    </section>
  );
}

function TileBody({ block, campaign }: Props) {
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
