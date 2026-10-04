import { copyFile, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
const versioned = path.join(root, 'dist', 'embed', `nesttuner-element.v${pkg.version}.js`);
const latest = path.join(root, 'dist', 'embed', 'nesttuner-element.js');

await copyFile(versioned, latest);
console.log(`NestTuner embed alias: ${path.basename(latest)} -> ${path.basename(versioned)}`);
