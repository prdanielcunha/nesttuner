import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('NestTuner embedded host shell', () => {
  it('renders embedded mode from the MusicScale query contract', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'apps/web/src/main.tsx'), 'utf8');
    expect(source).toContain("params.get('embed') === 'musicscale'");
    expect(source).toContain('embedded={embedded}');
    expect(source).toContain("type: 'nesttuner:navigate-back'");
  });

  it('keeps the embedded shell visually distinct from the public app', () => {
    const css = fs.readFileSync(path.join(process.cwd(), 'apps/web/src/styles.css'), 'utf8');
    expect(css).toContain('nesttuner-embedded-host');
    expect(css).toContain('.nesttuner.embedded .mobile-context');
  });
});
