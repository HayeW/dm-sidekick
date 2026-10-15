import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import App from './App';
import { keepStoredData } from './data/persistentStorage';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Without the trailing slash the router also matches '/dm-sidekick' itself. */}
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <App />
    </BrowserRouter>
  </StrictMode>,
);

// Offline use (D72): only the production build has a service worker; the dev server must
// always serve fresh files. Without one (an old browser) the app still works online.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {});
}

// Ask the browser to keep campaigns and combats when the phone runs low on space (D75).
void keepStoredData();
