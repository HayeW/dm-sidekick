import { Route, Routes } from 'react-router';

// Routes are added story by story (see docs/implementation-plan-slice-1.md, §5).
export default function App() {
  return (
    <Routes>
      <Route path="*" element={<Home />} />
    </Routes>
  );
}

function Home() {
  return (
    <main className="page">
      <h1>DM Cockpit</h1>
      <p>Setup works. Campaigns arrive in DC-001.</p>
    </main>
  );
}
