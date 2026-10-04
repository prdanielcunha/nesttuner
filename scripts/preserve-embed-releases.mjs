import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const baseUrl = process.argv[2];
if (!baseUrl) throw new Error('Usage: node scripts/preserve-embed-releases.mjs <current-hosting-base-url>');

const distDir = path.join(root, 'dist');
const embedDir = path.join(distDir, 'embed');
const currentPath = path.join(embedDir, 'current-release.json');
const current = JSON.parse(await readFile(currentPath, 'utf8'));

const legacyBootstrap = {
  schemaVersion: 1,
  releases: [
    {
      version: '0.4.0-beta.0',
      files: [
        'embed/nesttuner-element.v0.4.0-beta.0.js',
        'embed/assets/pitch.worker-B1reOsd4.js'
      ]
    }
  ]
};

async function loadRemoteManifest() {
  try {
    const response = await fetch(new URL('/embed/releases.json', baseUrl), {
      cache: 'no-store'
    });
    if (!response.ok) return legacyBootstrap;
    const parsed = await response.json();
    if (!Array.isArray(parsed?.releases)) return legacyBootstrap;
    return parsed;
  } catch {
    return legacyBootstrap;
  }
}

async function preserveFile(file) {
  if (current.files.includes(file)) return;
  const response = await fetch(
    new URL('/' + file.replace(/^\/+/, ''), baseUrl),
    { cache: 'no-store' }
  );
  if (!response.ok) {
    throw new Error(`Unable to preserve immutable NestTuner asset ${file}: HTTP ${response.status}`);
  }
  const destination = path.join(distDir, file);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, Buffer.from(await response.arrayBuffer()));
  console.log(`Preserved immutable embed asset: ${file}`);
}

const remote = await loadRemoteManifest();
for (const release of remote.releases) {
  if (!release || typeof release.version !== 'string' || !Array.isArray(release.files)) continue;
  for (const file of release.files) {
    if (typeof file === 'string') await preserveFile(file);
  }
}

const releasesByVersion = new Map();
for (const release of [...remote.releases, current]) {
  if (!release || typeof release.version !== 'string' || !Array.isArray(release.files)) continue;
  releasesByVersion.set(release.version, {
    version: release.version,
    files: [...new Set(release.files)].sort()
  });
}

const manifest = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  releases: [...releasesByVersion.values()].sort((a, b) =>
    a.version.localeCompare(b.version)
  )
};

await writeFile(
  path.join(embedDir, 'releases.json'),
  JSON.stringify(manifest, null, 2) + '\n',
  'utf8'
);
await unlink(currentPath).catch(() => undefined);
console.log(
  `NestTuner immutable embed releases: ${manifest.releases.map(release => release.version).join(', ')}`
);
