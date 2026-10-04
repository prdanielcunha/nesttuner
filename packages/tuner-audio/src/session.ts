import type { AnalysisResult } from './analyze';

export type AudioInputDevice = { deviceId: string; label: string };

export class UnsupportedAudioCaptureError extends Error {
  constructor(message = 'Required Web Audio capture features are unavailable.') {
    super(message);
    this.name = 'UnsupportedAudioCaptureError';
  }
}

export class TunerAudioSession {
  private readonly assetBaseUrl: string;
  private stream: MediaStream | null = null;
  private context: AudioContext | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private capture: AudioWorkletNode | null = null;
  private silentGain: GainNode | null = null;
  private worker: Worker | null = null;
  private onAnalysis: ((result: AnalysisResult) => void) | null = null;
  private onInterrupted: (() => void) | null = null;

  constructor(assetBaseUrl?: string) {
    this.assetBaseUrl = assetBaseUrl ?? (
      typeof window !== 'undefined'
        ? new URL('/', window.location.href).href
        : 'http://localhost/'
    );
  }

  private assetUrl(path: string): string {
    return new URL(path.replace(/^\//, ''), this.assetBaseUrl).href;
  }

  static isSupported(): boolean {
    return Boolean(
      typeof navigator.mediaDevices?.getUserMedia === 'function' &&
      typeof AudioContext !== 'undefined' &&
      'audioWorklet' in AudioContext.prototype &&
      typeof AudioWorkletNode !== 'undefined' &&
      typeof Worker !== 'undefined'
    );
  }

  async start(
    onAnalysis: (result: AnalysisResult) => void,
    deviceId?: string,
    onInterrupted?: () => void
  ): Promise<void> {
    await this.stop();
    if (!TunerAudioSession.isSupported()) throw new UnsupportedAudioCaptureError();

    this.onAnalysis = onAnalysis;
    this.onInterrupted = onInterrupted ?? null;

    const constraints: MediaTrackConstraints = {
      channelCount: { ideal: 1 },
      echoCancellation: { ideal: false },
      noiseSuppression: { ideal: false },
      autoGainControl: { ideal: false },
      ...(deviceId ? { deviceId: { exact: deviceId } } : {})
    };

    this.stream = await navigator.mediaDevices.getUserMedia({ audio: constraints, video: false });
    const track = this.stream.getAudioTracks()[0];
    track?.addEventListener('ended', () => this.onInterrupted?.(), { once: true });

    this.context = new AudioContext({ latencyHint: 'interactive' });
    if (!this.context.audioWorklet) throw new UnsupportedAudioCaptureError();
    await this.context.audioWorklet.addModule(this.assetUrl('pitch-capture.worklet.js'));

    this.worker = new Worker(new URL('./pitch.worker.ts', import.meta.url), { type: 'module' });
    this.worker.onmessage = (event: MessageEvent<AnalysisResult>) => this.onAnalysis?.(event.data);

    this.source = this.context.createMediaStreamSource(this.stream);
    this.capture = new AudioWorkletNode(this.context, 'nesttuner-capture', {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [1]
    });

    this.silentGain = this.context.createGain();
    this.silentGain.gain.value = 0;

    this.capture.port.onmessage = (event: MessageEvent<Float32Array>) => {
      if (!this.worker || !this.context) return;
      const samples = event.data;
      this.worker.postMessage({ samples, sampleRate: this.context.sampleRate }, [samples.buffer]);
    };

    this.source.connect(this.capture);
    this.capture.connect(this.silentGain);
    this.silentGain.connect(this.context.destination);

    if (this.context.state === 'suspended') await this.context.resume();
  }

  async listInputs(): Promise<AudioInputDevice[]> {
    if (!navigator.mediaDevices?.enumerateDevices) return [];
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices
      .filter((device) => device.kind === 'audioinput')
      .map((device, index) => ({
        deviceId: device.deviceId,
        label: device.label || 'Audio input ' + (index + 1)
      }));
  }

  getEffectiveSettings(): MediaTrackSettings | null {
    return this.stream?.getAudioTracks()[0]?.getSettings() ?? null;
  }

  async stop(): Promise<void> {
    this.onInterrupted = null;
    this.worker?.terminate();
    this.worker = null;

    try { this.capture?.disconnect(); } catch {}
    try { this.source?.disconnect(); } catch {}
    try { this.silentGain?.disconnect(); } catch {}

    this.capture = null;
    this.source = null;
    this.silentGain = null;

    for (const track of this.stream?.getTracks() ?? []) track.stop();
    this.stream = null;

    if (this.context && this.context.state !== 'closed') {
      await this.context.close();
    }
    this.context = null;
  }
}
