export interface ConverterOptions {
  major7Style?: 'Δ7' | 'Δ' | 'maj7' | 'M7';
  halfDiminishedStyle?: 'm7-5' | 'm7(♭5)' | 'ø7' | 'ø';
  diminishedStyle?: 'dim' | '°';
  flatSymbol?: string; // '♭' or 'b'
  sharpSymbol?: string; // '♯' or '#'
  barsPerLine?: number; // 0 for infinite, or 4, 8 etc.
  addOuterBars?: boolean; // whether to add | at start and end of line
}

export const DEFAULT_OPTIONS: ConverterOptions = {
  major7Style: 'Δ7',
  halfDiminishedStyle: 'm7-5',
  diminishedStyle: 'dim',
  flatSymbol: '♭',
  sharpSymbol: '♯',
  barsPerLine: 4,
  addOuterBars: true,
};

const ROMAN_MAP: Record<string, string> = {
  '1': 'Ⅰ',
  '2': 'Ⅱ',
  '3': 'Ⅲ',
  '4': 'Ⅳ',
  '5': 'Ⅴ',
  '6': 'Ⅵ',
  '7': 'Ⅶ',
};

/**
 * Converts a single root symbol (e.g. '4', 'b3', '#4', 'Bb', 'bb', 'F#', 'am7') to standard notation.
 */
export function convertRoot(root: string, options: ConverterOptions = DEFAULT_OPTIONS): string {
  const flat = options.flatSymbol ?? '♭';
  const sharp = options.sharpSymbol ?? '♯';

  let cleanRoot = root.trim();
  if (!cleanRoot) return '';

  // 1. Degree roots: accidental + degree number (e.g., b3, #4, 4, ♭3)
  const degreeMatch = cleanRoot.match(/^([b♭#♯]?)([1-7])$/);
  if (degreeMatch) {
    let acc = degreeMatch[1];
    if (acc === 'b') acc = flat;
    if (acc === '#') acc = sharp;
    const num = degreeMatch[2];
    const roman = ROMAN_MAP[num] || num;
    return `${acc}${roman}`;
  }

  // 2. Pitch roots (A-G / a-g) with optional flat/sharp (e.g., 'bb' -> 'B♭', 'c#' -> 'C♯')
  cleanRoot = cleanRoot.replace(/^([a-gA-G])([b♭#♯]?)/, (_, note, acc) => {
    let newAcc = acc;
    if (acc === 'b') newAcc = flat;
    if (acc === '#') newAcc = sharp;
    return note.toUpperCase() + newAcc;
  });

  return cleanRoot;
}

/**
 * Converts a single chord symbol (e.g. '4m7', 'AM7', '7m7-5', 'Bbaug', 'bbaug', '5m7(11)', '5/4')
 */
export function convertChordSymbol(token: string, options: ConverterOptions = DEFAULT_OPTIONS): string {
  if (!token || token.trim() === '') return '';

  const flat = options.flatSymbol ?? '♭';
  const sharp = options.sharpSymbol ?? '♯';

  // Handle slash chords / bass notes e.g., '5/4', '4.5/4', 'G/B'
  if (token.includes('/')) {
    const parts = token.split('/');
    const mainChord = convertChordSymbol(parts[0], options);
    const bassNote = convertRoot(parts[1], options);
    return `${mainChord}/${bassNote}`;
  }

  let text = token.trim();

  // 1. Identify Root vs Quality/Extension
  let root = '';
  let quality = '';

  const degreeRootMatch = text.match(/^([b♭#♯]?[1-7])(.*)$/);
  const noteRootMatch = text.match(/^([a-gA-G][b♭#♯]?)(.*)$/);

  if (degreeRootMatch) {
    root = convertRoot(degreeRootMatch[1], options);
    quality = degreeRootMatch[2];
  } else if (noteRootMatch) {
    root = convertRoot(noteRootMatch[1], options);
    quality = noteRootMatch[2];
  } else {
    root = text;
    quality = '';
  }

  // 2. Format Quality & Extensions

  // Major 7th replacements: M7, maj7, Maj7
  if (options.major7Style) {
    quality = quality.replace(/maj7/gi, options.major7Style);
    quality = quality.replace(/M7/g, options.major7Style);
  }

  // Half Diminished replacements: m7-5, m7b5, m7(b5), m7(♭5)
  if (options.halfDiminishedStyle) {
    quality = quality.replace(/m7\(?[b♭]-?5\)?/gi, options.halfDiminishedStyle);
    quality = quality.replace(/m7-5/gi, options.halfDiminishedStyle);
  }

  // Diminished replacements
  if (options.diminishedStyle === '°') {
    quality = quality.replace(/dim/gi, '°');
  } else if (options.diminishedStyle === 'dim') {
    quality = quality.replace(/°/g, 'dim');
  }

  // Target accidental replacements in quality (e.g. b9 -> ♭9, b13 -> ♭13, b5 -> ♭5, #9 -> ♯9)
  // Only replace 'b' and '#' when followed by digits, to avoid breaking words like 'add' or 'sub'
  quality = quality.replace(/b(\d+)/g, `${flat}$1`);
  quality = quality.replace(/#(\d+)/g, `${sharp}$1`);

  return `${root}${quality}`;
}

/**
 * Parses full input text with commas/dots/newlines into formatted chord bars
 */
export function convertRoughText(input: string, options: ConverterOptions = DEFAULT_OPTIONS): string {
  if (!input) return '';

  const lines = input.split('\n');
  const resultLines: string[] = [];

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) {
      resultLines.push('');
      continue;
    }

    // Check if line is separated by commas or existing bar lines '|'
    let rawBars: string[] = [];

    if (trimmedLine.includes('|')) {
      // Split by bar line '|'
      rawBars = trimmedLine.split('|').map(b => b.trim()).filter((b, idx, arr) => {
        if (idx === 0 && b === '') return false;
        if (idx === arr.length - 1 && b === '') return false;
        return true;
      });
    } else if (trimmedLine.includes(',')) {
      // Split by comma ','
      rawBars = trimmedLine.split(',').map(b => b.trim());
    } else {
      // Single bar line or space/dot separated
      rawBars = [trimmedLine];
    }

    // Format each bar
    const formattedBars: string[] = [];

    for (const rawBar of rawBars) {
      if (!rawBar) continue;

      // Inside a bar, chords can be separated by spaces or dots '.' (e.g. 4.5/4 or 4 5/4)
      const chordTokens = rawBar.split(/[\s.]+/).filter(Boolean);
      const convertedChords = chordTokens.map(token => convertChordSymbol(token, options));
      formattedBars.push(convertedChords.join(' '));
    }

    if (formattedBars.length === 0) continue;

    // Group bars into lines according to barsPerLine
    const barsPerLine = options.barsPerLine ?? 4;
    if (barsPerLine > 0) {
      for (let i = 0; i < formattedBars.length; i += barsPerLine) {
        const chunk = formattedBars.slice(i, i + barsPerLine);
        const inner = chunk.join(' | ');
        resultLines.push(options.addOuterBars !== false ? `| ${inner} |` : inner);
      }
    } else {
      const inner = formattedBars.join(' | ');
      resultLines.push(options.addOuterBars !== false ? `| ${inner} |` : inner);
    }
  }

  return resultLines.join('\n');
}
