import React from 'react';
import ReactDOM from 'react-dom/client';
import { NestTuner, type TunerLocale } from '@nesttuner/ui';
import './styles.css';

const locale = (import.meta.env.VITE_APP_LOCALE || 'pt-BR') as TunerLocale;
document.documentElement.lang = locale;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <NestTuner locale={locale} />
  </React.StrictMode>
);
