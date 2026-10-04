export * from './presets';
export * from './stabilizer';

export type AccidentalPreference = 'sharp' | 'flat';

export const NOTE_NAMES_SHARP = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'] as const;
export const NOTE_NAMES_FLAT = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'] as const;

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

export function midiToNote(
  midi: number,
  accidental: AccidentalPreference = 'sharp'
): { name: string; octave: number; label: string } {
  const rounded = Math.round(midi);
  const names = accidental === 'flat' ? NOTE_NAMES_FLAT : NOTE_NAMES_SHARP;
  const name = names[((rounded % 12) + 12) % 12];
  const octave = Math.floor(rounded / 12) - 1;
  return { name, octave, label: name + octave };
}

export function nearestNote(
  frequency: number,
  a4 = 440,
  accidental: AccidentalPreference = 'sharp'
) {
  const midi = nearestMidi(frequency, a4);
  const note = midiToNote(midi, accidental);
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

/**
 * Monophonic pitch estimators can occasionally lock an octave high/low.
 * When an instrument preset is active, this function uses the known open-string
 * targets only as a conservative disambiguation hint. It never moves a reading
 * unless an octave-related candidate lands very close to a valid target while
 * the raw candidate is materially farther away.
 */
export function resolveOctaveAgainstTargets<T extends { midi: number }>(
  measured: number,
  targets: T[],
  a4 = 440
): number {
  if (!Number.isFinite(measured) || measured <= 0 || targets.length === 0) return measured;

  const variants = [measured / 2, measured, measured * 2].filter((value) => value >= 25 && value <= 2600);
  const scored = variants.map((value) => {
    const closest = closestTarget(value, targets, a4);
    return { value, distance: Math.abs(closest?.cents ?? Number.POSITIVE_INFINITY) };
  });

  const raw = scored.find((item) => Math.abs(item.value - measured) < 1e-9) ?? scored[0];
  const best = scored.reduce((winner, item) => item.distance < winner.distance ? item : winner, scored[0]);

  if (best.value !== measured && best.distance <= 45 && raw.distance >= 120) {
    return best.value;
  }

  return measured;
}
