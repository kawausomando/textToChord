import {
  updateMeasureKickInDsl,
  parseMasterChartText,
  applyAnticipationToMeasure,
  serializeKicks,
  parseKickDsl,
} from './chartParser';
import { convertChordSymbol } from './converter';

export interface CommandResult {
  success: boolean;
  newDsl: string;
  explanation: string;
}

/**
 * Safely extracts a chord symbol from natural language prompt,
 * handling Unicode flats/sharps (♭/♯/b/#) and ignoring measure markers like M1, M4.
 */
function extractChordFromText(text: string): string | null {
  const chordRegex = /(?:^|[\sの第目節])([A-Ga-g][b#♭♯]?(?:maj|min|m|M|Δ|aug|dim|sus|add|[0-9()\-♭♯b#Δø/]*))/g;
  let m: RegExpExecArray | null;
  while ((m = chordRegex.exec(text)) !== null) {
    const candidate = m[1];
    if (/^M\d+$/i.test(candidate)) continue;
    if (/^(?:in|half|to|coda)$/i.test(candidate)) continue;
    if (/^[ab]$/.test(candidate) || text.slice(m.index + m[0].length).startsWith('メロ')) continue;
    if (candidate.length === 1 && !/[A-G]/.test(candidate)) continue;
    return convertChordSymbol(candidate);
  }
  return null;
}

const SEMITONE_MAP_UP: Record<string, string> = {
  'C': 'C♯', 'C♯': 'D', 'D♭': 'D',
  'D': 'E♭', 'D♯': 'E', 'E♭': 'E',
  'E': 'F',
  'F': 'F♯', 'F♯': 'G', 'G♭': 'G',
  'G': 'A♭', 'G♯': 'A', 'A♭': 'A',
  'A': 'B♭', 'A♯': 'B', 'B♭': 'B',
  'B': 'C'
};

const SEMITONE_MAP_DOWN: Record<string, string> = {
  'C': 'B', 'C♯': 'C', 'D♭': 'C',
  'D': 'D♭', 'D♯': 'D', 'E♭': 'D',
  'E': 'E♭',
  'F': 'E', 'F♯': 'F', 'G♭': 'F',
  'G': 'G♭', 'G♯': 'G', 'A♭': 'G',
  'A': 'A♭', 'A♯': 'A', 'B♭': 'A',
  'B': 'B♭'
};

function transposeChord(chord: string, dir: 'up' | 'down'): string {
  const map = dir === 'up' ? SEMITONE_MAP_UP : SEMITONE_MAP_DOWN;
  return chord.replace(/([A-G][♭♯b#]?)/g, (root) => {
    // Normalize accidental
    const cleanRoot = root.replace(/b/g, '♭').replace(/#/g, '♯');
    return map[cleanRoot] || map[root] || root;
  });
}
 
export interface ParsedRhythmPhrase {
  kicks: boolean[];
  ties: boolean[];
  description: string;
}

/**
 * Parses a rhythmic phrase or kick pattern from natural language instructions.
 * Supports:
 * 1. Direct DSL format: e.g. "[kick: 1, 2&, 4]"
 * 2. Famous rhythm / groove keywords:
 *    - "チャールストン": 1, 2&
 *    - "3-3-2" / "ソンクラーベ" / "ラテンキメ": 1, 2&, 4
 *    - "四つ打ち" / "4つ打ち" / "全拍キメ": 1, 2, 3, 4
 *    - "裏打ち" / "8分裏打ち": 1&, 2&, 3&, 4&
 *    - "バックビート" / "2拍4拍" / "2・4": 2, 4
 *    - "1・3拍" / "1拍3拍": 1, 3
 *    - "頭キメ" / "アタック" / "hit": 1
 * 3. Arbitrary beat-by-beat combinations:
 *    - e.g. "1拍目、2拍目裏、4拍目" -> 1, 2&, 4
 *    - "1拍裏と3拍裏" -> 1&, 3&
 *    - "2拍裏をタイで伸ばして、4拍目もキメて" -> 2&~, 4
 *    - "1, 2&, 4" / "1と3"
 */
export function parseRhythmPhraseFromText(text: string): ParsedRhythmPhrase | null {
  const kicks = new Array(16).fill(false);
  const ties = new Array(16).fill(false);

  // 1. Direct DSL tag embedded in text: [kick: ...]
  const kickTagMatch = text.match(/\[kick:\s*([^\]]+)\]/i);
  if (kickTagMatch) {
    const parsed = parseKickDsl(kickTagMatch[0]);
    const desc = serializeKicks(parsed.kicks, parsed.ties);
    return {
      kicks: parsed.kicks,
      ties: parsed.ties,
      description: desc || kickTagMatch[0],
    };
  }

  // 2. Preset Rhythm Phrase keywords
  if (/チャールストン/i.test(text)) {
    kicks[0] = true; // Beat 1
    kicks[6] = true; // Beat 2&
    if (/タイ|伸ば|シンコペ/i.test(text)) {
      ties[6] = true;
    }
    return {
      kicks,
      ties,
      description: ties[6] ? 'チャールストン シンコペーション (1, 2&~)' : 'チャールストン (1, 2&)',
    };
  }

  if (/3-3-2|ソンクラーベ|ラテンキメ|クラーベ/i.test(text)) {
    kicks[0] = true; // Beat 1
    kicks[6] = true; // Beat 2&
    kicks[12] = true; // Beat 4
    if (/タイ|伸ば|シンコペ/i.test(text)) {
      ties[6] = true;
    }
    return {
      kicks,
      ties,
      description: ties[6] ? '3-3-2 シンコペーション (1, 2&~, 4)' : '3-3-2 (1, 2&, 4)',
    };
  }

  if (/四つ打ち|4つ打ち|四分打ち|4分打ち|全拍(?:キメ|打ち)|1[、,・\s]*2[、,・\s]*3[、,・\s]*4拍/i.test(text)) {
    kicks[0] = true;
    kicks[4] = true;
    kicks[8] = true;
    kicks[12] = true;
    return {
      kicks,
      ties,
      description: '4つ打ちキメ (1, 2, 3, 4)',
    };
  }

  if (/8分裏打ち|裏打ち/i.test(text)) {
    kicks[2] = true;
    kicks[6] = true;
    kicks[10] = true;
    kicks[14] = true;
    return {
      kicks,
      ties,
      description: '8分裏打ち (1&, 2&, 3&, 4&)',
    };
  }

  if (/バックビート|2拍4拍|2・4拍|2[、,・\s]*4拍/i.test(text)) {
    kicks[4] = true; // Beat 2
    kicks[12] = true; // Beat 4
    return {
      kicks,
      ties,
      description: '2・4拍キメ (2, 4)',
    };
  }

  if (/1拍3拍|1・3拍|1[、,・\s]*3拍/i.test(text)) {
    kicks[0] = true; // Beat 1
    kicks[8] = true; // Beat 3
    return {
      kicks,
      ties,
      description: '1・3拍キメ (1, 3)',
    };
  }

  // 3. Beat-by-Beat Parsing
  // Remove measure reference prefix so measure numbers aren't confused with beat numbers
  let cleanedText = text
    .replace(/(?:第\s*)?(?:\d+\s*(?:[と・,、]|および)\s*)*\d+\s*小節目?(?:の|に|を)?/g, '')
    .replace(/小節\s*\d+(?:の|に|を)?/g, '')
    .replace(/M\s*\d+/gi, '');

  // Strip chord modifications if present so chord degrees (e.g. Csus4, A11) are not treated as beats
  cleanedText = cleanedText.replace(/コード(?:を)?\s*([A-Ga-g][b#♭♯]?[a-zA-Z0-9()\-Δø/]*)\s*(?:に|へ)(?:して|変えて|変更)/, '');

  // Must have an explicit beat indicator (拍/拍目) OR an offbeat/subdivision indicator (&, 裏, +, etc.)
  const beatRegex = /([1-4])\s*(?:(拍(?:目)?)\s*(?:(裏|ウラ|&|\+|半|\.5)|(16分裏|16分ウラ|a)|(16分|e))?|(?:(裏|ウラ|&|\+|半|\.5)|(16分裏|16分ウラ|a)|(16分|e)))(?:[^\s,、と・]*(タイ|伸ばす|伸ばし|~))?/gi;

  let match: RegExpExecArray | null;
  let foundAnyBeat = false;
  const matchedBeatsDesc: string[] = [];

  while ((match = beatRegex.exec(cleanedText)) !== null) {
    const beatNum = parseInt(match[1], 10);
    const isOffbeat8th = Boolean(match[3] || match[6]);
    const isOffbeat16thLast = Boolean(match[4] || match[7]);
    const isOffbeat16thSecond = Boolean(match[5] || match[8]);
    const hasTie = Boolean(match[9]);

    if (beatNum >= 1 && beatNum <= 4) {
      let step = (beatNum - 1) * 4;
      let label = `${beatNum}拍目`;

      if (isOffbeat8th) {
        step += 2;
        label = `${beatNum}拍目裏`;
      } else if (isOffbeat16thLast) {
        step += 3;
        label = `${beatNum}拍目16分裏`;
      } else if (isOffbeat16thSecond) {
        step += 1;
        label = `${beatNum}拍目16分`;
      }

      kicks[step] = true;
      if (hasTie) {
        ties[step] = true;
        label += '(タイ)';
      }
      matchedBeatsDesc.push(label);
      foundAnyBeat = true;
    }
  }

  // Also check compact beat notation: e.g. "1, 2&, 4" or "1 3"
  if (!foundAnyBeat) {
    const compactMatch = cleanedText.match(/\b([1-4](?:[&ea~]|\.5)?(?:\s*[,、と・\s]\s*[1-4](?:[&ea~]|\.5)?)+)\b/i);
    if (compactMatch) {
      const tokens = compactMatch[1].split(/[,、と・\s]+/).filter(Boolean);
      tokens.forEach((tok) => {
        const sm = tok.match(/([1-4])([&ea~]|\.5)?/i);
        if (sm) {
          const b = parseInt(sm[1], 10);
          const sub = sm[2] ? sm[2].toLowerCase() : '';
          let step = (b - 1) * 4;
          const hasTie = tok.includes('~');
          if (sub === '&' || sub === '.5') step += 2;
          else if (sub === 'a') step += 3;
          else if (sub === 'e') step += 1;
          if (step >= 0 && step < 16) {
            kicks[step] = true;
            if (hasTie) ties[step] = true;
            foundAnyBeat = true;
            matchedBeatsDesc.push(`${b}${sub}`);
          }
        }
      });
    }
  }

  if (!foundAnyBeat) {
    // Single head hit fallback: "頭キメ", "1拍目キメ", "hit", "ブレイク"
    if (/頭キメ|頭打ち|hit|アタック|1拍目キメ|ブレイク|break/i.test(text)) {
      kicks[0] = true;
      return {
        kicks,
        ties,
        description: '頭キメ (hit)',
      };
    }
    return null;
  }

  const dslTag = serializeKicks(kicks, ties);
  return {
    kicks,
    ties,
    description: `${matchedBeatsDesc.join(', ')} [${dslTag}]`,
  };
}

/**
 * Natural language command processor for Master Rhythm Charts.
 */
export function processNaturalLanguageCommand(currentDsl: string, instruction: string): CommandResult {
  const text = instruction.trim();
  if (!text) {
    return { success: false, newDsl: currentDsl, explanation: '指示文が空です。' };
  }

  // 1. Check Transpose All (全体トランスポーズ)
  if (/半音(上げ|プラス|\+)/i.test(text) || /transpose\s*up/i.test(text)) {
    const lines = currentDsl.split('\n').map((line) => {
      if (line.trim().startsWith('[') || line.trim().startsWith('//')) return line;
      return transposeChord(line, 'up');
    });
    return {
      success: true,
      newDsl: lines.join('\n'),
      explanation: '✅ 全体のコードを半音上に移調（トランスポーズ）しました。',
    };
  }

  if (/半音(下げ|マイナス|-)/i.test(text) || /transpose\s*down/i.test(text)) {
    const lines = currentDsl.split('\n').map((line) => {
      if (line.trim().startsWith('[') || line.trim().startsWith('//')) return line;
      return transposeChord(line, 'down');
    });
    return {
      success: true,
      newDsl: lines.join('\n'),
      explanation: '✅ 全体のコードを半音下に移調（トランスポーズ）しました。',
    };
  }

  // 2. Check Page Break insertion (改ページ)
  if (/改ページ|ページブレイク|page\s*break|2ページ目/i.test(text)) {
    // Check if section specified
    const secTarget = text.match(/(Aメロ|Bメロ|サビ|コーラス|CHORUS|CODA|B|A|INTRO|イントロ)/i);
    const targetTag = secTarget ? secTarget[1].toUpperCase() : null;

    if (currentDsl.includes('[PAGE_BREAK]')) {
      return {
        success: false,
        newDsl: currentDsl,
        explanation: 'ℹ️ すでに [PAGE_BREAK] が設定されています。',
      };
    }

    if (targetTag) {
      const regex = new RegExp(`(\\[(?:CHORUS|サビ|B|Bメロ)\\]|\\[${targetTag}\\])`, 'i');
      if (regex.test(currentDsl)) {
        const newDsl = currentDsl.replace(regex, `[PAGE_BREAK]\n\n$1`);
        return {
          success: true,
          newDsl,
          explanation: `✅ セクションの手前に [PAGE_BREAK]（改ページ）を挿入しました。`,
        };
      }
    }

    // Default: insert before [CHORUS] or [B] or in the middle
    if (currentDsl.includes('[CHORUS]')) {
      const newDsl = currentDsl.replace('[CHORUS]', '[PAGE_BREAK]\n\n[CHORUS]');
      return {
        success: true,
        newDsl,
        explanation: '✅ [CHORUS]（サビ）の手前に [PAGE_BREAK] を挿入し、見開きレイアウトを最適化しました。',
      };
    } else {
      const lines = currentDsl.split('\n');
      const mid = Math.floor(lines.length / 2);
      lines.splice(mid, 0, '\n[PAGE_BREAK]\n');
      return {
        success: true,
        newDsl: lines.join('\n'),
        explanation: '✅ 中間地点に [PAGE_BREAK] を挿入しました。',
      };
    }
  }

  // 3. Anticipation / Push (食わせる / プッシュ / アンティシペーション) commands
  // Musically, "N小節目のコードを食わせて" means anticipating the chord into measure N-1,
  // appending a note at beat 4 8th off-beat (>4&~) tied over the barline into measure N.
  const isClear = /消して|クリア|削除|無くして|リセット/i.test(text);
  if (/食わせて|食わせ|食い|プッシュ|アンティシペーション|anticipat/i.test(text) && !isClear) {
    const is16th = /16分|4a/i.test(text);
    const kickTag = is16th ? '>4a~' : '>4&~';

    const extractedChord = extractChordFromText(text);

    // Check if an explicit beat is specified (e.g. 3小節目の4拍目裏)
    const explicitBeatMatch = text.match(/(?:第\s*)?(\d+)\s*小節目?(?:の)?\s*(?:[1-4]|4)拍目/i);
    let targetMeasureNum: number | null = explicitBeatMatch ? parseInt(explicitBeatMatch[1], 10) : null;
    let destMeasureNum: number | null = null;

    // Check general measure number
    const generalMeasureMatch = text.match(/(?:第\s*)?(\d+)\s*(?:小節(?:目)?|小節)/i) || text.match(/M\s*(\d+)/i);
    if (generalMeasureMatch) {
      const mNum = parseInt(generalMeasureMatch[1], 10);
      if (!targetMeasureNum) {
        // "N小節目の〇〇を食わせて" -> N is destination measure, target measure is N - 1
        destMeasureNum = mNum;
        targetMeasureNum = mNum - 1;
      } else if (targetMeasureNum !== mNum) {
        destMeasureNum = mNum;
      }
    }

    if (targetMeasureNum !== null) {
      if (targetMeasureNum < 1) {
        return {
          success: false,
          newDsl: currentDsl,
          explanation: '⚠️ 1小節目より前に小節がないため、前小節からの食い（アンティシペーション）は設定できません。',
        };
      }

      let chordToUse = extractedChord;
      if (!chordToUse && destMeasureNum) {
        // Look up chord of destMeasure in current chart
        const chart = parseMasterChartText(currentDsl);
        const destMeasure = chart.measures.find((m) => m.number === destMeasureNum);
        if (destMeasure && destMeasure.chords.length > 0) {
          chordToUse = destMeasure.chords[0].symbol;
        }
      }

      const newDsl = applyAnticipationToMeasure(currentDsl, targetMeasureNum, chordToUse || undefined, kickTag);
      const chordLabel = chordToUse ? `「${chordToUse}(${kickTag})」` : `「${kickTag}」`;
      const beatName = is16th ? '4拍目16分裏' : '4拍目8分裏';
      const destInfo = destMeasureNum ? `${destMeasureNum}小節目の${chordToUse || 'コード'}を食わせるため、` : '';
      const targetLabel = destMeasureNum ? `前小節（小節 ${targetMeasureNum}）` : `小節 ${targetMeasureNum}`;

      return {
        success: true,
        newDsl,
        explanation: `✅ ${destInfo}${targetLabel}の${beatName}に${chordLabel}（タイ付き）を追記しました。`,
      };
    }
  }

  // 4. Check Measure-specific commands (e.g. 3小節目, 小節3, M8, 8小節, 4小節目と8小節目, 4と8小節目, 4, 8小節目)
  const allMeasureMatches = [...text.matchAll(/(?:第\s*)?(\d+(?:\s*(?:[と・,、]|および)\s*\d+)*)\s*(?:小節(?:目)?|小節)|(?:第\s*)?小節\s*(\d+)|M\s*(\d+)/gi)];
  const targetMeasureNums: number[] = [];
  allMeasureMatches.forEach((m) => {
    if (m[1]) {
      const parts = m[1].split(/[と・,、]|および|\s+/).filter(Boolean);
      parts.forEach((p) => {
        const num = parseInt(p, 10);
        if (!isNaN(num) && !targetMeasureNums.includes(num)) {
          targetMeasureNums.push(num);
        }
      });
    } else {
      const num = parseInt(m[2] || m[3], 10);
      if (!isNaN(num) && !targetMeasureNums.includes(num)) {
        targetMeasureNums.push(num);
      }
    }
  });

  if (targetMeasureNums.length > 0) {
    const measureNum = targetMeasureNums[0];

    // 4a. Kick / Comping clear commands
    if (/(?:キメ|食い|プッシュ|アンティシペーション)(?:を)?(?:消して|クリア|削除|無くして|リセット)/i.test(text)) {
      const kicks = new Array(16).fill(false);
      const ties = new Array(16).fill(false);
      let updatedDsl = currentDsl;
      targetMeasureNums.forEach((mNum) => {
        updatedDsl = updateMeasureKickInDsl(updatedDsl, mNum, kicks, ties);
      });
      const measuresLabel = targetMeasureNums.join(', ');
      return {
        success: true,
        newDsl: updatedDsl,
        explanation: `✅ 小節 ${measuresLabel} のキメ・コンピング設定を消去しました。`,
      };
    }

    // 4b. Chord replacement in measure (e.g. 2小節目のコードをFm7に変えて, 2小節目のコードをCsus4に変えて)
    const chordChangeMatch = text.match(/コード(?:を)?\s*([A-Ga-g][b#♭♯]?[a-zA-Z0-9()\-Δø/]*)\s*(?:に|へ)(?:して|変えて|変更)/);
    if (chordChangeMatch) {
      const rawChord = chordChangeMatch[1].trim();
      const formattedChord = convertChordSymbol(rawChord);

      const lines = currentDsl.split('\n');
      let counter = 1;
      for (let l = 0; l < lines.length; l++) {
        if (lines[l].includes('|')) {
          const parts = lines[l].split('|');
          const innerParts = parts.slice(1, -1);
          if (counter + innerParts.length > measureNum) {
            const targetIdx = measureNum - counter + 1;
            const oldContent = parts[targetIdx];
            const existingKick = oldContent.match(/\[kick:[^\]]+\]|\(>?[0-9a-z~&+.!]+\)/i);
            const kickPart = existingKick ? ` ${existingKick[0]}` : '';
            const voltaPrefix = oldContent.match(/^(\s*\d+\.\s*)/);
            const voltaPart = voltaPrefix ? voltaPrefix[1] : ' ';

            parts[targetIdx] = `${voltaPart}${formattedChord}${kickPart} `;
            lines[l] = parts.join('|');
            return {
              success: true,
              newDsl: lines.join('\n'),
              explanation: `✅ 小節 ${measureNum} のコードを「${formattedChord}」に変更しました。`,
            };
          }
          counter += innerParts.length;
        }
      }
    }

    // 4c. Arbitrary Kick / Rhythm phrase commands (Beat numbers, Charleston, 3-3-2, 4-beat, off-beats, direct DSL)
    const parsedPhrase = parseRhythmPhraseFromText(text);
    if (parsedPhrase) {
      let updatedDsl = currentDsl;
      targetMeasureNums.forEach((mNum) => {
        updatedDsl = updateMeasureKickInDsl(updatedDsl, mNum, parsedPhrase.kicks, parsedPhrase.ties);
      });
      const measuresLabel = targetMeasureNums.join(', ');
      return {
        success: true,
        newDsl: updatedDsl,
        explanation: `✅ 小節 ${measuresLabel} にキメ「${parsedPhrase.description}」を設定しました。`,
      };
    }

    // 3b. Simile (%) command
    if (/%|コード繰り返し|リピート記号に|反復小節/i.test(text) && !/セクション|Aメロ/i.test(text)) {
      const chart = parseMasterChartText(currentDsl);
      if (measureNum <= chart.measures.length) {
        // Replace target measure in DSL with %
        const lines = currentDsl.split('\n');
        let counter = 1;
        for (let l = 0; l < lines.length; l++) {
          const line = lines[l];
          if (line.includes('|')) {
            const parts = line.split('|');
            // Check if measure is in this line
            const innerParts = parts.slice(1, -1);
            if (counter + innerParts.length > measureNum) {
              const targetIdx = measureNum - counter + 1; // index in parts
              parts[targetIdx] = ' % ';
              lines[l] = parts.join('|');
              return {
                success: true,
                newDsl: lines.join('\n'),
                explanation: `✅ 小節 ${measureNum} をコード繰り返し記号（%）に変更しました。`,
              };
            }
            counter += innerParts.length;
          }
        }
      }
    }

    // 3c. Navigation commands on measure
    if (/To Coda|to coda|コーダへ/i.test(text)) {
      const lines = currentDsl.split('\n');
      let counter = 1;
      for (let l = 0; l < lines.length; l++) {
        if (lines[l].includes('|')) {
          const parts = lines[l].split('|');
          const innerParts = parts.slice(1, -1);
          if (counter + innerParts.length > measureNum) {
            const targetIdx = measureNum - counter + 1;
            parts[targetIdx] = ` ${parts[targetIdx].trim()} $ToCoda `;
            lines[l] = parts.join('|');
            return {
              success: true,
              newDsl: lines.join('\n'),
              explanation: `✅ 小節 ${measureNum} に「To Coda 𝄌」記号を追加しました。`,
            };
          }
          counter += innerParts.length;
        }
      }
    }

    if (/セーニョ|segno|𝄋/i.test(text)) {
      const lines = currentDsl.split('\n');
      let counter = 1;
      for (let l = 0; l < lines.length; l++) {
        if (lines[l].includes('|')) {
          const parts = lines[l].split('|');
          const innerParts = parts.slice(1, -1);
          if (counter + innerParts.length > measureNum) {
            const targetIdx = measureNum - counter + 1;
            parts[targetIdx] = ` $Segno ${parts[targetIdx].trim()} `;
            lines[l] = parts.join('|');
            return {
              success: true,
              newDsl: lines.join('\n'),
              explanation: `✅ 小節 ${measureNum} に「セーニョ (𝄋)」記号を追加しました。`,
            };
          }
          counter += innerParts.length;
        }
      }
    }
  }

  // 4. Section-level commands (e.g. Aメロをリピートにして, 1番カッコと2番カッコを設置)
  if (/1番カッコ|2番カッコ|カッコ/i.test(text)) {
    // Add voltas [1.] and [2.] to section A
    if (currentDsl.includes('[A]')) {
      // Look for line in section A
      const lines = currentDsl.split('\n');
      let inA = false;
      for (let l = 0; l < lines.length; l++) {
        if (lines[l].includes('[A]')) inA = true;
        else if (inA && lines[l].startsWith('[') && !lines[l].includes('[kick:')) {
          inA = false;
        }

        if (inA && lines[l].includes('|') && !lines[l].includes('[1.]') && !lines[l].includes('1.')) {
          // Wrap with 1st/2nd ending pattern
          const parts = lines[l].split('|').map((p) => p.trim()).filter(Boolean);
          if (parts.length >= 4) {
            lines[l] = `|: ${parts[0]} | ${parts[1]} | ${parts[2]} |1. ${parts[3]} :|2. ${parts[3]} ||`;
            return {
              success: true,
              newDsl: lines.join('\n'),
              explanation: '✅ Aセクションに「1番カッコ（[1.]）と2番カッコ（[2.]）」の反復構造を自動構築しました。',
            };
          }
        }
      }
    }
  }

  if (/リピート(?:に)?(?:して|追加)/i.test(text)) {
    const secTarget = text.match(/(Aメロ|Bメロ|サビ|コーラス|CHORUS|INTRO|イントロ|B|A)/i);
    const secName = secTarget ? secTarget[1].toUpperCase().replace('メロ', '') : 'A';

    const lines = currentDsl.split('\n');
    let inSec = false;
    for (let l = 0; l < lines.length; l++) {
      if (lines[l].includes(`[${secName}]`)) inSec = true;
      else if (inSec && lines[l].startsWith('[') && !lines[l].includes('[kick:')) {
        inSec = false;
      }

      if (inSec && lines[l].includes('|')) {
        lines[l] = lines[l].replace(/^\|\s*/, '|: ').replace(/\s*\|$/, ' :|');
        return {
          success: true,
          newDsl: lines.join('\n'),
          explanation: `✅ セクション [${secName}] を反復リピート記号（|: 〜 :|）で囲みました。`,
        };
      }
    }
  }

  return {
    success: false,
    newDsl: currentDsl,
    explanation:
      '💡 指示を解釈できませんでした。例：「3小節目の4拍目裏を食わせて」「Aメロに1番・2番カッコを設置」「8小節目にTo Codaを追加」「全体を半音上げて」などをお試しください。',
  };
}
