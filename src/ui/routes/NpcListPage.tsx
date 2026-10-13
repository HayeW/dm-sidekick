import { useParams } from 'react-router';
import { getCampaign } from '../../data/campaigns';
import { EntityList, EntityNotFound } from '../components/EntityScreens';

/** DC-021: the campaign's NPCs, opened from Quick Access (D24); one tap opens an NPC. */
export default function NpcListPage() {
  const { campaignId = '' } = useParams();
  const campaign = getCampaign(campaignId);
  if (!campaign) {
    return <EntityNotFound heading="Campaign not found" to="/" label="Back to campaigns" />;
  }
  return (
    <EntityList
      campaignId={campaign.id}
      heading="NPCs"
      empty="No NPCs in this campaign yet."
      items={campaign.npcs.map((npc) => ({
        id: npc.id,
        title: npc.name,
        detail: npc.description,
        to: `/c/${campaign.id}/npcs/${npc.id}`,
      }))}
    />
  );
}
