export type InstrumentId = 'guitar' | 'acoustic' | 'bass';

export type StringTarget = {
  id: string;
  note: string;
  midi: number;
};

export type TuningPreset = {
  id: string;
  instrument: InstrumentId;
  namePt: string;
  nameEn: string;
  short: string;
  strings: StringTarget[];
};

const NAMES: Record<string, number> = {
  C: 0,
  'C#': 1,
  D: 2,
  'D#': 3,
  E: 4,
  F: 5,
  'F#': 6,
  G: 7,
  'G#': 8,
  A: 9,
  'A#': 10,
  B: 11
};

export function noteToMidi(note: string): number {
  const match = /^([A-G](?:#)?)(-?\d)$/.exec(note);
  if (!match) throw new Error('Invalid note: ' + note);
  return (Number(match[2]) + 1) * 12 + NAMES[match[1]];
}

function strings(notes: string[]): StringTarget[] {
  return notes.map((note, index) => ({
    id: String(index + 1),
    note,
    midi: noteToMidi(note)
  }));
}

export const PRESETS: TuningPreset[] = [
  { id: 'guitar-standard', instrument: 'guitar', namePt: 'Padrão', nameEn: 'Standard', short: 'EADGBE', strings: strings(['E2','A2','D3','G3','B3','E4']) },
  { id: 'guitar-drop-d', instrument: 'guitar', namePt: 'Drop D', nameEn: 'Drop D', short: 'DADGBE', strings: strings(['D2','A2','D3','G3','B3','E4']) },
  { id: 'guitar-eb', instrument: 'guitar', namePt: 'Meio tom abaixo', nameEn: 'Half-step down', short: 'EbAbDbGbBbEb', strings: strings(['D#2','G#2','C#3','F#3','A#3','D#4']) },
  { id: 'guitar-drop-c', instrument: 'guitar', namePt: 'Drop C', nameEn: 'Drop C', short: 'CGCFAD', strings: strings(['C2','G2','C3','F3','A3','D4']) },
  { id: 'guitar-dadgad', instrument: 'guitar', namePt: 'DADGAD', nameEn: 'DADGAD', short: 'DADGAD', strings: strings(['D2','A2','D3','G3','A3','D4']) },
  { id: 'guitar-open-g', instrument: 'guitar', namePt: 'Open G', nameEn: 'Open G', short: 'DGDGBD', strings: strings(['D2','G2','D3','G3','B3','D4']) },
  { id: 'guitar-open-d', instrument: 'guitar', namePt: 'Open D', nameEn: 'Open D', short: 'DADF#AD', strings: strings(['D2','A2','D3','F#3','A3','D4']) },

  { id: 'acoustic-standard', instrument: 'acoustic', namePt: 'Padrão', nameEn: 'Standard', short: 'EADGBE', strings: strings(['E2','A2','D3','G3','B3','E4']) },
  { id: 'acoustic-drop-d', instrument: 'acoustic', namePt: 'Drop D', nameEn: 'Drop D', short: 'DADGBE', strings: strings(['D2','A2','D3','G3','B3','E4']) },
  { id: 'acoustic-dadgad', instrument: 'acoustic', namePt: 'DADGAD', nameEn: 'DADGAD', short: 'DADGAD', strings: strings(['D2','A2','D3','G3','A3','D4']) },

  { id: 'bass-4-standard', instrument: 'bass', namePt: '4 cordas · Padrão', nameEn: '4-string · Standard', short: 'EADG', strings: strings(['E1','A1','D2','G2']) },
  { id: 'bass-4-drop-d', instrument: 'bass', namePt: '4 cordas · Drop D', nameEn: '4-string · Drop D', short: 'DADG', strings: strings(['D1','A1','D2','G2']) },
  { id: 'bass-5-standard', instrument: 'bass', namePt: '5 cordas · Padrão', nameEn: '5-string · Standard', short: 'BEADG', strings: strings(['B0','E1','A1','D2','G2']) }
];

export function presetsForInstrument(instrument: InstrumentId): TuningPreset[] {
  return PRESETS.filter((preset) => preset.instrument === instrument);
}
