import { useParams } from 'react-router';
import { getCampaign } from '../../data/campaigns';
import { findLocation } from '../../domain/entities';
import { EntityDetail, EntityNotFound } from '../components/EntityScreens';

/**
 * DC-012: one location, opened from a Location tile on a scene or from the Locations list
 * (DC-021). Back returns to where it was opened.
 */
export default function LocationPage() {
  const { campaignId = '', locationId = '' } = useParams();
  const campaign = getCampaign(campaignId);
  const location = campaign && findLocation(campaign, locationId);
  if (!campaign) {
    return <EntityNotFound heading="Campaign not found" to="/" label="Back to campaigns" />;
  }
  const listUrl = `/c/${campaign.id}/locations`;
  if (!location) {
    return <EntityNotFound heading="Location not found" to={listUrl} label="Back to locations" />;
  }
  return (
    <EntityDetail
      campaignId={campaign.id}
      heading={location.name}
      text={location.description}
      fallbackTo={listUrl}
    />
  );
}
