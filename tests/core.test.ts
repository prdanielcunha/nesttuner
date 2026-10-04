import { describe, expect, it } from 'vitest';
import { centsFromTarget, midiToFrequency, nearestNote, noteToMidi, presetsForInstrument } from '@nesttuner/core';

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
});
