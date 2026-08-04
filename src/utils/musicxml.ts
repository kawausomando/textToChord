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
    const rawBars = line.split('|').map((b) => b.trim()).filter(Boolean);
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
        <divisions>4</divisions>
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
    m.chords.forEach((chord) => {
      xmlBody += parseHarmonyXml(chord.symbol);
    });

    // Whole rest note to represent the bar structure
    xmlBody += `      <note>
        <rest/>
        <duration>16</duration>
        <type>whole</type>
      </note>\n`;

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

  // Extract root and alteration if standard note (e.g. F, B♭, C♯, G/B)
  const noteMatch = symbol.match(/^([A-G])([♭♯b#]?)(.*)$/);

  if (noteMatch) {
    const step = noteMatch[1];
    const acc = noteMatch[2];

    let alterTag = '';
    if (acc === '♭' || acc === 'b') alterTag = '<root-alter>-1</root-alter>';
    if (acc === '♯' || acc === '#') alterTag = '<root-alter>1</root-alter>';

    return `      <harmony>
        <root>
          <root-step>${step}</root-step>
          ${alterTag}
        </root>
        <kind text="${escapeXml(symbol)}">other</kind>
      </harmony>\n`;
  }

  // Roman numerals (Ⅳm7, ♭ⅢΔ7) or degree chords
  return `      <harmony>
    <harmony-text>${escapeXml(symbol)}</harmony-text>
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
