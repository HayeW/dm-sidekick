import { Link } from 'react-router';
import type { Campaign, ContentBlock, Encounter } from '../../domain/campaign';
import { findLocation, findNpcs } from '../../domain/entities';
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
  /**
   * What the tile opens: its detail screen (DC-011) or its location (DC-012). When set, the
   * whole tile opens it with one tap. The `fromScene` state it passes is only read by the
   * tile detail screen.
   */
  openTo?: string;
  /** Encounter tiles: start a new combat, or resume the active one (DC-043, decision D1). */
  combat?: CombatAction;
};

type CombatAction = {
  /** Combat screen URL, used to resume. */
  to: string;
  /** Passed to the combat screen, so End combat can go back to this scene (DC-072). */
  state: unknown;
  active: boolean;
  onStart: (encounter: Encounter) => void;
};

/** DC-010: compact view of one content block. DC-013: NPC names open the NPC. */
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
    case 'location': {
      // Locations and NPCs are campaign data; the tile refers to them by id (D25).
      const location = findLocation(campaign, block.locationId);
      if (!location) return <p className={styles.missing}>Location not found</p>;
      return (
        <>
          <p className={styles.title}>{location.name}</p>
          <p className={styles.clamp}>{location.description}</p>
        </>
      );
    }
    case 'npcs': {
      const npcs = findNpcs(campaign, block.npcIds);
      if (npcs.length === 0) return <p className={styles.missing}>No NPCs</p>;
      // DC-013: every NPC opens with one tap; a tile can hold several, so each is its own link.
      return (
        <ul className={styles.npcList}>
          {npcs.map((npc) => (
            <li key={npc.id}>
              <Link to={`/c/${campaign.id}/npcs/${npc.id}`} className={styles.npc}>
                {npc.name}
              </Link>
            </li>
          ))}
        </ul>
      );
    }
    case 'encounter': {
      const encounter = findEncounter(campaign, block.encounterId);
      if (!encounter) return <p className={styles.missing}>Encounter not found</p>;
      return (
        <>
          <p className={styles.title}>{encounter.name}</p>
          <p>{enemySummary(encounter)}</p>
          {combat &&
            (combat.active ? (
              <Link to={combat.to} state={combat.state} className={styles.combat}>
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
