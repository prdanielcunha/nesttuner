export type PitchFrame = {
  frequency: number;
  clarity: number;
  dbfs: number;
  clipping: boolean;
};

export type StablePitch = PitchFrame & {
  stable: boolean;
};

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function centsBetween(a: number, b: number): number {
  return 1200 * Math.log2(a / b);
}

function foldLikelyOctave(frequency: number, center: number): number {
  const candidates = [frequency / 2, frequency, frequency * 2];
  let best = frequency;
  let bestDistance = Math.abs(centsBetween(frequency, center));

  for (const candidate of candidates) {
    const distance = Math.abs(centsBetween(candidate, center));
    if (distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }

  const originalDistance = Math.abs(centsBetween(frequency, center));
  return originalDistance > 900 && bestDistance < 70 ? best : frequency;
}

export class PitchStabilizer {
  private frames: PitchFrame[] = [];

  constructor(private readonly maxFrames = 5) {}

  reset(): void {
    this.frames = [];
  }

  push(frame: PitchFrame | null): StablePitch | null {
    if (!frame || !Number.isFinite(frame.frequency) || frame.frequency <= 0) {
      this.reset();
      return null;
    }

    let accepted = frame;

    if (this.frames.length >= 2) {
      const center = median(this.frames.map((item) => item.frequency));
      const folded = foldLikelyOctave(frame.frequency, center);
      accepted = { ...frame, frequency: folded };

      const jump = Math.abs(centsBetween(accepted.frequency, center));
      if (jump > 150) {
        this.frames = [accepted];
        return { ...accepted, stable: false };
      }
    }

    this.frames.push(accepted);
    if (this.frames.length > this.maxFrames) this.frames.shift();

    const frequencies = this.frames.map((item) => item.frequency);
    const center = median(frequencies);
    const centsSpread = Math.max(...frequencies.map((value) => Math.abs(centsBetween(value, center))));
    const stable = this.frames.length >= 3 && centsSpread <= 8 && accepted.clarity >= 0.82;

    return {
      frequency: center,
      clarity: median(this.frames.map((item) => item.clarity)),
      dbfs: median(this.frames.map((item) => item.dbfs)),
      clipping: this.frames.some((item) => item.clipping),
      stable
    };
  }
}
