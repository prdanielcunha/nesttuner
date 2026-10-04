import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

describe('versioned NestTuner embed contract', () => {
  it('publishes an immutable 0.4.0 beta module and keeps a latest alias', () => {
    const config = fs.readFileSync(path.join(root, 'vite.embed.config.ts'), 'utf8');
    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    const firebase = JSON.parse(fs.readFileSync(path.join(root, 'firebase.json'), 'utf8'));

    expect(pkg.version).toBe('0.4.0-beta.0');
    expect(config).toContain('nesttuner-element.v');
    const headers = firebase.hosting[0].headers as Array<{ source: string; headers: Array<{ key: string; value: string }> }>;
    const pinned = headers.find((entry) => entry.source === '/embed/nesttuner-element.v0.4.0-beta.0.js');
    expect(pinned).toBeTruthy();
    expect(pinned!.headers.some((header) => header.key === 'Cache-Control' && header.value.includes('immutable'))).toBe(true);
    expect(headers.some((entry) => entry.source === '/embed/nesttuner-element.js')).toBe(true);
  });
});
