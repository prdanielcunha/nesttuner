import { PitchDetector } from 'pitchy';

export type AnalysisResult =
  | { status: 'ok'; frequency: number; clarity: number; dbfs: number; clipping: boolean }
  | { status: 'silence' | 'weak' | 'clipping' | 'unclear'; clarity: number; dbfs: number; clipping: boolean };

const detectors = new Map<number, PitchDetector<Float32Array>>();

function detectorFor(length: number): PitchDetector<Float32Array> {
  let detector = detectors.get(length);
  if (!detector) {
    detector = PitchDetector.forFloat32Array(length);
    detectors.set(length, detector);
  }
  return detector;
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

export function analyzePitch(input: Float32Array, sampleRate: number): AnalysisResult {
  const { dbfs, clipping } = measureLevel(input);
  if (clipping) return { status: 'clipping', clarity: 0, dbfs, clipping: true };
  if (dbfs < -75) return { status: 'silence', clarity: 0, dbfs, clipping: false };
  if (dbfs < -58) return { status: 'weak', clarity: 0, dbfs, clipping: false };

  const frame = preprocess(input);
  const [frequency, clarity] = detectorFor(frame.length).findPitch(frame, sampleRate);

  if (!Number.isFinite(frequency) || frequency < 25 || frequency > 2600 || clarity < 0.72) {
    return { status: 'unclear', clarity, dbfs, clipping: false };
  }

  return { status: 'ok', frequency, clarity, dbfs, clipping: false };
}
