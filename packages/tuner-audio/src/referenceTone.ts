export class ReferenceTone {
  private context: AudioContext | null = null;
  private oscillator: OscillatorNode | null = null;
  private gain: GainNode | null = null;

  async play(frequency: number): Promise<void> {
    this.stop();
    this.context = new AudioContext({ latencyHint: 'interactive' });
    this.oscillator = this.context.createOscillator();
    this.gain = this.context.createGain();

    this.oscillator.type = 'sine';
    this.oscillator.frequency.value = frequency;
    this.gain.gain.value = 0.055;

    this.oscillator.connect(this.gain);
    this.gain.connect(this.context.destination);
    this.oscillator.start();
  }

  stop(): void {
    try { this.oscillator?.stop(); } catch {}
    try { this.oscillator?.disconnect(); } catch {}
    try { this.gain?.disconnect(); } catch {}
    if (this.context && this.context.state !== 'closed') void this.context.close();

    this.oscillator = null;
    this.gain = null;
    this.context = null;
  }
}
