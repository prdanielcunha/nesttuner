import { analyzePitch, type AnalysisResult } from './analyze';

type WorkerRequest = {
  seq: number;
  samples: Float32Array;
  sampleRate: number;
};

type WorkerResponse = {
  seq: number;
  result: AnalysisResult | null;
};

const MAX = 16384;
const ring = new Float32Array(MAX);
let write = 0;
let filled = 0;
let lastFrequency = 220;

function append(block: Float32Array) {
  for (let i = 0; i < block.length; i += 1) {
    ring[write] = block[i];
    write = (write + 1) % MAX;
    filled = Math.min(MAX, filled + 1);
  }
}

function latest(length: number): Float32Array {
  const output = new Float32Array(length);
  let start = (write - length + MAX) % MAX;
  for (let i = 0; i < length; i += 1) {
    output[i] = ring[start];
    start = (start + 1) % MAX;
  }
  return output;
}

function windowFor(frequency: number): number {
  if (frequency < 55) return 16384;
  if (frequency < 110) return 8192;
  if (frequency < 220) return 4096;
  return 2048;
}

function analyzeWindow(size: number, sampleRate: number): AnalysisResult {
  const started = performance.now();
  const result = analyzePitch(latest(size), sampleRate);
  const analysisMs = performance.now() - started;
  return {
    ...result,
    windowSize: size,
    windowMs: (size / sampleRate) * 1000,
    analysisMs
  };
}

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const { seq, samples, sampleRate } = event.data;
  append(samples);

  if (filled < 2048) {
    const response: WorkerResponse = { seq, result: null };
    self.postMessage(response);
    return;
  }

  let result = analyzeWindow(Math.min(2048, filled), sampleRate);

  if (result.status === 'ok') {
    const desired = windowFor(result.frequency);
    if (desired > result.windowSize && filled >= desired) {
      result = analyzeWindow(desired, sampleRate);
    }
  } else {
    // Acquisition cascade: low strings must not depend on a short window
    // successfully guessing their frequency first.
    for (const size of [4096, 8192, 16384]) {
      if (filled < size) break;
      const candidate = analyzeWindow(size, sampleRate);
      result = candidate;
      if (candidate.status === 'ok') {
        const desired = windowFor(candidate.frequency);
        if (desired > size && filled >= desired) result = analyzeWindow(desired, sampleRate);
        break;
      }
    }
  }

  if (result.status === 'ok') lastFrequency = result.frequency;

  // Once locked, use the frequency-dependent window on future frames for
  // precision while preserving the fast 2048-sample acquisition path.
  const lockedWindow = windowFor(lastFrequency);
  if (
    result.status === 'ok' &&
    lockedWindow !== result.windowSize &&
    filled >= lockedWindow
  ) {
    const refined = analyzeWindow(lockedWindow, sampleRate);
    if (refined.status === 'ok') {
      result = refined;
      lastFrequency = refined.frequency;
    }
  }

  const response: WorkerResponse = { seq, result };
  self.postMessage(response);
};
