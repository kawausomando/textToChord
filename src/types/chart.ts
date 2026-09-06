export type RepeatBarline = 'none' | 'start' | 'end' | 'both' | 'double' | 'final';

export type SimileType = 'none' | 'percent1' | 'percent2' | 'percent4';

export interface ChordItem {
  symbol: string;
  kickDsl?: string; // e.g. '>4a~', 'hit'
}

export interface Measure {
  id: string;
  number: number; // 1-based measure number
  chords: ChordItem[];
  leftBarline: RepeatBarline;
  rightBarline: RepeatBarline;
  volta?: number; // 1, 2 for 1st/2nd endings
  simile: SimileType; // %, %2%, %4%
  kicks: boolean[]; // 16 steps for comping
  ties: boolean[]; // 16 steps for ties
  rehearsalMark?: string; // 'INTRO', 'A', 'B', 'CHORUS', 'CODA'
  bandText?: string; // e.g. '→ half', '(vocal in)'
  segno?: boolean; // 𝄋
  toCoda?: boolean; // 𝄌
  coda?: boolean; // CODA section header
  dsAlCoda?: boolean; // D.S. al Coda
  pageBreakBefore?: boolean;
}

export interface MasterChart {
  title: string;
  bpm: number;
  keySignature: string;
  timeSignature: [number, number]; // e.g. [4, 4]
  measures: Measure[];
}
