import { describe, expect, it } from 'vitest';
import { analyzePitch } from '@nesttuner/audio';
import { PitchStabilizer } from '@nesttuner/core';

function deterministicNoise(index: number): number {
  const x = Math.sin(index * 12.9898 + 78.233) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}

function signal(
  frequency: number,
  sampleRate: number,
  length: number,
  options: { noise?: number; harmonics?: boolean } = {}
) {
  const data = new Float32Array(length);
  for (let i = 0; i < length; i += 1) {
    const t = i / sampleRate;
    let value = 0.52 * Math.sin(2 * Math.PI * frequency * t);
    if (options.harmonics) {
      value += 0.17 * Math.sin(2 * Math.PI * frequency * 2 * t);
      value += 0.08 * Math.sin(2 * Math.PI * frequency * 3 * t);
    }
    if (options.noise) value += deterministicNoise(i) * options.noise;
    data[i] = value;
  }
  return data;
}

function cents(measured: number, target: number) {
  return 1200 * Math.log2(measured / target);
}

describe('NestTuner synthetic precision bench', () => {
  const cases = [
    { note: 'B0', hz: 30.867706, size: 16384, tolerance: 0.55 },
    { note: 'E1', hz: 41.203445, size: 16384, tolerance: 0.50 },
    { note: 'E2', hz: 82.406889, size: 8192, tolerance: 0.35 },
    { note: 'A2', hz: 110, size: 4096, tolerance: 0.30 },
    { note: 'B3', hz: 246.941651, size: 4096, tolerance: 0.25 },
    { note: 'E4', hz: 329.627557, size: 2048, tolerance: 0.30 },
    { note: 'A4', hz: 440, size: 2048, tolerance: 0.25 },
    { note: 'E5', hz: 659.255114, size: 2048, tolerance: 0.35 }
  ];

  for (const item of cases) {
    it('measures ' + item.note + ' within the synthetic target', () => {
      const result = analyzePitch(signal(item.hz, 48000, item.size), 48000);
      expect(result.status).toBe('ok');
      if (result.status === 'ok') {
        expect(Math.abs(cents(result.frequency, item.hz))).toBeLessThanOrEqual(item.tolerance);
      }
    });
  }

  it('keeps sub-cent performance with realistic harmonics and quiet noise', () => {
    const target = 329.627557;
    const result = analyzePitch(signal(target, 48000, 4096, { harmonics: true, noise: 0.004 }), 48000);
    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(Math.abs(cents(result.frequency, target))).toBeLessThanOrEqual(1);
      expect(result.clarity).toBeGreaterThan(0.8);
    }
  });

  it('suppresses a single octave glitch after lock', () => {
    const stabilizer = new PitchStabilizer();
    const base = { clarity: 0.98, dbfs: -18, clipping: false };
    stabilizer.push({ ...base, frequency: 110 });
    stabilizer.push({ ...base, frequency: 110.02 });
    const stable = stabilizer.push({ ...base, frequency: 220.01 });
    expect(stable).not.toBeNull();
    expect(stable!.frequency).toBeGreaterThan(109.9);
    expect(stable!.frequency).toBeLessThan(110.1);
  });

  it('abandons stale lock quickly when the musician changes notes', () => {
    const stabilizer = new PitchStabilizer();
    const base = { clarity: 0.98, dbfs: -18, clipping: false };
    stabilizer.push({ ...base, frequency: 110 });
    stabilizer.push({ ...base, frequency: 110.01 });
    const changed = stabilizer.push({ ...base, frequency: 146.83 });
    expect(changed?.stable).toBe(false);
    expect(changed?.frequency).toBeCloseTo(146.83, 2);
  });
});
