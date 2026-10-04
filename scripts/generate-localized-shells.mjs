import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const dist = path.join(root, 'dist');
const source = await readFile(path.join(dist, 'index.html'), 'utf8');

const locales = {
  pt: {
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

function localizedHtml(meta) {
  return source
    .replace(/<html lang="[^"]*">/, `<html lang="${meta.lang}">`)
    .replace(/<title>[^<]*<\/title>/, `<title>${meta.title}</title>`)
    .replace(/<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${meta.description}" />`)
    .replace(/<link rel="canonical" href="[^"]*" \/>/, `<link rel="canonical" href="${meta.canonical}" />`)
    .replace(/<meta property="og:title" content="[^"]*" \/>/, `<meta property="og:title" content="${meta.title}" />`)
    .replace(/<meta property="og:description" content="[^"]*" \/>/, `<meta property="og:description" content="${meta.description}" />`)
    .replace(/<meta property="og:url" content="[^"]*" \/>/, `<meta property="og:url" content="${meta.canonical}" />`);
}

for (const [segment, meta] of Object.entries(locales)) {
  const dir = path.join(dist, segment);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, 'index.html'), localizedHtml(meta));
}

const redirectScript = `<script>
(function () {
  var langs = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || 'en'];
  var target = '/en/';
  for (var i = 0; i < langs.length; i += 1) {
    var lang = String(langs[i] || '').toLowerCase();
    if (lang.indexOf('pt') === 0) { target = '/pt/'; break; }
    if (lang.indexOf('es') === 0) { target = '/es/'; break; }
    if (lang.indexOf('en') === 0) { target = '/en/'; break; }
  }
  if (location.pathname === '/') location.replace(target + location.search + location.hash);
})();
</script>`;

await writeFile(
  path.join(dist, 'index.html'),
  source.replace('<div id="root"></div>', redirectScript + '\n    <div id="root"></div>')
);

console.log('Generated NestTuner localized shells: /pt/, /en/, /es/');
