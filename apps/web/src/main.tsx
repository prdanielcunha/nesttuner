import React from 'react';
import ReactDOM from 'react-dom/client';
import { NestTuner } from '@nesttuner/ui';
import { applyPublicMeta, localeFromBrowser, localeFromPath, LOCALE_PATH } from './locales';
import './styles.css';

const params = new URLSearchParams(window.location.search);
const embedded = params.get('embed') === 'musicscale' || params.get('embed') === '1';

let locale = localeFromPath(window.location.pathname);

if (!locale) {
  locale = localeFromBrowser();
  const destination = LOCALE_PATH[locale];
  if (window.location.pathname === '/' && window.location.search === '' && window.location.hash === '') {
    window.history.replaceState(null, '', destination);
  }
}

applyPublicMeta(locale);

if (embedded) {
  document.body.classList.add('nesttuner-embedded-host');
}

const handleEmbeddedBack = () => {
  if (window.parent !== window) {
    window.parent.postMessage({ type: 'nesttuner:navigate-back' }, '*');
    return;
  }
  window.history.back();
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <NestTuner
      locale={locale}
      embedded={embedded}
      onBack={embedded ? handleEmbeddedBack : undefined}
    />
  </React.StrictMode>
);
