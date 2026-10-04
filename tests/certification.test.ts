import { describe, expect, it } from 'vitest';
import {
  centsError,
  createCertificationSample,
  summarizeCertification
} from '@nesttuner/core';

describe('physical certification metrics', () => {
  it('computes signed cents against an independent reference frequency', () => {
    expect(centsError(440, 440)).toBeCloseTo(0, 10);
    expect(centsError(440 * Math.pow(2, 5 / 1200), 440)).toBeCloseTo(5, 8);
    expect(centsError(440 * Math.pow(2, -7 / 1200), 440)).toBeCloseTo(-7, 8);
  });

  it('summarizes p50, p95, max, stability and processing time deterministically', () => {
    const errors = [-4, -2, -1, 0, 1, 2, 3, 8, 10, 20];
    const samples = errors.map((error, index) =>
      createCertificationSample({
        capturedAt: 1_000 + index * 100,
        referenceHz: 440,
        measuredHz: 440 * Math.pow(2, error / 1200),
        clarity: 0.8 + index * 0.01,
        dbfs: -30 + index,
        stable: index < 8,
        analysisMs: 2 + index,
        windowMs: 80
      })
    );

    const summary = summarizeCertification(samples);

    expect(summary.sampleCount).toBe(10);
    expect(summary.stableSampleCount).toBe(8);
    expect(summary.durationMs).toBe(900);
    expect(summary.p50AbsCents).toBeCloseTo(2, 8);
    expect(summary.p95AbsCents).toBeCloseTo(8, 8);
    expect(summary.maxAbsCents).toBeCloseTo(8, 8);
    expect(summary.meanSignedCents).toBeCloseTo(0.875, 8);
    expect(summary.stableRate).toBeCloseTo(0.8, 8);
    expect(summary.meanClarity).toBeCloseTo(0.845, 8);
    expect(summary.meanDbfs).toBeCloseTo(-25.5, 8);
    expect(summary.p95AnalysisMs).toBeCloseTo(11, 8);
  });

  it('returns a truthful empty summary when no physical samples exist', () => {
    expect(summarizeCertification([])).toEqual({
      sampleCount: 0,
      stableSampleCount: 0,
      durationMs: 0,
      p50AbsCents: null,
      p95AbsCents: null,
      maxAbsCents: null,
      meanSignedCents: null,
      stableRate: null,
      meanClarity: null,
      meanDbfs: null,
      p95AnalysisMs: null
    });
  });
});
