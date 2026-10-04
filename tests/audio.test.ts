import { describe, expect, it } from 'vitest';
import { analyzePitch } from '@nesttuner/audio';

function sine(frequency: number, sampleRate: number, length: number, amplitude = 0.5) {
  const data = new Float32Array(length);
  for (let i = 0; i < length; i += 1) data[i] = Math.sin(2 * Math.PI * frequency * i / sampleRate) * amplitude;
  return data;
}

describe('NestTuner DSP baseline', () => {
  it('detects A4 from deterministic PCM', () => {
    const result = analyzePitch(sine(440, 48000, 4096), 48000);
    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      const cents = 1200 * Math.log2(result.frequency / 440);
      expect(Math.abs(cents)).toBeLessThan(0.2);
      expect(result.clarity).toBeGreaterThan(0.9);
    }
  });

  it('detects low E2 using a longer window', () => {
    const expected = 82.4068892282;
    const result = analyzePitch(sine(expected, 48000, 8192), 48000);
    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      const cents = 1200 * Math.log2(result.frequency / expected);
      expect(Math.abs(cents)).toBeLessThan(0.35);
    }
  });

  it('does not call silence a pitch', () => {
    expect(analyzePitch(new Float32Array(4096), 48000).status).toBe('silence');
  });
});
