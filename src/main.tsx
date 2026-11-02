import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';
import { loadPrefs } from './prefs';
import { applyTheme, prefersDark } from './theme';

// Set the theme before the first paint so a dark choice never flashes light.
applyTheme(loadPrefs().theme, prefersDark());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Offline support, only in the built app: during development a cached copy would hide your changes.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* the app works without it */
    });
  });
}
