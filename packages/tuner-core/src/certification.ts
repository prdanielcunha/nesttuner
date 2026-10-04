export type CertificationSample = {
  capturedAt: number;
  referenceHz: number;
  measuredHz: number;
  centsError: number;
  clarity: number;
  dbfs: number;
  stable: boolean;
  analysisMs?: number;
  windowMs?: number;
};

export type CertificationSummary = {
  sampleCount: number;
  stableSampleCount: number;
  durationMs: number;
  p50AbsCents: number | null;
  p95AbsCents: number | null;
  maxAbsCents: number | null;
  meanSignedCents: number | null;
  stableRate: number | null;
  meanClarity: number | null;
  meanDbfs: number | null;
  p95AnalysisMs: number | null;
};

function percentile(values: number[], fraction: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil(sorted.length * fraction) - 1)
  );
  return sorted[index];
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

export function centsError(measuredHz: number, referenceHz: number): number {
  if (!Number.isFinite(measuredHz) || measuredHz <= 0) {
    throw new Error('measuredHz must be a positive finite number');
  }
  if (!Number.isFinite(referenceHz) || referenceHz <= 0) {
    throw new Error('referenceHz must be a positive finite number');
  }
  return 1200 * Math.log2(measuredHz / referenceHz);
}

export function createCertificationSample(input: {
  capturedAt?: number;
  referenceHz: number;
  measuredHz: number;
  clarity: number;
  dbfs: number;
  stable: boolean;
  analysisMs?: number;
  windowMs?: number;
}): CertificationSample {
  return {
    capturedAt: input.capturedAt ?? Date.now(),
    referenceHz: input.referenceHz,
    measuredHz: input.measuredHz,
    centsError: centsError(input.measuredHz, input.referenceHz),
    clarity: Number.isFinite(input.clarity) ? input.clarity : 0,
    dbfs: Number.isFinite(input.dbfs) ? input.dbfs : -120,
    stable: input.stable,
    analysisMs:
      input.analysisMs != null && Number.isFinite(input.analysisMs)
        ? input.analysisMs
        : undefined,
    windowMs:
      input.windowMs != null && Number.isFinite(input.windowMs)
        ? input.windowMs
        : undefined
  };
}

export function summarizeCertification(
  samples: CertificationSample[]
): CertificationSummary {
  if (samples.length === 0) {
    return {
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
    };
  }

  const valid = samples.filter(
    sample =>
      Number.isFinite(sample.capturedAt) &&
      Number.isFinite(sample.centsError) &&
      Number.isFinite(sample.clarity) &&
      Number.isFinite(sample.dbfs)
  );

  if (valid.length === 0) {
    return {
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
    };
  }

  const stableSamples = valid.filter(sample => sample.stable);
  const absoluteErrors = stableSamples.map(sample => Math.abs(sample.centsError));
  const signedErrors = stableSamples.map(sample => sample.centsError);
  const clarities = valid.map(sample => sample.clarity);
  const levels = valid.map(sample => sample.dbfs);
  const analysisTimes = valid
    .map(sample => sample.analysisMs)
    .filter((value): value is number => value != null && Number.isFinite(value));

  const first = valid.reduce(
    (minimum, sample) => Math.min(minimum, sample.capturedAt),
    valid[0].capturedAt
  );
  const last = valid.reduce(
    (maximum, sample) => Math.max(maximum, sample.capturedAt),
    valid[0].capturedAt
  );

  return {
    sampleCount: valid.length,
    stableSampleCount: stableSamples.length,
    durationMs: Math.max(0, last - first),
    p50AbsCents: percentile(absoluteErrors, 0.5),
    p95AbsCents: percentile(absoluteErrors, 0.95),
    maxAbsCents: absoluteErrors.length > 0 ? Math.max(...absoluteErrors) : null,
    meanSignedCents: mean(signedErrors),
    stableRate:
      valid.filter(sample => sample.stable).length / Math.max(1, valid.length),
    meanClarity: mean(clarities),
    meanDbfs: mean(levels),
    p95AnalysisMs: percentile(analysisTimes, 0.95)
  };
}
