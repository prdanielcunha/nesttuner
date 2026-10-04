import type { TunerLocale } from '@nesttuner/ui';

export type PublicLocale = TunerLocale;

export const LOCALE_PATH: Record<PublicLocale, string> = {
  'pt-BR': '/pt/',
  en: '/en/',
  es: '/es/'
};

export const PUBLIC_META: Record<PublicLocale, {
  lang: string;
  title: string;
  description: string;
  canonical: string;
}> = {
  'pt-BR': {
    lang: 'pt-BR',
    title: 'Afinador Online de Instrumentos | NestTuner',
    description: 'Afine guitarra, violão, baixo e outros instrumentos direto no navegador. Afinador cromático e modo fino, sem cadastro.',
    canonical: 'https://nesttuner.millionsnest.com/pt/'
  },
  en: {
    lang: 'en',
    title: 'Online Instrument Tuner | NestTuner',
    description: 'Tune guitar, bass and other instruments accurately in your browser. Chromatic and fine tuning modes, no sign-up required.',
    canonical: 'https://nesttuner.millionsnest.com/en/'
  },
  es: {
    lang: 'es',
    title: 'Afinador Online de Instrumentos | NestTuner',
    description: 'Afina guitarra, bajo y otros instrumentos directamente en tu navegador. Afinador cromático y modo fino, sin registro.',
    canonical: 'https://nesttuner.millionsnest.com/es/'
  }
};

export function localeFromPath(pathname: string): PublicLocale | null {
  const first = pathname.split('/').filter(Boolean)[0]?.toLowerCase();
  if (first === 'pt' || first === 'pt-br') return 'pt-BR';
  if (first === 'en') return 'en';
  if (first === 'es') return 'es';
  return null;
}

export function localeFromBrowser(): PublicLocale {
  const languages = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const value of languages) {
    const language = value.toLowerCase();
    if (language.startsWith('pt')) return 'pt-BR';
    if (language.startsWith('es')) return 'es';
    if (language.startsWith('en')) return 'en';
  }
  return 'en';
}

export function applyPublicMeta(locale: PublicLocale): void {
  const meta = PUBLIC_META[locale];
  document.documentElement.lang = meta.lang;
  document.title = meta.title;

  const description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
  if (description) description.content = meta.description;

  const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (canonical) canonical.href = meta.canonical;

  const ogTitle = document.querySelector<HTMLMetaElement>('meta[property="og:title"]');
  if (ogTitle) ogTitle.content = meta.title;

  const ogDescription = document.querySelector<HTMLMetaElement>('meta[property="og:description"]');
  if (ogDescription) ogDescription.content = meta.description;

  const ogUrl = document.querySelector<HTMLMetaElement>('meta[property="og:url"]');
  if (ogUrl) ogUrl.content = meta.canonical;
}
