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

const postToEmbeddedHost = (payload: Record<string, unknown>) => {
  if (window.parent === window) return;
  window.parent.postMessage(payload, '*');
};

if (embedded) {
  let resizeFrame = 0;

  const publishSize = () => {
    window.cancelAnimationFrame(resizeFrame);
    resizeFrame = window.requestAnimationFrame(() => {
      const root = document.getElementById('root');
      const height = Math.ceil(Math.max(
        document.documentElement.scrollHeight,
        document.body.scrollHeight,
        root?.scrollHeight ?? 0,
      ));

      postToEmbeddedHost({
        type: 'nesttuner:resize',
        height,
      });
    });
  };

  window.addEventListener('load', () => {
    postToEmbeddedHost({ type: 'nesttuner:ready' });
    publishSize();
  }, { once: true });

  const observer = new ResizeObserver(publishSize);
  observer.observe(document.documentElement);
  observer.observe(document.body);

  const root = document.getElementById('root');
  if (root) observer.observe(root);

  window.addEventListener('resize', publishSize);
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
