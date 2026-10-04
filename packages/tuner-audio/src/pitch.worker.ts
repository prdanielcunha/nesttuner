import { analyzePitch } from './analyze';

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

self.onmessage = (event: MessageEvent<{ samples: Float32Array; sampleRate: number }>) => {
  const { samples, sampleRate } = event.data;
  append(samples);

  let size = windowFor(lastFrequency);
  if (filled < size) {
    if (filled >= 2048) size = 2048;
    else return;
  }

  let result = analyzePitch(latest(size), sampleRate);

  if (result.status === 'ok') {
    lastFrequency = result.frequency;
    const refinedSize = windowFor(result.frequency);
    if (refinedSize !== size && filled >= refinedSize) {
      result = analyzePitch(latest(refinedSize), sampleRate);
      if (result.status === 'ok') lastFrequency = result.frequency;
    }
  }

  self.postMessage(result);
};
