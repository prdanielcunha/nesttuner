type AudioSessionController = {
  type: string;
};

type NavigatorWithAudioSession = Navigator & {
  audioSession?: AudioSessionController;
};

export class ReferenceTone {
  private context: AudioContext | null = null;
  private oscillator: OscillatorNode | null = null;
  private gain: GainNode | null = null;
  private previousAudioSessionType: string | null = null;
  private prepared = false;

  private ensureContext(): AudioContext {
    if (!this.context || this.context.state === 'closed') {
      this.context = new AudioContext({ latencyHint: 'interactive' });
    }
    return this.context;
  }

  private configurePlaybackSession(): void {
    if (typeof navigator === 'undefined') return;
    const session = (navigator as NavigatorWithAudioSession).audioSession;
    if (!session) return;

    try {
      if (this.previousAudioSessionType == null) {
        this.previousAudioSessionType = session.type;
      }

      // iOS/WebKit can keep Web Audio on an ambient/ringer-muted route even
      // while AudioContext reports "running". Reassert a media playback
      // category from the user's gesture so reference tone remains audible
      // with the hardware silent switch enabled.
      if (session.type === 'playback') {
        session.type = 'ambient';
      }
      session.type = 'playback';
    } catch {
      // audioSession is an optional progressive enhancement.
    }
  }

  private restoreAudioSession(): void {
    if (this.previousAudioSessionType == null || typeof navigator === 'undefined') return;
    const session = (navigator as NavigatorWithAudioSession).audioSession;
    if (!session) return;

    try {
      session.type = this.previousAudioSessionType;
    } catch {
      // Ignore browsers exposing a readonly/partial implementation.
    } finally {
      this.previousAudioSessionType = null;
    }
  }

  private stopVoice(): void {
    const context = this.context;
    const oscillator = this.oscillator;
    const gain = this.gain;

    this.oscillator = null;
    this.gain = null;
    this.prepared = false;

    if (!context || !oscillator || !gain || context.state === 'closed') {
      try { oscillator?.stop(); } catch {}
      try { oscillator?.disconnect(); } catch {}
      try { gain?.disconnect(); } catch {}
      return;
    }

    const now = context.currentTime;
    try {
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(Math.max(0.0001, gain.gain.value), now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.02);
      oscillator.stop(now + 0.025);
    } catch {}

    globalThis.setTimeout(() => {
      try { oscillator.disconnect(); } catch {}
      try { gain.disconnect(); } catch {}
    }, 45);
  }

  /**
   * Unlocks and prepares the reference tone while the browser still considers
   * the call part of the user's tap/click gesture. Output stays effectively
   * silent until startPrepared() is called.
   */
  async prepare(frequency: number): Promise<void> {
    if (!Number.isFinite(frequency) || frequency <= 0) {
      throw new Error('Reference frequency must be a positive finite number.');
    }

    this.stopVoice();
    this.configurePlaybackSession();

    const context = this.ensureContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    const now = context.currentTime;
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, now);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);

    this.oscillator = oscillator;
    this.gain = gain;

    if (context.state === 'suspended') {
      await context.resume();
    }

    if (context.state !== 'running') {
      this.stopVoice();
      this.restoreAudioSession();
      throw new Error('REFERENCE_AUDIO_CONTEXT_NOT_RUNNING');
    }

    this.prepared = true;
  }

  startPrepared(): void {
    if (!this.prepared || !this.context || !this.gain || this.context.state !== 'running') {
      throw new Error('REFERENCE_TONE_NOT_PREPARED');
    }

    const now = this.context.currentTime;
    this.gain.gain.cancelScheduledValues(now);
    this.gain.gain.setValueAtTime(Math.max(0.0001, this.gain.gain.value), now);
    this.gain.gain.exponentialRampToValueAtTime(0.08, now + 0.025);
  }

  setFrequency(frequency: number): boolean {
    if (!Number.isFinite(frequency) || frequency <= 0) {
      throw new Error('Reference frequency must be a positive finite number.');
    }

    const context = this.context;
    const oscillator = this.oscillator;
    if (!context || !oscillator || context.state !== 'running') return false;

    const now = context.currentTime;
    const parameter = oscillator.frequency;

    try {
      parameter.cancelScheduledValues(now);
      parameter.setValueAtTime(Math.max(0.001, parameter.value), now);
      parameter.exponentialRampToValueAtTime(frequency, now + 0.018);
    } catch {
      parameter.value = frequency;
    }

    return true;
  }

  async play(frequency: number): Promise<void> {
    await this.prepare(frequency);
    this.startPrepared();
  }

  stop(): void {
    this.stopVoice();
    this.restoreAudioSession();
  }

  async dispose(): Promise<void> {
    this.stopVoice();
    this.restoreAudioSession();

    if (this.context && this.context.state !== 'closed') {
      await this.context.close();
    }
    this.context = null;
  }
}
