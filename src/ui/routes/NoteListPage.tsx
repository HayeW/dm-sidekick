import { useParams } from 'react-router';
import { getCampaign } from '../../data/campaigns';
import { EntityList, EntityNotFound } from '../components/EntityScreens';

/**
 * DC-021: the campaign's notes, opened from Quick Access (D24); one tap opens one. Campaign
 * notes are not tied to a scene; a scene's own notes are its DM Notes tile (D28).
 */
export default function NoteListPage() {
  const { campaignId = '' } = useParams();
  const campaign = getCampaign(campaignId);
  if (!campaign) {
    return <EntityNotFound heading="Campaign not found" to="/" label="Back to campaigns" />;
  }
  return (
    <EntityList
      campaignId={campaign.id}
      heading="Campaign Notes"
      empty="No notes in this campaign yet."
      items={campaign.notes.map((note) => ({
        id: note.id,
        title: note.title,
        detail: note.text,
        to: `/c/${campaign.id}/notes/${note.id}`,
      }))}
    />
  );
}
