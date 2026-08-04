/**
 * MusicXML generator for Sibelius, Dorico, and MuseScore integration.
 */

interface ChordItem {
  symbol: string;
}

interface MeasureItem {
  number: number;
  chords: ChordItem[];
}

export function generateMusicXML(formattedText: string, title = 'Lead Sheet'): string {
  // Parse formatted text into measures
  const measures: MeasureItem[] = [];
  let measureCount = 1;

  const lines = formattedText.split('\n');
  for (const line of lines) {
    const rawBars = line.split('|').map((b) => b.trim()).filter((b, idx, arr) => {
      // Ignore leading/trailing empty strings created by outer bar lines
      if (idx === 0 && b === '') return false;
      if (idx === arr.length - 1 && b === '') return false;
      return true;
    });
    for (const barText of rawBars) {
      const chords = barText.split(/\s+/).filter(Boolean).map((symbol) => ({ symbol }));
      measures.push({
        number: measureCount++,
        chords: chords.length > 0 ? chords : [{ symbol: 'N.C.' }],
      });
    }
  }

  if (measures.length === 0) {
    measures.push({ number: 1, chords: [{ symbol: 'N.C.' }] });
  }

  // XML construction
  const xmlHeader = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="4.0">
  <work>
    <work-title>${escapeXml(title)}</work-title>
  </work>
  <part-list>
    <score-part id="P1">
      <part-name>Chords</part-name>
    </score-part>
  </part-list>
  <part id="P1">
`;

  let xmlBody = '';

  measures.forEach((m, idx) => {
    xmlBody += `    <measure number="${m.number}">\n`;

    // Add attributes in first measure
    if (idx === 0) {
      xmlBody += `      <attributes>
        <divisions>12</divisions>
        <key>
          <fifths>0</fifths>
        </key>
        <time>
          <beats>4</beats>
          <beat-type>4</beat-type>
        </time>
        <clef>
          <sign>G</sign>
          <line>2</line>
        </clef>
      </attributes>\n`;
    }

    // Add harmony elements for each chord in the measure
    const totalDuration = 48; // 12 divisions per beat * 4 beats
    const numChords = m.chords.length;
    const baseDuration = Math.floor(totalDuration / numChords);
    let remainingDuration = totalDuration;

    m.chords.forEach((chord, i) => {
      xmlBody += parseHarmonyXml(chord.symbol);

      const duration = (i === numChords - 1) ? remainingDuration : baseDuration;
      remainingDuration -= duration;

      // Add a rest note to consume the duration for this chord
      xmlBody += `      <note>
        <rest/>
        <duration>${duration}</duration>
      </note>\n`;
    });

    xmlBody += `    </measure>\n`;
  });

  const xmlFooter = `  </part>
</score-partwise>`;

  return xmlHeader + xmlBody + xmlFooter;
}

function parseHarmonyXml(symbol: string): string {
  if (symbol === 'N.C.') {
    return `      <harmony>
        <root><root-step>none</root-step></root>
        <kind>none</kind>
      </harmony>\n`;
  }

  let chordStr = symbol;
  let bassStr = '';
  if (symbol.includes('/')) {
    const parts = symbol.split('/');
    chordStr = parts[0];
    bassStr = parts[1];
  }

  // Extract root and alteration if standard note (e.g. F, B♭, C♯)
  const noteMatch = chordStr.match(/^([A-G])([♭♯b#]?)(.*)$/);

  if (noteMatch) {
    const step = noteMatch[1];
    const acc = noteMatch[2];

    let alterTag = '';
    if (acc === '♭' || acc === 'b') alterTag = '\n          <root-alter>-1</root-alter>';
    if (acc === '♯' || acc === '#') alterTag = '\n          <root-alter>1</root-alter>';

    let bassTag = '';
    if (bassStr) {
      const bassMatch = bassStr.match(/^([A-G])([♭♯b#]?)/);
      if (bassMatch) {
        const bStep = bassMatch[1];
        const bAcc = bassMatch[2];
        let bAlterTag = '';
        if (bAcc === '♭' || bAcc === 'b') bAlterTag = '\n          <bass-alter>-1</bass-alter>';
        if (bAcc === '♯' || bAcc === '#') bAlterTag = '\n          <bass-alter>1</bass-alter>';
        bassTag = `
        <bass>
          <bass-step>${bStep}</bass-step>${bAlterTag}
        </bass>`;
      }
    }

    return `      <harmony>
        <root>
          <root-step>${step}</root-step>${alterTag}
        </root>
        <kind text="${escapeXml(symbol)}">other</kind>${bassTag}
      </harmony>\n`;
  }

  // Roman numerals (Ⅳm7, ♭ⅢΔ7) or degree chords
  return `      <harmony>
        <function>${escapeXml(symbol)}</function>
        <kind text="${escapeXml(symbol)}">other</kind>
      </harmony>\n`;
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function downloadMusicXML(formattedText: string, filename = 'lead-sheet.musicxml') {
  const xmlContent = generateMusicXML(formattedText);
  const blob = new Blob([xmlContent], { type: 'application/vnd.recordare.musicxml+xml' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
