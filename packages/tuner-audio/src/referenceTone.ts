export class ReferenceTone {
  private context: AudioContext | null = null;
  private oscillator: OscillatorNode | null = null;
  private gain: GainNode | null = null;

  async play(frequency: number): Promise<void> {
    this.stop();

    this.context = new AudioContext({ latencyHint: 'interactive' });
    this.oscillator = this.context.createOscillator();
    this.gain = this.context.createGain();

    const now = this.context.currentTime;
    this.oscillator.type = 'sine';
    this.oscillator.frequency.value = frequency;
    this.gain.gain.setValueAtTime(0.0001, now);
    this.gain.gain.exponentialRampToValueAtTime(0.055, now + 0.025);

    this.oscillator.connect(this.gain);
    this.gain.connect(this.context.destination);
    this.oscillator.start(now);

    if (this.context.state === 'suspended') await this.context.resume();
  }

  stop(): void {
    const context = this.context;
    const oscillator = this.oscillator;
    const gain = this.gain;

    if (context && oscillator && gain && context.state !== 'closed') {
      const now = context.currentTime;
      try {
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(Math.max(0.0001, gain.gain.value), now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.02);
        oscillator.stop(now + 0.025);
      } catch {}

      window.setTimeout(() => {
        try { oscillator.disconnect(); } catch {}
        try { gain.disconnect(); } catch {}
        if (context.state !== 'closed') void context.close();
      }, 45);
    } else {
      try { oscillator?.stop(); } catch {}
      try { oscillator?.disconnect(); } catch {}
      try { gain?.disconnect(); } catch {}
      if (context && context.state !== 'closed') void context.close();
    }

    this.oscillator = null;
    this.gain = null;
    this.context = null;
  }
}
