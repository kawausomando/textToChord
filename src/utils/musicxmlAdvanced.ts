import type { MasterChart, Measure } from '../types/chart';

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function parseChordHarmonyXml(symbol: string): string {
  if (!symbol || symbol === 'N.C.') {
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

  // Fallback / Roman numeral function
  return `      <harmony>
        <function>${escapeXml(symbol)}</function>
        <kind text="${escapeXml(symbol)}">other</kind>
      </harmony>\n`;
}

function parseKeySignatureToFifths(keyStr: string): { fifths: number; mode: 'major' | 'minor' } {
  const clean = (keyStr || 'C').trim().replace(/♭/g, 'b').replace(/♯/g, '#');
  const isMinor = /m(?!aj)/i.test(clean);
  const root = clean.replace(/m.*/i, '').trim();

  const majorFifths: Record<string, number> = {
    'C': 0, 'G': 1, 'D': 2, 'A': 3, 'E': 4, 'B': 5, 'F#': 6, 'C#': 7,
    'F': -1, 'Bb': -2, 'Eb': -3, 'Ab': -4, 'Db': -5, 'Gb': -6, 'Cb': -7,
  };
  const minorFifths: Record<string, number> = {
    'A': 0, 'E': 1, 'B': 2, 'F#': 3, 'C#': 4, 'G#': 5, 'D#': 6, 'A#': 7,
    'D': -1, 'G': -2, 'C': -3, 'F': -4, 'Bb': -5, 'Eb': -6, 'Ab': -7,
  };

  if (isMinor) {
    const fifths = minorFifths[root] ?? -6;
    return { fifths, mode: 'minor' };
  } else {
    const fifths = majorFifths[root] ?? 0;
    return { fifths, mode: 'major' };
  }
}

/**
 * Generates Sibelius & Dorico optimized MusicXML 4.0 file
 * strictly adhering to SOP:
 * - 4 measures per system
 * - First measure in system: 343pt (accounting for 115pt clef/key sig)
 * - Subsequent measures: 228pt each (total 1027pt per system)
 * - 1024 divisions per quarter (total bar duration = 4096)
 * - Slash comping with ties and hidden rests (print-object="no")
 */
export function generateAdvancedMusicXML(chart: MasterChart): string {
  const divisions = 1024; // 1 beat = 1024, 1 bar = 4096, 16th = 256
  const barDuration = 4096;
  const sixteenthDuration = 256;

  const xmlHeader = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="4.0">
  <work>
    <work-title>${escapeXml(chart.title)}</work-title>
  </work>
  <part-list>
    <score-part id="P1">
      <part-name>Master Rhythm</part-name>
      <part-abbreviation>Rhythm</part-abbreviation>
    </score-part>
  </part-list>
  <part id="P1">
`;

  let xmlBody = '';

  chart.measures.forEach((m: Measure, idx: number) => {
    const isSystemStart = idx % 4 === 0;
    // SOP Geometry Rule: First bar in system = 343pt, following bars = 228pt
    const measureWidth = isSystemStart ? 343 : 228;

    xmlBody += `    <measure number="${m.number}" width="${measureWidth}">\n`;

    // System / Page breaks
    if (m.pageBreakBefore) {
      xmlBody += `      <print new-page="yes"/>\n`;
    } else if (isSystemStart && idx > 0) {
      xmlBody += `      <print new-system="yes"/>\n`;
    }

    // Attributes in Measure 1
    if (idx === 0) {
      const keyInfo = parseKeySignatureToFifths(chart.keySignature);
      const beats = chart.timeSignature ? chart.timeSignature[0] : 4;
      const beatType = chart.timeSignature ? chart.timeSignature[1] : 4;

      xmlBody += `      <attributes>
        <divisions>${divisions}</divisions>
        <key>
          <fifths>${keyInfo.fifths}</fifths>
          <mode>${keyInfo.mode}</mode>
        </key>
        <time>
          <beats>${beats}</beats>
          <beat-type>${beatType}</beat-type>
        </time>
        <clef>
          <sign>G</sign>
          <line>2</line>
        </clef>
        <staff-details>
          <staff-lines>5</staff-lines>
        </staff-details>
      </attributes>
      <direction placement="above">
        <direction-type>
          <metronome>
            <beat-unit>quarter</beat-unit>
            <per-minute>${chart.bpm || 125}</per-minute>
          </metronome>
        </direction-type>
        <sound tempo="${chart.bpm || 125}"/>
      </direction>\n`;
    }

    // Left Barline (e.g. Start Repeat)
    if (m.leftBarline === 'start' || m.leftBarline === 'both') {
      xmlBody += `      <barline location="left">
        <bar-style>heavy-light</bar-style>
        <repeat direction="forward"/>
      </barline>\n`;
    }

    // Volta Ending Start
    if (m.volta) {
      xmlBody += `      <barline location="left">
        <ending number="${m.volta}" type="start">${m.volta}.</ending>
      </barline>\n`;
    }

    // Rehearsal Mark (Boxed System Text)
    if (m.rehearsalMark) {
      xmlBody += `      <direction placement="above">
        <direction-type>
          <rehearsal enclosure="rectangle" font-weight="bold">${escapeXml(m.rehearsalMark)}</rehearsal>
        </direction-type>
      </direction>\n`;
    }

    // Band Instruction Text (e.g. -> half, (vocal in))
    if (m.bandText) {
      xmlBody += `      <direction placement="below">
        <direction-type>
          <words font-size="9" font-style="italic">${escapeXml(m.bandText)}</words>
        </direction-type>
      </direction>\n`;
    }

    // Segno
    if (m.segno) {
      xmlBody += `      <direction placement="above">
        <direction-type>
          <segno/>
        </direction-type>
      </direction>\n`;
    }

    // Coda / To Coda
    if (m.coda) {
      xmlBody += `      <direction placement="above">
        <direction-type>
          <coda/>
        </direction-type>
      </direction>\n`;
    }
    if (m.toCoda) {
      xmlBody += `      <direction placement="above">
        <direction-type>
          <words font-weight="bold">To Coda 𝄌</words>
        </direction-type>
      </direction>\n`;
    }
    if (m.dsAlCoda) {
      xmlBody += `      <direction placement="above">
        <direction-type>
          <words font-weight="bold">D.S. al Coda</words>
        </direction-type>
      </direction>\n`;
    }

    // Chord Harmonies
    m.chords.forEach((chord) => {
      xmlBody += parseChordHarmonyXml(chord.symbol);
    });

    // Notes & Comping Kicks
    const hasKicks = m.kicks && m.kicks.some(Boolean);

    if (hasKicks) {
      // 16-step kick representation with 3rd-space (B4/G4) slash noteheads and hidden rests
      for (let step = 0; step < 16; step++) {
        if (m.kicks[step]) {
          const isTied = m.ties && m.ties[step];
          const tieTag = isTied ? '<tie type="start"/>' : '';
          const notationTag = isTied ? '<notations><tied type="start"/></notations>' : '';

          xmlBody += `      <note>
        <pitch>
          <step>B</step>
          <octave>4</octave>
        </pitch>
        <duration>${sixteenthDuration}</duration>
        <type>16th</type>
        <notehead>slash</notehead>
        ${tieTag}
        ${notationTag}
      </note>\n`;
        } else {
          // Hidden rest (print-object="no") ensuring strict 4096 division sum
          xmlBody += `      <note>
        <rest/>
        <duration>${sixteenthDuration}</duration>
        <type>16th</type>
        <print-object>no</print-object>
      </note>\n`;
        }
      }
    } else {
      // Standard measure rest
      xmlBody += `      <note>
        <rest/>
        <duration>${barDuration}</duration>
        <type>whole</type>
      </note>\n`;
    }

    // Right Barline (End repeat, double, final, or volta stop)
    if (m.volta) {
      xmlBody += `      <barline location="right">
        <ending number="${m.volta}" type="stop"/>
      </barline>\n`;
    }

    if (m.rightBarline === 'end' || m.rightBarline === 'both') {
      xmlBody += `      <barline location="right">
        <bar-style>light-heavy</bar-style>
        <repeat direction="backward"/>
      </barline>\n`;
    } else if (m.rightBarline === 'double') {
      xmlBody += `      <barline location="right">
        <bar-style>light-light</bar-style>
      </barline>\n`;
    } else if (m.rightBarline === 'final') {
      xmlBody += `      <barline location="right">
        <bar-style>light-heavy</bar-style>
      </barline>\n`;
    }

    xmlBody += `    </measure>\n`;
  });

  const xmlFooter = `  </part>
</score-partwise>`;

  return xmlHeader + xmlBody + xmlFooter;
}

export function downloadAdvancedMusicXML(chart: MasterChart, filename?: string) {
  const safeTitle = (chart.title || 'master-rhythm-chart').replace(/[^\w\s\u3000-\u30ff\u4e00-\u9faf-]/g, '').trim().replace(/\s+/g, '_');
  const actualFilename = filename || `${safeTitle || 'master-rhythm-chart'}.musicxml`;
  const xmlContent = generateAdvancedMusicXML(chart);
  const blob = new Blob([xmlContent], { type: 'application/vnd.recordare.musicxml+xml' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = actualFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
