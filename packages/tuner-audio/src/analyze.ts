import { PitchDetector } from 'pitchy';

export type HarmonicCorrection = 'none' | 'octave-down' | 'octave-up';

export type AnalysisResult =
  | {
      status: 'ok';
      frequency: number;
      rawFrequency: number;
      clarity: number;
      harmonicity: number;
      correction: HarmonicCorrection;
      dbfs: number;
      clipping: boolean;
      windowSize: number;
      windowMs?: number;
      analysisMs?: number;
    }
  | {
      status: 'silence' | 'weak' | 'clipping' | 'unclear';
      clarity: number;
      harmonicity: number;
      dbfs: number;
      clipping: boolean;
      windowSize: number;
      windowMs?: number;
      analysisMs?: number;
    };

const detectors = new Map<number, PitchDetector<Float32Array>>();
const hannWindows = new Map<number, Float32Array>();

function detectorFor(length: number): PitchDetector<Float32Array> {
  let detector = detectors.get(length);
  if (!detector) {
    detector = PitchDetector.forFloat32Array(length);
    detectors.set(length, detector);
  }
  return detector;
}

function hannWindow(length: number): Float32Array {
  let window = hannWindows.get(length);
  if (window) return window;

  window = new Float32Array(length);
  const denominator = Math.max(1, length - 1);
  for (let i = 0; i < length; i += 1) {
    window[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / denominator);
  }
  hannWindows.set(length, window);
  return window;
}

export function preprocess(input: Float32Array): Float32Array {
  let mean = 0;
  for (let i = 0; i < input.length; i += 1) mean += input[i];
  mean /= input.length || 1;

  const output = new Float32Array(input.length);
  for (let i = 0; i < input.length; i += 1) output[i] = input[i] - mean;
  return output;
}

export function measureLevel(input: Float32Array): { dbfs: number; clipping: boolean } {
  let square = 0;
  let clipped = 0;
  for (let i = 0; i < input.length; i += 1) {
    const value = input[i];
    square += value * value;
    if (Math.abs(value) >= 0.985) clipped += 1;
  }
  const rms = Math.sqrt(square / Math.max(1, input.length));
  const dbfs = rms > 0 ? 20 * Math.log10(rms) : -120;
  return {
    dbfs,
    clipping: clipped / Math.max(1, input.length) > 0.002
  };
}

function goertzelPower(
  input: Float32Array,
  sampleRate: number,
  frequency: number,
  window: Float32Array
): number {
  if (frequency <= 0 || frequency >= sampleRate / 2) return 0;

  const omega = (2 * Math.PI * frequency) / sampleRate;
  const coeff = 2 * Math.cos(omega);
  let q0 = 0;
  let q1 = 0;
  let q2 = 0;

  for (let i = 0; i < input.length; i += 1) {
    q0 = coeff * q1 - q2 + input[i] * window[i];
    q2 = q1;
    q1 = q0;
  }

  return Math.max(0, q1 * q1 + q2 * q2 - coeff * q1 * q2);
}

function harmonicSupport(
  input: Float32Array,
  sampleRate: number,
  candidate: number
): number {
  if (!Number.isFinite(candidate) || candidate < 25 || candidate > 2600) return 0;

  const window = hannWindow(input.length);
  let frameEnergy = 0;
  for (let i = 0; i < input.length; i += 1) {
    const value = input[i] * window[i];
    frameEnergy += value * value;
  }
  const normalization = Math.max(1e-12, frameEnergy * input.length);
  const weights = [1, 0.72, 0.5, 0.34, 0.23, 0.16];

  let score = 0;
  let supportedPartials = 0;
  for (let harmonic = 1; harmonic <= weights.length; harmonic += 1) {
    const frequency = candidate * harmonic;
    if (frequency >= sampleRate / 2) break;

    // Compare amplitudes rather than raw spectral power. This deliberately
    // compresses a dominant 2nd harmonic so a real fundamental with a coherent
    // 1f/2f/3f series can beat the classic octave-up failure mode.
    const normalizedPower = goertzelPower(input, sampleRate, frequency, window) / normalization;
    const amplitude = Math.sqrt(Math.max(0, normalizedPower));
    score += weights[harmonic - 1] * amplitude;

    if (harmonic >= 2 && amplitude > 0.018) supportedPartials += 1;
    if (harmonic === 3) score += amplitude * 0.16;
  }

  // Reward candidates whose harmonic family contains several consecutive
  // partials; octave-up candidates usually explain only the even subset.
  score += Math.max(0, supportedPartials - 1) * 0.035;

  // If a strong subharmonic exists, an octave-up candidate is less plausible.
  if (candidate >= 50) {
    const subharmonicPower = goertzelPower(input, sampleRate, candidate / 2, window) / normalization;
    score -= Math.min(0.18, Math.sqrt(Math.max(0, subharmonicPower)) * 0.34);
  }

  return Math.max(0, score);
}

function correctOctave(
  frame: Float32Array,
  sampleRate: number,
  rawFrequency: number
): { frequency: number; harmonicity: number; correction: HarmonicCorrection } {
  const candidates = [
    { frequency: rawFrequency / 2, correction: 'octave-down' as const },
    { frequency: rawFrequency, correction: 'none' as const },
    { frequency: rawFrequency * 2, correction: 'octave-up' as const }
  ].filter((item) => item.frequency >= 25 && item.frequency <= 2600);

  const scored = candidates.map((item) => ({
    ...item,
    score: harmonicSupport(frame, sampleRate, item.frequency)
  }));

  const raw = scored.find((item) => item.correction === 'none') ?? scored[0];
  const best = scored.reduce((winner, item) => item.score > winner.score ? item : winner, scored[0]);

  const materiallyBetter =
    best.correction !== 'none' &&
    best.score > raw.score * 1.04 &&
    best.score - raw.score > 0.008;

  const selected = materiallyBetter ? best : raw;
  return {
    frequency: selected.frequency,
    harmonicity: Math.min(1, selected.score / 1.35),
    correction: selected.correction
  };
}

export function analyzePitch(input: Float32Array, sampleRate: number): AnalysisResult {
  const { dbfs, clipping } = measureLevel(input);
  const base = {
    dbfs,
    clipping,
    windowSize: input.length,
    harmonicity: 0
  };

  if (clipping) return { status: 'clipping', clarity: 0, ...base };
  if (dbfs < -78) return { status: 'silence', clarity: 0, ...base };
  if (dbfs < -60) return { status: 'weak', clarity: 0, ...base };

  const frame = preprocess(input);
  const [rawFrequency, clarity] = detectorFor(frame.length).findPitch(frame, sampleRate);

  if (!Number.isFinite(rawFrequency) || rawFrequency < 25 || rawFrequency > 2600 || clarity < 0.70) {
    return { status: 'unclear', clarity: Number.isFinite(clarity) ? clarity : 0, ...base };
  }

  const corrected = correctOctave(frame, sampleRate, rawFrequency);

  return {
    status: 'ok',
    frequency: corrected.frequency,
    rawFrequency,
    clarity,
    harmonicity: corrected.harmonicity,
    correction: corrected.correction,
    dbfs,
    clipping: false,
    windowSize: input.length
  };
}
