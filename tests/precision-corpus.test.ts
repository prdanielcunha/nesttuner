import { describe, expect, it } from 'vitest';
import { analyzePitch } from '@nesttuner/audio';

function noise(index: number, seed: number): number {
  const x = Math.sin((index + seed * 997) * 12.9898 + 78.233) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}

function windowFor(frequency: number): number {
  if (frequency < 55) return 16384;
  if (frequency < 110) return 8192;
  if (frequency < 220) return 4096;
  return 2048;
}

function synthetic(
  frequency: number,
  sampleRate: number,
  length: number,
  seed: number,
  noiseAmplitude: number,
  harmonicRich: boolean
): Float32Array {
  const data = new Float32Array(length);
  for (let i = 0; i < length; i += 1) {
    const t = i / sampleRate;
    let value = 0.50 * Math.sin(2 * Math.PI * frequency * t);
    if (harmonicRich) {
      value += 0.18 * Math.sin(2 * Math.PI * frequency * 2 * t + 0.13);
      value += 0.09 * Math.sin(2 * Math.PI * frequency * 3 * t + 0.31);
      value += 0.045 * Math.sin(2 * Math.PI * frequency * 4 * t + 0.51);
    }
    value += noise(i, seed) * noiseAmplitude;
    data[i] = value;
  }
  return data;
}

function cents(measured: number, expected: number): number {
  return 1200 * Math.log2(measured / expected);
}

function percentile(values: number[], fraction: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1);
  return sorted[Math.max(0, index)];
}

describe('NestTuner precision corpus', () => {
  it('holds the roadmap p95 synthetic precision target from 55 to 1000 Hz', () => {
    const baseFrequencies = [61.735413, 82.406889, 110, 146.832384, 196, 246.941651, 329.627557, 440, 659.255114, 880];
    const offsets = [-35, -12, -3, 0, 3, 12, 35];
    const errors: number[] = [];

    for (const sampleRate of [44100, 48000]) {
      for (const base of baseFrequencies) {
        for (const offset of offsets) {
          const expected = base * Math.pow(2, offset / 1200);
          const length = windowFor(expected);
          for (const harmonicRich of [false, true]) {
            const frame = synthetic(expected, sampleRate, length, offset + Math.round(base), 0.0025, harmonicRich);
            const result = analyzePitch(frame, sampleRate);
            expect(result.status, `${base}Hz @ ${offset}c, ${sampleRate}Hz`).toBe('ok');
            if (result.status === 'ok') errors.push(Math.abs(cents(result.frequency, expected)));
          }
        }
      }
    }

    expect(errors.length).toBeGreaterThan(200);
    expect(percentile(errors, 0.95)).toBeLessThanOrEqual(0.2);
    expect(Math.max(...errors)).toBeLessThanOrEqual(0.8);
  });

  it('holds the roadmap p95 synthetic precision target for B0 through 55 Hz', () => {
    const baseFrequencies = [30.867706, 32.703196, 36.708096, 41.203445, 43.653529, 49, 55];
    const offsets = [-25, -8, 0, 8, 25];
    const errors: number[] = [];

    for (const sampleRate of [44100, 48000]) {
      for (const base of baseFrequencies) {
        for (const offset of offsets) {
          const expected = base * Math.pow(2, offset / 1200);
          const length = 16384;
          const frame = synthetic(expected, sampleRate, length, Math.round(base * 10) + offset, 0.0015, true);
          const result = analyzePitch(frame, sampleRate);
          expect(result.status, `${base}Hz @ ${offset}c, ${sampleRate}Hz`).toBe('ok');
          if (result.status === 'ok') errors.push(Math.abs(cents(result.frequency, expected)));
        }
      }
    }

    expect(errors.length).toBe(70);
    expect(percentile(errors, 0.95)).toBeLessThanOrEqual(0.5);
    expect(Math.max(...errors)).toBeLessThanOrEqual(1.2);
  });

  it('rejects broadband noise rather than inventing a confident note', () => {
    for (let seed = 1; seed <= 12; seed += 1) {
      const frame = new Float32Array(8192);
      for (let i = 0; i < frame.length; i += 1) frame[i] = noise(i, seed) * 0.25;
      const result = analyzePitch(frame, 48000);
      expect(result.status).not.toBe('ok');
    }
  });
});
