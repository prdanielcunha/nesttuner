import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

describe('versioned NestTuner embed contract', () => {
  it('publishes a new version without mutating the MusicScale-pinned 0.4 runtime', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    const embedConfig = fs.readFileSync(path.join(root, 'vite.embed.config.ts'), 'utf8');
    const element = fs.readFileSync(path.join(root, 'packages/tuner-embed/src/element.tsx'), 'utf8');
    const aliasScript = fs.readFileSync(path.join(root, 'scripts/create-embed-alias.mjs'), 'utf8');
    const preserveScript = fs.readFileSync(path.join(root, 'scripts/preserve-embed-releases.mjs'), 'utf8');
    const firebase = JSON.parse(fs.readFileSync(path.join(root, 'firebase.json'), 'utf8'));

    expect(pkg.version).toBe('0.5.0-beta.0');
    expect(pkg.scripts.build).toContain('copy-versioned-runtime.mjs');
    expect(embedConfig).toContain('assets/v${packageJson.version}');
    expect(element).toContain('../runtime/v${packageJson.version}/');
    expect(aliasScript).toContain('current-release.json');
    expect(aliasScript).toContain('runtime/v${pkg.version}/pitch-capture.worklet.js');

    expect(preserveScript).toContain('0.4.0-beta.0');
    expect(preserveScript).toContain('pitch.worker-B1reOsd4.js');
    expect(preserveScript).toContain('releases.json');

    expect(
      fs.readFileSync(
        path.join(root, 'packages/tuner-audio/assets/pitch-capture.worklet.js'),
        'utf8'
      )
    ).toContain("registerProcessor('nesttuner-capture'");

    const headers = firebase.hosting[0].headers as Array<{
      source: string;
      headers: Array<{ key: string; value: string }>;
    }>;
    for (const source of [
      '/embed/nesttuner-element.v*.js',
      '/embed/assets/**',
      '/runtime/**'
    ]) {
      const entry = headers.find(item => item.source === source);
      expect(entry).toBeTruthy();
      expect(
        entry!.headers.some(
          header =>
            header.key === 'Cache-Control' &&
            header.value.includes('immutable')
        )
      ).toBe(true);
    }

    expect(
      headers.some(entry => entry.source === '/embed/nesttuner-element.js')
    ).toBe(true);
  });
});
