import type { Measure, MasterChart, RepeatBarline, SimileType } from '../types/chart';
import { convertChordSymbol } from './converter';

/**
 * Serializes 16-step kicks and ties array into a DSL tag.
 * e.g. [kick: 4a~] or [kick: 1, 2.5]
 */
export function serializeKicks(kicks: boolean[], ties: boolean[]): string {
  const steps: string[] = [];
  kicks.forEach((act, idx) => {
    if (act) {
      const beat = Math.floor(idx / 4) + 1;
      const subIdx = idx % 4;
      const sub = subIdx === 0 ? '' : subIdx === 1 ? 'e' : subIdx === 2 ? '&' : 'a';
      const tieStr = ties[idx] ? '~' : '';
      steps.push(`${beat}${sub}${tieStr}`);
    }
  });
  if (steps.length === 0) return '';
  return `[kick: ${steps.join(', ')}]`;
}

/**
 * Parses kick DSL into 16 steps (indices 0..15).
 * Accurately supports subdivisions (e, &, a, +) and decimal beats (e.g. 1.5, 2.75).
 */
export function parseKickDsl(text: string): { kicks: boolean[]; ties: boolean[] } {
  const kicks = new Array(16).fill(false);
  const ties = new Array(16).fill(false);

  if (!text) return { kicks, ties };

  // 1. Check (hit)
  if (/hit/i.test(text)) {
    kicks[0] = true;
  }

  // 2. Extract explicit [kick: ...] or evaluate raw token
  const explicitKick = text.match(/\[kick:\s*([^\]]+)\]/i);
  const rawItems = explicitKick ? explicitKick[1].split(',') : [text];

  rawItems.forEach((raw) => {
    const item = raw.trim();
    if (!item) return;

    // Pattern matching: e.g. '>4a~', '4a~', '4a', '2&', '2.5~', '1'
    const stepMatch = item.match(/([>~]*)(\d(?:\.\d+)?)([e&a+]?)(~?)/i);
    if (stepMatch) {
      const beatNum = parseFloat(stepMatch[2]);
      const sub = stepMatch[3].toLowerCase();
      const hasTie = item.includes('~');

      if (!isNaN(beatNum) && beatNum >= 1 && beatNum <= 4.75) {
        let step = (Math.floor(beatNum) - 1) * 4;
        const fraction = beatNum - Math.floor(beatNum);
        if (fraction > 0) {
          step += Math.round(fraction * 4);
        }

        if (sub === 'e') step += 1;
        else if (sub === '&' || sub === '+') step += 2;
        else if (sub === 'a') step += 3;

        if (step >= 0 && step < 16) {
          kicks[step] = true;
          if (hasTie) ties[step] = true;
        }
      }
    }
  });

  return { kicks, ties };
}

interface BarDelim {
  delim: string;
  index: number;
}

/**
 * Splits a line into measure chunks between barlines.
 */
function extractBarsFromLine(line: string): { text: string; leftDelim: string; rightDelim: string }[] {
  const barlineRegex = /(:\|:|:\||\|:|\|\||\|\.|\|)/g;
  const delims: BarDelim[] = [];
  let m: RegExpExecArray | null;

  while ((m = barlineRegex.exec(line)) !== null) {
    delims.push({ delim: m[0], index: m.index });
  }

  if (delims.length < 2) {
    const clean = line.replace(barlineRegex, '').trim();
    return [{ text: clean, leftDelim: '|', rightDelim: '|' }];
  }

  const results: { text: string; leftDelim: string; rightDelim: string }[] = [];

  for (let i = 0; i < delims.length - 1; i++) {
    const left = delims[i];
    const right = delims[i + 1];
    const chunk = line.substring(left.index + left.delim.length, right.index).trim();
    results.push({
      text: chunk,
      leftDelim: left.delim,
      rightDelim: right.delim,
    });
  }

  return results;
}

/**
 * Extracts metadata (Title, Key, BPM, Time Signature) from chart DSL headers.
 */
export function extractMetadataFromDsl(input: string): {
  title?: string;
  key?: string;
  bpm?: number;
  timeSignature?: [number, number];
} {
  const result: { title?: string; key?: string; bpm?: number; timeSignature?: [number, number] } = {};
  const lines = input.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#')) continue;

    const titleMatch = trimmed.match(/^(?:title|タイトル|曲名)\s*[:：]\s*(.+)$/i);
    if (titleMatch) {
      result.title = titleMatch[1].trim();
      continue;
    }

    const keyMatch = trimmed.match(/^(?:key|キー)\s*[:：]\s*(.+)$/i);
    if (keyMatch) {
      result.key = keyMatch[1].trim();
      continue;
    }

    const bpmMatch = trimmed.match(/^bpm\s*[:：]\s*(\d+)$/i);
    if (bpmMatch) {
      result.bpm = parseInt(bpmMatch[1], 10);
      continue;
    }

    const timeMatch = trimmed.match(/^(?:time|timesignature|meter|拍子)\s*[:：]\s*(\d+)\s*[/／]\s*(\d+)$/i);
    if (timeMatch) {
      result.timeSignature = [parseInt(timeMatch[1], 10), parseInt(timeMatch[2], 10)];
      continue;
    }
  }

  return result;
}

/**
 * Updates or adds Title, Key, BPM, and Time Signature headers in the DSL string.
 */
export function updateMetadataInDsl(
  dsl: string,
  updates: { title?: string; key?: string; bpm?: number; timeSignature?: [number, number] }
): string {
  const lines = dsl.split('\n');

  if (updates.title !== undefined) {
    const titleIdx = lines.findIndex((l) => /^(?:title|タイトル|曲名)\s*[:：]/i.test(l.trim()));
    if (titleIdx !== -1) {
      lines[titleIdx] = `Title: ${updates.title}`;
    } else {
      lines.unshift(`Title: ${updates.title}`);
    }
  }

  if (updates.key !== undefined) {
    const keyIdx = lines.findIndex((l) => /^(?:key|キー)\s*[:：]/i.test(l.trim()));
    if (keyIdx !== -1) {
      lines[keyIdx] = `Key: ${updates.key}`;
    } else {
      const titleIdx = lines.findIndex((l) => /^(?:title|タイトル|曲名)\s*[:：]/i.test(l.trim()));
      lines.splice(titleIdx !== -1 ? titleIdx + 1 : 0, 0, `Key: ${updates.key}`);
    }
  }

  if (updates.bpm !== undefined) {
    const bpmIdx = lines.findIndex((l) => /^bpm\s*[:：]/i.test(l.trim()));
    if (bpmIdx !== -1) {
      lines[bpmIdx] = `BPM: ${updates.bpm}`;
    } else {
      const keyIdx = lines.findIndex((l) => /^(?:key|キー)\s*[:：]/i.test(l.trim()));
      const titleIdx = lines.findIndex((l) => /^(?:title|タイトル|曲名)\s*[:：]/i.test(l.trim()));
      const insertIdx = keyIdx !== -1 ? keyIdx + 1 : titleIdx !== -1 ? titleIdx + 1 : 0;
      lines.splice(insertIdx, 0, `BPM: ${updates.bpm}`);
    }
  }

  if (updates.timeSignature !== undefined) {
    const timeIdx = lines.findIndex((l) => /^(?:time|timesignature|meter|拍子)\s*[:：]/i.test(l.trim()));
    const timeStr = `Time: ${updates.timeSignature[0]}/${updates.timeSignature[1]}`;
    if (timeIdx !== -1) {
      lines[timeIdx] = timeStr;
    } else {
      const bpmIdx = lines.findIndex((l) => /^bpm\s*[:：]/i.test(l.trim()));
      const keyIdx = lines.findIndex((l) => /^(?:key|キー)\s*[:：]/i.test(l.trim()));
      const titleIdx = lines.findIndex((l) => /^(?:title|タイトル|曲名)\s*[:：]/i.test(l.trim()));
      const insertIdx = bpmIdx !== -1 ? bpmIdx + 1 : keyIdx !== -1 ? keyIdx + 1 : titleIdx !== -1 ? titleIdx + 1 : 0;
      lines.splice(insertIdx, 0, timeStr);
    }
  }

  return lines.join('\n');
}

/**
 * Parses Master Rhythm Chart DSL into a structured MasterChart AST.
 */
export function parseMasterChartText(
  input: string,
  chartTitle = 'Lead Sheet',
  defaults?: { title?: string; bpm?: number; keySignature?: string; timeSignature?: [number, number] }
): MasterChart {
  const measures: Measure[] = [];
  let currentMeasureNum = 1;

  let pendingRehearsalMark: string | undefined = undefined;
  let pendingBandText: string | undefined = undefined;
  let pendingSegno = false;
  let pendingPageBreak = false;

  let parsedTitle = defaults?.title || chartTitle;
  let parsedKey = defaults?.keySignature;
  let parsedBpm = defaults?.bpm;
  let parsedTimeSig = defaults?.timeSignature;

  const lines = input.split('\n');

  for (let lIdx = 0; lIdx < lines.length; lIdx++) {
    const rawLine = lines[lIdx].trim();
    if (!rawLine || rawLine.startsWith('//') || rawLine.startsWith('#')) {
      continue;
    }

    // Title / Key / BPM / Time headers
    const titleMatch = rawLine.match(/^(?:title|タイトル|曲名)\s*[:：]\s*(.+)$/i);
    if (titleMatch) {
      parsedTitle = titleMatch[1].trim();
      continue;
    }

    const keyMatch = rawLine.match(/^(?:key|キー)\s*[:：]\s*(.+)$/i);
    if (keyMatch) {
      parsedKey = keyMatch[1].trim();
      continue;
    }

    const bpmMatch = rawLine.match(/^bpm\s*[:：]\s*(\d+)$/i);
    if (bpmMatch) {
      parsedBpm = parseInt(bpmMatch[1], 10);
      continue;
    }

    const timeMatch = rawLine.match(/^(?:time|timesignature|meter|拍子)\s*[:：]\s*(\d+)\s*[/／]\s*(\d+)$/i);
    if (timeMatch) {
      parsedTimeSig = [parseInt(timeMatch[1], 10), parseInt(timeMatch[2], 10)];
      continue;
    }

    if (rawLine === '[PAGE_BREAK]' || rawLine === '===') {
      pendingPageBreak = true;
      continue;
    }

    const sectionMatch = rawLine.match(/^\[([^\]]+)\](.*)$/);
    if (sectionMatch && !rawLine.startsWith('[kick:')) {
      const tagContent = sectionMatch[1].trim();
      const remainder = sectionMatch[2].trim();

      if (!/^\d+\.?$/.test(tagContent)) {
        pendingRehearsalMark = tagContent;

        if (remainder.includes('$Segno') || remainder.includes('𝄋')) {
          pendingSegno = true;
        }

        const parenMatch = remainder.match(/\(([^)]+)\)/);
        if (parenMatch) {
          pendingBandText = `(${parenMatch[1]})`;
        } else {
          const arrowMatch = remainder.match(/(→\s*[^$\s]+)/);
          if (arrowMatch) {
            pendingBandText = arrowMatch[1];
          }
        }
        continue;
      }
    }

    let lineToProcess = rawLine;

    let lineSegno = false;
    let lineToCoda = false;
    let lineDsAlCoda = false;

    if (lineToProcess.includes('$Segno') || lineToProcess.includes('𝄋')) {
      lineSegno = true;
      lineToProcess = lineToProcess.replace(/\$Segno|𝄋/g, '');
    }
    if (lineToProcess.includes('$ToCoda') || lineToProcess.includes('𝄌')) {
      lineToCoda = true;
      lineToProcess = lineToProcess.replace(/\$ToCoda|𝄌/g, '');
    }
    if (lineToProcess.includes('$DSalCoda') || lineToProcess.includes('$DS') || /D\.S\./i.test(lineToProcess)) {
      lineDsAlCoda = true;
      lineToProcess = lineToProcess.replace(/\$DSalCoda|\$DS|D\.S\.\s*(al\s*Coda)?/gi, '');
    }

    if (!lineToProcess.includes('|') && lineToProcess.includes(',')) {
      lineToProcess = `| ${lineToProcess.split(',').map((c) => c.trim()).join(' | ')} |`;
    }

    if (!lineToProcess.includes('|')) {
      lineToProcess = `| ${lineToProcess} |`;
    }

    const barTokens = extractBarsFromLine(lineToProcess);

    barTokens.forEach((bToken, bIdx) => {
      let content = bToken.text.trim();

      let volta: number | undefined = undefined;
      const voltaMatch = content.match(/^\[?(\d+)\.\]?\s*(.*)$/);
      if (voltaMatch) {
        volta = parseInt(voltaMatch[1], 10);
        content = voltaMatch[2].trim();
      }

      let simile: SimileType = 'none';
      if (content === '%' || content === '1%') {
        simile = 'percent1';
      } else if (content === '%%' || content === '%2%' || content === '2%') {
        simile = 'percent2';
      } else if (content === '%4%' || content === '4%' || /sim\.\s*4\s*bars/i.test(content)) {
        simile = 'percent4';
      }

      const chordItems: { symbol: string; kickDsl?: string }[] = [];
      const kicksMerged = new Array(16).fill(false);
      const tiesMerged = new Array(16).fill(false);

      if (simile === 'none') {
        // 1. Extract [kick: ...] before splitting words by whitespace
        const kickMatch = content.match(/\[kick:\s*[^\]]+\]/i);
        if (kickMatch) {
          const explicitKickTag = kickMatch[0];
          content = content.replace(explicitKickTag, '').trim();
          const parsed = parseKickDsl(explicitKickTag);
          for (let k = 0; k < 16; k++) {
            if (parsed.kicks[k]) kicksMerged[k] = true;
            if (parsed.ties[k]) tiesMerged[k] = true;
          }
        }

        const words = content.split(/\s+/).filter(Boolean);
        words.forEach((w) => {
          let kickDsl: string | undefined = undefined;
          let chordSym = w;

          const parenKick = w.match(/\((>?[0-9a-z~&+.!]+)\)/i);
          if (parenKick) {
            kickDsl = parenKick[1];
            chordSym = w.replace(parenKick[0], '');
          }

          if (w.startsWith('[kick:')) {
            kickDsl = w;
            chordSym = '';
          }

          if (chordSym) {
            chordItems.push({
              symbol: convertChordSymbol(chordSym),
              kickDsl,
            });
          }

          if (kickDsl) {
            const parsed = parseKickDsl(kickDsl);
            for (let k = 0; k < 16; k++) {
              if (parsed.kicks[k]) kicksMerged[k] = true;
              if (parsed.ties[k]) tiesMerged[k] = true;
            }
          }
        });
      }

      let leftBar: RepeatBarline = 'none';
      if (bToken.leftDelim === '|:' || bToken.leftDelim === ':|:') leftBar = 'start';

      let rightBar: RepeatBarline = 'none';
      if (bToken.rightDelim === ':|' || bToken.rightDelim === ':|:') rightBar = 'end';
      else if (bToken.rightDelim === '||') rightBar = 'double';
      else if (bToken.rightDelim === '|.') rightBar = 'final';

      const isLastBarOnLine = bIdx === barTokens.length - 1;
      const isFirstBarOnLine = bIdx === 0;

      const measure: Measure = {
        id: `m_${currentMeasureNum}`,
        number: currentMeasureNum++,
        chords: chordItems,
        leftBarline: leftBar,
        rightBarline: rightBar,
        volta,
        simile,
        kicks: kicksMerged,
        ties: tiesMerged,
        rehearsalMark: pendingRehearsalMark,
        bandText: pendingBandText,
        segno: pendingSegno || (isFirstBarOnLine && lineSegno),
        toCoda: isLastBarOnLine && lineToCoda,
        dsAlCoda: isLastBarOnLine && lineDsAlCoda,
        pageBreakBefore: pendingPageBreak,
      };

      if (pendingRehearsalMark) pendingRehearsalMark = undefined;
      if (pendingBandText) pendingBandText = undefined;
      if (pendingSegno) pendingSegno = false;
      if (pendingPageBreak) pendingPageBreak = false;

      measures.push(measure);
    });
  }

  return {
    title: parsedTitle || chartTitle,
    bpm: parsedBpm ?? 125,
    keySignature: parsedKey ?? 'E♭m',
    timeSignature: parsedTimeSig ?? [4, 4],
    measures,
  };
}

/**
 * Updates a measure's kick notation in the DSL string to ensure closed-loop reactivity.
 */
export function updateMeasureKickInDsl(
  dslText: string,
  targetMeasureNum: number,
  kicks: boolean[],
  ties: boolean[]
): string {
  const kickTag = serializeKicks(kicks, ties);
  const lines = dslText.split('\n');
  let currentMeasureCounter = 1;

  for (let l = 0; l < lines.length; l++) {
    const line = lines[l];
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#')) continue;
    if (trimmed.startsWith('[') && !trimmed.startsWith('[kick:') && !/^\d+\.?$/.test(trimmed.slice(1, -1))) {
      continue;
    }

    const barlineRegex = /(:\|:|:\||\|:|\|\||\|\.|\|)/g;
    const delims: BarDelim[] = [];
    let m: RegExpExecArray | null;
    while ((m = barlineRegex.exec(line)) !== null) {
      delims.push({ delim: m[0], index: m.index });
    }

    if (delims.length < 2) continue;

    for (let i = 0; i < delims.length - 1; i++) {
      if (currentMeasureCounter === targetMeasureNum) {
        // Found the target measure in this line!
        const left = delims[i];
        const right = delims[i + 1];
        let barContent = line.substring(left.index + left.delim.length, right.index);

        // Remove existing kick tags or paren kicks
        barContent = barContent.replace(/\[kick:[^\]]+\]/g, '').replace(/\(>?[0-9a-z~&+.!]+\)/gi, '').trim();

        // Append new kick tag if present
        if (kickTag) {
          barContent = barContent ? `${barContent} ${kickTag}` : kickTag;
        }

        const newLine =
          line.substring(0, left.index + left.delim.length) +
          (barContent ? ` ${barContent} ` : ' ') +
          line.substring(right.index);

        lines[l] = newLine;
        return lines.join('\n');
      }
      currentMeasureCounter++;
    }
  }

  return dslText;
}

/**
 * Appends an anticipation (push / 食い) kick note to a specific measure in the DSL.
 * If chordName is provided (e.g. 'B♭7'), it appends or updates 'B♭7(>4&~)' in the target measure.
 */
export function applyAnticipationToMeasure(
  dslText: string,
  targetMeasureNum: number,
  chordName?: string,
  kickTag = '>4&~'
): string {
  const lines = dslText.split('\n');
  let currentMeasureCounter = 1;

  for (let l = 0; l < lines.length; l++) {
    const line = lines[l];
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#')) continue;
    if (trimmed.startsWith('[') && !trimmed.startsWith('[kick:') && !/^\d+\.?$/.test(trimmed.slice(1, -1))) {
      continue;
    }

    const barlineRegex = /(:\|:|:\||\|:|\|\||\|\.|\|)/g;
    const delims: BarDelim[] = [];
    let m: RegExpExecArray | null;
    while ((m = barlineRegex.exec(line)) !== null) {
      delims.push({ delim: m[0], index: m.index });
    }

    if (delims.length < 2) continue;

    for (let i = 0; i < delims.length - 1; i++) {
      if (currentMeasureCounter === targetMeasureNum) {
        const left = delims[i];
        const right = delims[i + 1];
        let barContent = line.substring(left.index + left.delim.length, right.index);

        // Remove existing kick tags or paren kicks
        barContent = barContent.replace(/\[kick:[^\]]+\]/g, '').replace(/\(>?[0-9a-z~&+.!]+\)/gi, '').trim();

        const kickNotation = kickTag.startsWith('>') ? `(${kickTag})` : `(>${kickTag})`;
        let newContent = '';

        if (chordName) {
          const words = barContent.split(/\s+/).filter(Boolean);
          if (words.length > 0 && words[words.length - 1] === chordName) {
            words[words.length - 1] = `${chordName}${kickNotation}`;
            newContent = words.join(' ');
          } else {
            const chordWithKick = `${chordName}${kickNotation}`;
            newContent = barContent ? `${barContent} ${chordWithKick}` : chordWithKick;
          }
        } else {
          newContent = barContent ? `${barContent} ${kickNotation}` : kickNotation;
        }

        const newLine =
          line.substring(0, left.index + left.delim.length) +
          (newContent ? ` ${newContent} ` : ' ') +
          line.substring(right.index);

        lines[l] = newLine;
        return lines.join('\n');
      }
      currentMeasureCounter++;
    }
  }

  return dslText;
}
