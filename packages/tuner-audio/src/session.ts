import type { AnalysisResult } from './analyze';

export type AudioInputDevice = { deviceId: string; label: string };

export class TunerAudioSession {
  private stream: MediaStream | null = null;
  private context: AudioContext | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private capture: AudioWorkletNode | null = null;
  private silentGain: GainNode | null = null;
  private worker: Worker | null = null;
  private onAnalysis: ((result: AnalysisResult) => void) | null = null;

  async start(onAnalysis: (result: AnalysisResult) => void, deviceId?: string): Promise<void> {
    await this.stop();
    this.onAnalysis = onAnalysis;

    const constraints: MediaTrackConstraints = {
      channelCount: { ideal: 1 },
      echoCancellation: { ideal: false },
      noiseSuppression: { ideal: false },
      autoGainControl: { ideal: false },
      ...(deviceId ? { deviceId: { exact: deviceId } } : {})
    };

    this.stream = await navigator.mediaDevices.getUserMedia({ audio: constraints, video: false });
    this.context = new AudioContext({ latencyHint: 'interactive' });
    await this.context.audioWorklet.addModule('/pitch-capture.worklet.js');

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

  async pause(): Promise<void> {
    if (this.context?.state === 'running') await this.context.suspend();
  }

  async resume(): Promise<void> {
    if (this.context?.state === 'suspended') await this.context.resume();
  }

  async listInputs(): Promise<AudioInputDevice[]> {
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
