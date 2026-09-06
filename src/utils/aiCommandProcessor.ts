import { updateMeasureKickInDsl, parseMasterChartText, applyAnticipationToMeasure } from './chartParser';
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

  // 4. Check Measure-specific commands (e.g. 3小節目, M8, 8小節)
  const measureMatch = text.match(/(?:第\s*)?(\d+)\s*(?:小節(?:目)?|小節)/i) || text.match(/M\s*(\d+)/i);

  if (measureMatch) {
    const measureNum = parseInt(measureMatch[1], 10);

    // 4a. Kick / Comping commands (Hit / Clear)
    if (/頭キメ|頭打ち|hit|アタック|1拍目キメ/i.test(text)) {
      const kicks = new Array(16).fill(false);
      const ties = new Array(16).fill(false);
      kicks[0] = true; // Beat 1 hit

      const newDsl = updateMeasureKickInDsl(currentDsl, measureNum, kicks, ties);
      return {
        success: true,
        newDsl,
        explanation: `✅ 小節 ${measureNum} に「頭キメ (hit)」を設定しました。`,
      };
    }

    if (/(?:キメ|食い|プッシュ|アンティシペーション)(?:を)?(?:消して|クリア|削除|無くして|リセット)/i.test(text)) {
      const kicks = new Array(16).fill(false);
      const ties = new Array(16).fill(false);

      const newDsl = updateMeasureKickInDsl(currentDsl, measureNum, kicks, ties);
      return {
        success: true,
        newDsl,
        explanation: `✅ 小節 ${measureNum} のキメ・コンピング設定を消去しました。`,
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

    // 3d. Chord replacement in measure
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
