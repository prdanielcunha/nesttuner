import { describe, expect, it } from 'vitest';
import { centsFromTarget, closestTarget, midiToFrequency, nearestNote, noteToMidi, presetsForInstrument, resolveOctaveAgainstTargets } from '@nesttuner/core';

describe('NestTuner core music math', () => {
  it('maps A4 exactly at the selected reference', () => {
    expect(midiToFrequency(69, 440)).toBeCloseTo(440, 10);
    expect(midiToFrequency(69, 442)).toBeCloseTo(442, 10);
  });

  it('maps standard guitar octaves without ambiguity', () => {
    expect(noteToMidi('E2')).toBe(40);
    expect(noteToMidi('E4')).toBe(64);
    const standard = presetsForInstrument('guitar')[0];
    expect(standard.strings.map((item) => item.note)).toEqual(['E2','A2','D3','G3','B3','E4']);
    expect(standard.strings.map((item) => item.id)).toEqual(['6','5','4','3','2','1']);
  });

  it('computes cents direction correctly', () => {
    expect(centsFromTarget(440, 440)).toBeCloseTo(0, 8);
    expect(centsFromTarget(441, 440)).toBeGreaterThan(0);
    expect(centsFromTarget(439, 440)).toBeLessThan(0);
  });

  it('finds B3 near 246.94 Hz', () => {
    const note = nearestNote(246.94, 440);
    expect(note.label).toBe('B3');
    expect(Math.abs(note.cents)).toBeLessThan(0.1);
  });

  it('supports flat spelling and common orchestral presets', () => {
    expect(noteToMidi('Eb2')).toBe(39);
    expect(nearestNote(311.126984, 440, 'flat').label).toBe('Eb4');
    expect(presetsForInstrument('violin')[0].strings.map((item) => item.note)).toEqual(['G3','D4','A4','E5']);
    expect(presetsForInstrument('cello')[0].strings.map((item) => item.note)).toEqual(['C2','G2','D3','A3']);
    expect(presetsForInstrument('bass').some((preset) => preset.id === 'bass-6-standard')).toBe(true);
  });

  it('uses known open strings only to resolve clear octave ambiguity', () => {
    const standard = presetsForInstrument('guitar')[0];
    expect(resolveOctaveAgainstTargets(220, standard.strings, 440)).toBeCloseTo(110, 6);
    expect(resolveOctaveAgainstTargets(246.94, standard.strings, 440)).toBeCloseTo(246.94, 6);
  });

  it('honors per-string microtuning offsets when selecting a target', () => {
    const target = { midi: 69, offsetCents: 10 };
    const exact = midiToFrequency(69, 440, 10);
    const match = closestTarget(exact, [target], 440);
    expect(match).not.toBeNull();
    expect(match!.frequency).toBeCloseTo(exact, 10);
    expect(match!.cents).toBeCloseTo(0, 8);
  });

  it('keeps untuned presets equal-tempered when no string offset exists', () => {
    const target = { midi: 69 };
    const match = closestTarget(440, [target], 440);
    expect(match?.frequency).toBeCloseTo(440, 10);
    expect(match?.cents).toBeCloseTo(0, 8);
  });
});
