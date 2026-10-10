import { Link, Route, Routes } from 'react-router';
import CampaignListPage from './ui/routes/CampaignListPage';
import CampaignPage from './ui/routes/CampaignPage';

// Routes follow docs/implementation-plan-slice-1.md, §5.
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<CampaignListPage />} />
      <Route path="/c/:campaignId" element={<CampaignPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
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
