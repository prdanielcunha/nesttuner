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

    this.frames.push(frame);
    if (this.frames.length > this.maxFrames) this.frames.shift();

    const frequencies = this.frames.map((item) => item.frequency);
    const center = median(frequencies);
    const centsSpread = Math.max(...frequencies.map((value) => Math.abs(1200 * Math.log2(value / center))));
    const stable = this.frames.length >= 3 && centsSpread <= 8 && frame.clarity >= 0.82;

    return {
      frequency: center,
      clarity: median(this.frames.map((item) => item.clarity)),
      dbfs: median(this.frames.map((item) => item.dbfs)),
      clipping: this.frames.some((item) => item.clipping),
      stable
    };
  }
}
