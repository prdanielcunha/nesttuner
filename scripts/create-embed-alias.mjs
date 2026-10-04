import { copyFile, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
const embedDir = path.join(root, 'dist', 'embed');
const versionedName = `nesttuner-element.v${pkg.version}.js`;
const versioned = path.join(embedDir, versionedName);
const latest = path.join(embedDir, 'nesttuner-element.js');
const versionedAssetDir = path.join(embedDir, 'assets', `v${pkg.version}`);

await copyFile(versioned, latest);

const releaseAssets = await readdir(versionedAssetDir).catch(() => []);
const release = {
  version: pkg.version,
  files: [
    `embed/${versionedName}`,
    ...releaseAssets.map(file => `embed/assets/v${pkg.version}/${file}`),
    `runtime/v${pkg.version}/pitch-capture.worklet.js`
  ]
};

await writeFile(
  path.join(embedDir, 'current-release.json'),
  JSON.stringify(release, null, 2) + '\n',
  'utf8'
);

console.log(`NestTuner embed alias: ${path.basename(latest)} -> ${path.basename(versioned)}`);
console.log(`NestTuner release manifest prepared: ${pkg.version}`);
