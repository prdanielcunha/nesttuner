import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ReferenceTone } from '@nesttuner/audio';

class FakeAudioParam {
  value = 0;
  ramps: number[] = [];

  setValueAtTime(value: number) {
    this.value = value;
    return this;
  }

  exponentialRampToValueAtTime(value: number) {
    this.value = value;
    this.ramps.push(value);
    return this;
  }

  cancelScheduledValues() {
    return this;
  }
}

class FakeGainNode {
  gain = new FakeAudioParam();
  connect() {}
  disconnect() {}
}

class FakeOscillatorNode {
  type: OscillatorType = 'sine';
  frequency = new FakeAudioParam();
  started = false;
  stopped = false;

  connect() {}
  disconnect() {}
  start() { this.started = true; }
  stop() { this.stopped = true; }
}

class FakeAudioContext {
  static last: FakeAudioContext | null = null;

  state: AudioContextState = 'suspended';
  currentTime = 1;
  destination = {};
  resumeCalls = 0;
  closeCalls = 0;
  oscillator = new FakeOscillatorNode();
  gain = new FakeGainNode();

  constructor() {
    FakeAudioContext.last = this;
  }

  createOscillator() {
    return this.oscillator;
  }

  createGain() {
    return this.gain;
  }

  async resume() {
    this.resumeCalls += 1;
    this.state = 'running';
  }

  async close() {
    this.closeCalls += 1;
    this.state = 'closed';
  }
}

const originalAudioContext = globalThis.AudioContext;
const originalNavigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');

beforeEach(() => {
  Object.defineProperty(globalThis, 'AudioContext', {
    configurable: true,
    writable: true,
    value: FakeAudioContext
  });
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { audioSession: { type: 'ambient' } }
  });
});

afterEach(() => {
  if (originalAudioContext) {
    Object.defineProperty(globalThis, 'AudioContext', {
      configurable: true,
      writable: true,
      value: originalAudioContext
    });
  } else {
    delete (globalThis as { AudioContext?: typeof AudioContext }).AudioContext;
  }

  if (originalNavigatorDescriptor) {
    Object.defineProperty(globalThis, 'navigator', originalNavigatorDescriptor);
  } else {
    delete (globalThis as { navigator?: Navigator }).navigator;
  }
  FakeAudioContext.last = null;
});

describe('ReferenceTone iOS playback contract', () => {
  it('unlocks Web Audio and selects playback before the tone becomes audible', async () => {
    const tone = new ReferenceTone();
    const ready = tone.prepare(440);

    const context = FakeAudioContext.last;
    expect(context).not.toBeNull();
    expect((navigator as Navigator & { audioSession: { type: string } }).audioSession.type).toBe('playback');

    await ready;

    expect(context?.resumeCalls).toBe(1);
    expect(context?.oscillator.started).toBe(true);
    expect(context?.oscillator.frequency.value).toBe(440);
    expect(context?.gain.gain.value).toBe(0.0001);

    tone.startPrepared();
    expect(context?.gain.gain.ramps).toContain(0.08);

    tone.stop();
    expect((navigator as Navigator & { audioSession: { type: string } }).audioSession.type).toBe('ambient');
  });

  it('keeps the AudioContext reusable across stop/play cycles', async () => {
    const tone = new ReferenceTone();

    await tone.play(440);
    const first = FakeAudioContext.last;
    tone.stop();

    await tone.play(442);
    expect(FakeAudioContext.last).toBe(first);
    expect(first?.oscillator.frequency.value).toBe(442);

    await tone.dispose();
    expect(first?.closeCalls).toBe(1);
  });

  it('retunes an active reference tone without rebuilding the audio session', async () => {
    const tone = new ReferenceTone();
    await tone.play(110);

    const context = FakeAudioContext.last;
    expect(tone.setFrequency(146.83)).toBe(true);
    expect(context?.oscillator.frequency.ramps).toContain(146.83);

    tone.stop();
  });

  it('prepares the tone before awaiting microphone teardown in the UI', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'packages/tuner-ui/src/NestTuner.tsx'),
      'utf8'
    );
    const prepareIndex = source.indexOf('const toneReady = tone.current.prepare(referenceFrequency)');
    const stopInputIndex = source.indexOf('await audio.current.stop()', prepareIndex);

    expect(prepareIndex).toBeGreaterThan(-1);
    expect(stopInputIndex).toBeGreaterThan(prepareIndex);
    expect(source).toContain('tone.current.setFrequency(referenceFrequency)');
    expect(source).toContain('aria-pressed={toneActive}');
  });
});
