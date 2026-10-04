export type InstrumentId =
  | 'guitar'
  | 'acoustic'
  | 'bass'
  | 'ukulele'
  | 'violin'
  | 'viola'
  | 'cello'
  | 'cavaquinho';

export type StringTarget = {
  id: string;
  note: string;
  midi: number;
  offsetCents?: number;
};

export type TuningPreset = {
  id: string;
  instrument: InstrumentId;
  namePt: string;
  nameEn: string;
  nameEs: string;
  short: string;
  strings: StringTarget[];
};

const NAMES: Record<string, number> = {
  C: 0,
  'C#': 1,
  Db: 1,
  D: 2,
  'D#': 3,
  Eb: 3,
  E: 4,
  Fb: 4,
  'E#': 5,
  F: 5,
  'F#': 6,
  Gb: 6,
  G: 7,
  'G#': 8,
  Ab: 8,
  A: 9,
  'A#': 10,
  Bb: 10,
  B: 11,
  Cb: 11
};

export function noteToMidi(note: string): number {
  const match = /^([A-G](?:#|b)?)(-?\d)$/.exec(note);
  if (!match || NAMES[match[1]] === undefined) throw new Error('Invalid note: ' + note);
  return (Number(match[2]) + 1) * 12 + NAMES[match[1]];
}

function strings(notes: string[]): StringTarget[] {
  return notes.map((note, index) => ({
    // Physical string numbering runs from the highest/thinnest string as #1.
    // Presets are stored low-to-high, so the displayed numbers descend.
    id: String(notes.length - index),
    note,
    midi: noteToMidi(note)
  }));
}

export const PRESETS: TuningPreset[] = [
  { id: 'guitar-standard', instrument: 'guitar', namePt: '6 cordas · Padrão', nameEn: '6-string · Standard', nameEs: '6 cuerdas · Estándar', short: 'EADGBE', strings: strings(['E2','A2','D3','G3','B3','E4']) },
  { id: 'guitar-drop-d', instrument: 'guitar', namePt: '6 cordas · Drop D', nameEn: '6-string · Drop D', nameEs: '6 cuerdas · Drop D', short: 'DADGBE', strings: strings(['D2','A2','D3','G3','B3','E4']) },
  { id: 'guitar-eb', instrument: 'guitar', namePt: '6 cordas · Meio tom abaixo', nameEn: '6-string · Half-step down', nameEs: '6 cuerdas · Medio tono abajo', short: 'EbAbDbGbBbEb', strings: strings(['Eb2','Ab2','Db3','Gb3','Bb3','Eb4']) },
  { id: 'guitar-drop-c', instrument: 'guitar', namePt: '6 cordas · Drop C', nameEn: '6-string · Drop C', nameEs: '6 cuerdas · Drop C', short: 'CGCFAD', strings: strings(['C2','G2','C3','F3','A3','D4']) },
  { id: 'guitar-dadgad', instrument: 'guitar', namePt: '6 cordas · DADGAD', nameEn: '6-string · DADGAD', nameEs: '6 cuerdas · DADGAD', short: 'DADGAD', strings: strings(['D2','A2','D3','G3','A3','D4']) },
  { id: 'guitar-open-g', instrument: 'guitar', namePt: '6 cordas · Open G', nameEn: '6-string · Open G', nameEs: '6 cuerdas · Open G', short: 'DGDGBD', strings: strings(['D2','G2','D3','G3','B3','D4']) },
  { id: 'guitar-open-d', instrument: 'guitar', namePt: '6 cordas · Open D', nameEn: '6-string · Open D', nameEs: '6 cuerdas · Open D', short: 'DADF#AD', strings: strings(['D2','A2','D3','F#3','A3','D4']) },
  { id: 'guitar-7-standard', instrument: 'guitar', namePt: '7 cordas · Padrão', nameEn: '7-string · Standard', nameEs: '7 cuerdas · Estándar', short: 'BEADGBE', strings: strings(['B1','E2','A2','D3','G3','B3','E4']) },
  { id: 'guitar-8-standard', instrument: 'guitar', namePt: '8 cordas · Padrão', nameEn: '8-string · Standard', nameEs: '8 cuerdas · Estándar', short: 'F#BEADGBE', strings: strings(['F#1','B1','E2','A2','D3','G3','B3','E4']) },

  { id: 'acoustic-standard', instrument: 'acoustic', namePt: 'Padrão', nameEn: 'Standard', nameEs: 'Estándar', short: 'EADGBE', strings: strings(['E2','A2','D3','G3','B3','E4']) },
  { id: 'acoustic-drop-d', instrument: 'acoustic', namePt: 'Drop D', nameEn: 'Drop D', nameEs: 'Drop D', short: 'DADGBE', strings: strings(['D2','A2','D3','G3','B3','E4']) },
  { id: 'acoustic-dadgad', instrument: 'acoustic', namePt: 'DADGAD', nameEn: 'DADGAD', nameEs: 'DADGAD', short: 'DADGAD', strings: strings(['D2','A2','D3','G3','A3','D4']) },
  { id: 'acoustic-open-g', instrument: 'acoustic', namePt: 'Open G', nameEn: 'Open G', nameEs: 'Open G', short: 'DGDGBD', strings: strings(['D2','G2','D3','G3','B3','D4']) },
  { id: 'acoustic-open-d', instrument: 'acoustic', namePt: 'Open D', nameEn: 'Open D', nameEs: 'Open D', short: 'DADF#AD', strings: strings(['D2','A2','D3','F#3','A3','D4']) },

  { id: 'bass-4-standard', instrument: 'bass', namePt: '4 cordas · Padrão', nameEn: '4-string · Standard', nameEs: '4 cuerdas · Estándar', short: 'EADG', strings: strings(['E1','A1','D2','G2']) },
  { id: 'bass-4-drop-d', instrument: 'bass', namePt: '4 cordas · Drop D', nameEn: '4-string · Drop D', nameEs: '4 cuerdas · Drop D', short: 'DADG', strings: strings(['D1','A1','D2','G2']) },
  { id: 'bass-5-standard', instrument: 'bass', namePt: '5 cordas · Padrão', nameEn: '5-string · Standard', nameEs: '5 cuerdas · Estándar', short: 'BEADG', strings: strings(['B0','E1','A1','D2','G2']) },
  { id: 'bass-6-standard', instrument: 'bass', namePt: '6 cordas · Padrão', nameEn: '6-string · Standard', nameEs: '6 cuerdas · Estándar', short: 'BEADGC', strings: strings(['B0','E1','A1','D2','G2','C3']) },

  { id: 'ukulele-standard', instrument: 'ukulele', namePt: 'Padrão · Sol agudo', nameEn: 'Standard · High G', nameEs: 'Estándar · Sol agudo', short: 'GCEA', strings: strings(['G4','C4','E4','A4']) },
  { id: 'ukulele-low-g', instrument: 'ukulele', namePt: 'Sol grave', nameEn: 'Low G', nameEs: 'Sol grave', short: 'GCEA', strings: strings(['G3','C4','E4','A4']) },

  { id: 'violin-standard', instrument: 'violin', namePt: 'Padrão', nameEn: 'Standard', nameEs: 'Estándar', short: 'GDAE', strings: strings(['G3','D4','A4','E5']) },
  { id: 'viola-standard', instrument: 'viola', namePt: 'Padrão', nameEn: 'Standard', nameEs: 'Estándar', short: 'CGDA', strings: strings(['C3','G3','D4','A4']) },
  { id: 'cello-standard', instrument: 'cello', namePt: 'Padrão', nameEn: 'Standard', nameEs: 'Estándar', short: 'CGDA', strings: strings(['C2','G2','D3','A3']) },
  { id: 'cavaquinho-standard', instrument: 'cavaquinho', namePt: 'Padrão brasileiro', nameEn: 'Brazilian standard', nameEs: 'Estándar brasileño', short: 'DGBD', strings: strings(['D4','G4','B4','D5']) }
];

export function presetsForInstrument(instrument: InstrumentId): TuningPreset[] {
  return PRESETS.filter((preset) => preset.instrument === instrument);
}

export function presetName(preset: TuningPreset, locale: 'pt-BR' | 'en' | 'es'): string {
  if (locale === 'pt-BR') return preset.namePt;
  if (locale === 'es') return preset.nameEs;
  return preset.nameEn;
}
