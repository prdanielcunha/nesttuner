import React from 'react';
import ReactDOM from 'react-dom/client';
import { NestTuner } from '@nesttuner/ui';
import { applyPublicMeta, localeFromBrowser, localeFromPath, LOCALE_PATH } from './locales';
import './styles.css';

let locale = localeFromPath(window.location.pathname);

if (!locale) {
  locale = localeFromBrowser();
  const destination = LOCALE_PATH[locale];
  if (window.location.pathname === '/' && window.location.search === '' && window.location.hash === '') {
    window.history.replaceState(null, '', destination);
  }
}

applyPublicMeta(locale);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <NestTuner locale={locale} />
  </React.StrictMode>
);
