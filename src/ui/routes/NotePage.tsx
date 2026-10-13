import { useParams } from 'react-router';
import { getCampaign } from '../../data/campaigns';
import { findNote } from '../../domain/entities';
import { EntityDetail, EntityNotFound } from '../components/EntityScreens';

/** DC-021: one campaign note, opened from the Campaign Notes list (D28). */
export default function NotePage() {
  const { campaignId = '', noteId = '' } = useParams();
  const campaign = getCampaign(campaignId);
  const note = campaign && findNote(campaign, noteId);
  if (!campaign) {
    return <EntityNotFound heading="Campaign not found" to="/" label="Back to campaigns" />;
  }
  const listUrl = `/c/${campaign.id}/notes`;
  if (!note) {
    return <EntityNotFound heading="Note not found" to={listUrl} label="Back to notes" />;
  }
  return (
    <EntityDetail
      campaignId={campaign.id}
      heading={note.title}
      text={note.text}
      fallbackTo={listUrl}
    />
  );
}
