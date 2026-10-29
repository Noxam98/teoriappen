import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/golos-text';
import '@fontsource/barlow-semi-condensed/latin-600.css';
import '@fontsource/barlow-semi-condensed/latin-700.css';
import App from './App';
import './styles/index.css';

// The browser must not machine-translate the page: the Norwegian text is the point, the app has its own translation,
// and automatic translation garbles the exam buttons (Lever, Merk, Neste). Also set here for embedded copies of the page.
document.documentElement.setAttribute('translate', 'no');
document.documentElement.classList.add('notranslate');
if (!document.querySelector('meta[name="google"]')) {
  const meta = Object.assign(document.createElement('meta'), { name: 'google', content: 'notranslate' });
  document.head.append(meta);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Offline support when the app is hosted as a website (not for the single-file build or embedded views).
if (import.meta.env.PROD && import.meta.env.MODE !== 'single' && 'serviceWorker' in navigator
  && location.protocol.startsWith('http') && window.top === window) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('./sw.js').catch(() => {}); });
}
