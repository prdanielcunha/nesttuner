export * from './presets';
export * from './stabilizer';

export const NOTE_NAMES_SHARP = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'] as const;

export function midiToFrequency(midi: number, a4 = 440, offsetCents = 0): number {
  return a4 * Math.pow(2, (midi - 69) / 12) * Math.pow(2, offsetCents / 1200);
}

export function frequencyToMidi(frequency: number, a4 = 440): number {
  return 69 + 12 * Math.log2(frequency / a4);
}

export function nearestMidi(frequency: number, a4 = 440): number {
  return Math.round(frequencyToMidi(frequency, a4));
}

export function centsFromTarget(measured: number, target: number): number {
  return 1200 * Math.log2(measured / target);
}

export function midiToNote(midi: number): { name: string; octave: number; label: string } {
  const rounded = Math.round(midi);
  const name = NOTE_NAMES_SHARP[((rounded % 12) + 12) % 12];
  const octave = Math.floor(rounded / 12) - 1;
  return { name, octave, label: name + octave };
}

export function nearestNote(frequency: number, a4 = 440) {
  const midi = nearestMidi(frequency, a4);
  const note = midiToNote(midi);
  const target = midiToFrequency(midi, a4);
  return {
    ...note,
    midi,
    target,
    cents: centsFromTarget(frequency, target)
  };
}

export function closestTarget<T extends { midi: number }>(
  frequency: number,
  targets: T[],
  a4 = 440
): { target: T; cents: number; frequency: number } | null {
  let best: { target: T; cents: number; frequency: number } | null = null;
  for (const target of targets) {
    const targetFrequency = midiToFrequency(target.midi, a4);
    const cents = centsFromTarget(frequency, targetFrequency);
    if (!best || Math.abs(cents) < Math.abs(best.cents)) {
      best = { target, cents, frequency: targetFrequency };
    }
  }
  return best;
}
