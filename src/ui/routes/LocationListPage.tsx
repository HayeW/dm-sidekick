import { useParams } from 'react-router';
import { getCampaign } from '../../data/campaigns';
import { EntityList, EntityNotFound } from '../components/EntityScreens';

/** DC-021: the campaign's locations, opened from Quick Access (D24); one tap opens one. */
export default function LocationListPage() {
  const { campaignId = '' } = useParams();
  const campaign = getCampaign(campaignId);
  if (!campaign) {
    return <EntityNotFound heading="Campaign not found" to="/" label="Back to campaigns" />;
  }
  return (
    <EntityList
      campaignId={campaign.id}
      heading="Locations"
      empty="No locations in this campaign yet."
      items={campaign.locations.map((location) => ({
        id: location.id,
        title: location.name,
        detail: location.description,
        to: `/c/${campaign.id}/locations/${location.id}`,
      }))}
    />
  );
}
