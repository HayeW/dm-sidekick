import { useParams } from 'react-router';
import { getCampaign } from '../../data/campaigns';
import { getSpareNpcs } from '../../data/spareNpcs';
import { EntityNotFound } from '../components/EntityScreens';
import TopBar from '../components/TopBar';
import { useBack } from '../useBack';
import styles from './SpareNpcsPage.module.css';

/**
 * DC-090: the spare NPCs, for when the story suddenly needs one. The same in every campaign;
 * the route sits under the campaign so the top bar, Quick and Back work as elsewhere (D35).
 * Every row shows name, race and description, so there is nothing to open (D33).
 */
export default function SpareNpcsPage() {
  const { campaignId = '' } = useParams();
  // Opened directly, back goes to the campaign, which shows the current scene (DC-003).
  const { back } = useBack(`/c/${campaignId}`);
  const campaign = getCampaign(campaignId);
  if (!campaign) {
    return <EntityNotFound heading="Campaign not found" to="/" label="Back to campaigns" />;
  }
  return (
    <main className="page">
      <TopBar back={{ onClick: back }} backLabel="Back" campaignId={campaign.id} />
      <h1>Spare NPCs</h1>
      <ul className={styles.npcs} aria-label="Spare NPCs">
        {getSpareNpcs().map((npc) => (
          <li key={npc.id} className={styles.npc}>
            {/* A heading per NPC, so a screen reader can jump between them, read as
                "Orla Breck, Human" rather than the two parts run together. */}
            <h2 className={styles.heading} aria-label={`${npc.name}, ${npc.race}`}>
              <span className={styles.name}>{npc.name}</span>
              <span className={styles.race}>{npc.race}</span>
            </h2>
            <p className={styles.description}>{npc.description}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
