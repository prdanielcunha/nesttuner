import { access, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
const version = pkg.version;
const embedDir = path.join(root, 'dist', 'embed');
const manifestPath = path.join(embedDir, 'current-release.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));

if (manifest.version !== version) {
  throw new Error(`Release manifest version mismatch: ${manifest.version} != ${version}`);
}

const expectedModule = `embed/nesttuner-element.v${version}.js`;
const expectedRuntime = `runtime/v${version}/pitch-capture.worklet.js`;
const workerPrefix = `embed/assets/v${version}/`;

if (!manifest.files.includes(expectedModule)) {
  throw new Error(`Missing versioned embed module in manifest: ${expectedModule}`);
}
if (!manifest.files.includes(expectedRuntime)) {
  throw new Error(`Missing versioned AudioWorklet in manifest: ${expectedRuntime}`);
}

const workerFiles = manifest.files.filter(
  file => file.startsWith(workerPrefix) && /pitch\.worker-.*\.js$/.test(file)
);
if (workerFiles.length !== 0) {
  throw new Error(
    `Embed release must inline its pitch worker; found external workers: ${workerFiles.join(', ')}`
  );
}

for (const file of manifest.files) {
  await access(path.join(root, 'dist', file));
}

const moduleText = await readFile(path.join(root, 'dist', expectedModule), 'utf8');
if (moduleText.includes(`assets/v${version}/pitch.worker-`)) {
  throw new Error('Versioned embed module must not depend on a cross-origin pitch worker asset');
}
if (!moduleText.includes('nesttuner-capture')) {
  throw new Error('Versioned embed module is missing the inlined AudioWorklet source');
}

console.log(
  `NestTuner immutable release verified: ${version} (${manifest.files.length} files)`
);
