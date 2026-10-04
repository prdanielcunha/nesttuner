import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const source = fs.readFileSync(
  path.join(process.cwd(), 'packages/tuner-ui/src/NestTuner.tsx'),
  'utf8'
);

describe('NestTuner real-time truth contract', () => {
  it('does not invent a default detected note before audio exists', () => {
    expect(source).not.toContain("chromatic?.midi ?? 59");
    expect(source).toContain("chromatic?.midi ?? null");
  });

  it('does not render a fake zero-cent measurement without a pitch', () => {
    expect(source).not.toContain("'±0,0'");
    expect(source).not.toContain("'±0.0'");
    expect(source).toContain(": '—'");
  });

  it('keeps physical Fine certification fail-closed', () => {
    expect(source).toContain('const physicalFineCertified = false');
  });

  it('applies the global cent offset consistently to target matching', () => {
    expect(source).toContain('const effectiveA4 = a4 * Math.pow(2, offset / 1200)');
    expect(source).toContain('closestTarget(measuredFrequency, preset.strings, effectiveA4)');
    expect(source).toContain('nearestNote(measuredFrequency, effectiveA4, accidental)');
  });
});
