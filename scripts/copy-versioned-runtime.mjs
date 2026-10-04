import { copyFile, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
const source = path.join(root, 'packages', 'tuner-audio', 'assets', 'pitch-capture.worklet.js');
const destinationDir = path.join(root, 'dist', 'runtime', `v${pkg.version}`);
const destination = path.join(destinationDir, 'pitch-capture.worklet.js');

await mkdir(destinationDir, { recursive: true });
await copyFile(source, destination);
console.log(`NestTuner runtime: ${path.relative(root, destination)}`);
