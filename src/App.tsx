import { Link, Route, Routes } from 'react-router';
import CampaignListPage from './ui/routes/CampaignListPage';
import CampaignPage from './ui/routes/CampaignPage';
import CombatPage from './ui/routes/CombatPage';
import LocationListPage from './ui/routes/LocationListPage';
import LocationPage from './ui/routes/LocationPage';
import NoteListPage from './ui/routes/NoteListPage';
import NotePage from './ui/routes/NotePage';
import NpcListPage from './ui/routes/NpcListPage';
import NpcPage from './ui/routes/NpcPage';
import PlayersPage from './ui/routes/PlayersPage';
import QuickAccessPage from './ui/routes/QuickAccessPage';
import ScenePage from './ui/routes/ScenePage';
import SpareNpcsPage from './ui/routes/SpareNpcsPage';
import TilePage from './ui/routes/TilePage';
import ScrollToTop from './ui/components/ScrollToTop';

// Routes follow docs/implementation-plan-slice-1.md §5, slice-2 §3, slice-3 §4 and slice-6 §3.
export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<CampaignListPage />} />
        <Route path="/c/:campaignId" element={<CampaignPage />} />
        <Route path="/c/:campaignId/s/:sceneId" element={<ScenePage />} />
        <Route path="/c/:campaignId/s/:sceneId/b/:blockId" element={<TilePage />} />
        <Route
          path="/c/:campaignId/s/:sceneId/b/:blockId/d/:descriptionId"
          element={<TilePage />}
        />
        <Route path="/c/:campaignId/combat" element={<CombatPage />} />
        <Route path="/c/:campaignId/quick" element={<QuickAccessPage />} />
        <Route path="/c/:campaignId/npcs" element={<NpcListPage />} />
        <Route path="/c/:campaignId/npcs/:npcId" element={<NpcPage />} />
        <Route path="/c/:campaignId/spare-npcs" element={<SpareNpcsPage />} />
        <Route path="/c/:campaignId/players" element={<PlayersPage />} />
        <Route path="/c/:campaignId/locations" element={<LocationListPage />} />
        <Route path="/c/:campaignId/locations/:locationId" element={<LocationPage />} />
        <Route path="/c/:campaignId/notes" element={<NoteListPage />} />
        <Route path="/c/:campaignId/notes/:noteId" element={<NotePage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

function NotFound() {
  return (
    <main className="page">
      <h1>Page not found</h1>
      <Link to="/">Back to campaigns</Link>
    </main>
  );
}
