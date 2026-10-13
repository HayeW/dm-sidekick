import { useParams } from 'react-router';
import { getCampaign } from '../../data/campaigns';
import { findNpc } from '../../domain/entities';
import { EntityDetail, EntityNotFound } from '../components/EntityScreens';

/**
 * DC-013: one NPC, opened from an NPC tile on a scene or from the Campaign NPCs list
 * (DC-021). Back returns to where it was opened.
 */
export default function NpcPage() {
  const { campaignId = '', npcId = '' } = useParams();
  const campaign = getCampaign(campaignId);
  const npc = campaign && findNpc(campaign, npcId);
  if (!campaign) {
    return <EntityNotFound heading="Campaign not found" to="/" label="Back to campaigns" />;
  }
  const listUrl = `/c/${campaign.id}/npcs`;
  if (!npc) {
    return <EntityNotFound heading="NPC not found" to={listUrl} label="Back to NPCs" />;
  }
  return (
    <EntityDetail
      campaignId={campaign.id}
      heading={npc.name}
      text={npc.description}
      fallbackTo={listUrl}
    />
  );
}
