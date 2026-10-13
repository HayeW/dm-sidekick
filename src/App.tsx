import { Link, Route, Routes } from 'react-router';
import CampaignListPage from './ui/routes/CampaignListPage';
import CampaignPage from './ui/routes/CampaignPage';
import CombatPage from './ui/routes/CombatPage';
import QuickAccessPage from './ui/routes/QuickAccessPage';
import ScenePage from './ui/routes/ScenePage';
import TilePage from './ui/routes/TilePage';
import ScrollToTop from './ui/components/ScrollToTop';

// Routes follow docs/implementation-plan-slice-1.md, §5, and docs/implementation-plan-slice-2.md, §3.
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
