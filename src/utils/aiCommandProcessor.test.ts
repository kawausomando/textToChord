import { processNaturalLanguageCommand } from './aiCommandProcessor';
import { parseMasterChartText, updateMetadataInDsl } from './chartParser';

function runTests() {
  console.log('--- Testing Natural Language AI Command Processor ---');

  const baseDsl = `[INTRO]
|: E♭m7 | C♭ | A♭m7 | B♭7 :|

[A]
| E♭m7 | C♭ | A♭m7 | B♭7 |
| A♭m7 | B♭7 | E♭m7 | E♭m7 |`;

  let passCount = 0;
  let totalTests = 0;

  function assert(name: string, condition: boolean, extra?: unknown) {
    totalTests++;
    if (condition) {
      console.log(`[PASS] ${name}`);
      passCount++;
    } else {
      console.error(`[FAIL] ${name}`, extra);
    }
  }

  // Test 1: User's exact prompt "4小節目のBb7食わせてほしい"
  // Musically: should append Bb7 on beat 4 8th off-beat (>4&~) in measure 3, tied to measure 4
  const res1 = processNaturalLanguageCommand(baseDsl, '4小節目のBb7食わせてほしい');
  assert(
    'User request: "4小節目のBb7食わせてほしい" appends B♭7(>4&~) to measure 3',
    res1.success &&
      res1.newDsl.includes('A♭m7 B♭7(>4&~)') &&
      res1.newDsl.includes('| B♭7 :|') &&
      res1.explanation.includes('3') &&
      res1.explanation.includes('8分裏')
  );

  // Test 1B: AST Closed-Loop Verification: ensures parser correctly reads kicks[14] and ties[14]
  const parsed1 = parseMasterChartText(res1.newDsl);
  const m3 = parsed1.measures[2];
  assert(
    'AST parser: measure 3 has kicks[14]=true, ties[14]=true and chords [A♭m7, B♭7]',
    m3.kicks !== undefined &&
      m3.kicks[14] === true &&
      m3.ties !== undefined &&
      m3.ties[14] === true &&
      m3.chords.length === 2 &&
      m3.chords[0].symbol === 'A♭m7' &&
      m3.chords[1].symbol === 'B♭7',
    m3
  );

  // Test 2: "3小節目の4拍目裏を食わせて" (explicit beat in measure 3)
  const res2 = processNaturalLanguageCommand(baseDsl, '3小節目の4拍目裏を食わせて');
  assert(
    'Direct beat: "3小節目の4拍目裏を食わせて" sets 4&~ on measure 3 with correct copy',
    res2.success &&
      (res2.newDsl.includes('4&~') || res2.newDsl.includes('>4&~')) &&
      res2.explanation.includes('小節 3') &&
      !res2.explanation.includes('前小節')
  );

  // Test 3: "4小節目食わせて" (no chord specified in prompt, auto-looks up measure 4's B♭7)
  const res3 = processNaturalLanguageCommand(baseDsl, '4小節目食わせて');
  assert(
    'Auto-lookup: "4小節目食わせて" auto-detects B♭7 from measure 4 and appends B♭7(>4&~) to measure 3',
    res3.success && res3.newDsl.includes('A♭m7 B♭7(>4&~)')
  );

  // Test 3B: Particle-less syntax "4小節目Bb7食わせて"
  const res3b = processNaturalLanguageCommand(baseDsl, '4小節目Bb7食わせて');
  assert(
    'Particle-less: "4小節目Bb7食わせて" correctly extracts Bb7 without の',
    res3b.success && res3b.newDsl.includes('A♭m7 B♭7(>4&~)')
  );

  // Test 3C: Single uppercase note chord "4小節目のB食わせて"
  const res3c = processNaturalLanguageCommand(baseDsl, '4小節目のB食わせて');
  assert(
    'Single letter chord: "4小節目のB食わせて" correctly identifies B chord',
    res3c.success && res3c.newDsl.includes('B(>4&~)')
  );

  // Test 3D: "4小節目の頭食わせて" (user exact prompt)
  const res3d = processNaturalLanguageCommand(baseDsl, '4小節目の頭食わせて');
  assert(
    'Head anticipation: "4小節目の頭食わせて" anticipates measure 4 into measure 3 with B♭7(>4&~)',
    res3d.success && res3d.newDsl.includes('A♭m7 B♭7(>4&~)')
  );

  // Test 4: "1小節目のコードを食わせて" (edge case: cannot anticipate before bar 1)
  const res4 = processNaturalLanguageCommand(baseDsl, '1小節目のコードを食わせて');
  assert(
    'Edge case: "1小節目のコードを食わせて" returns friendly warning',
    !res4.success && res4.explanation.includes('1小節目より前')
  );

  // Test 5: Head hit instruction
  const res5 = processNaturalLanguageCommand(baseDsl, '5小節目を頭キメにして');
  assert(
    'Head hit: "5小節目を頭キメにして" successfully applied [kick: 1]',
    res5.success && res5.newDsl.includes('[kick: 1]')
  );

  // Test 6: Clear anticipation "3小節目の食いを消して"
  const res6 = processNaturalLanguageCommand(res1.newDsl, '3小節目の食いを消して');
  const parsed6 = parseMasterChartText(res6.newDsl);
  assert(
    'Clear: "3小節目の食いを消して" clears kicks from measure 3',
    res6.success && parsed6.measures[2].kicks?.every((k) => !k)
  );

  // Test 7: Navigation To Coda
  const res7 = processNaturalLanguageCommand(baseDsl, '8小節目にTo Codaを追加して');
  assert(
    'Navigation: "8小節目にTo Codaを追加して" successfully added $ToCoda',
    res7.success && res7.newDsl.includes('$ToCoda')
  );

  // Test 8: Chord modification
  const res8 = processNaturalLanguageCommand(baseDsl, '2小節目のコードをFm7に変えて');
  assert(
    'Chord replace: "2小節目のコードをFm7に変えて" successfully replaced chord with Fm7',
    res8.success && res8.newDsl.includes('Fm7')
  );

  const res8b = processNaturalLanguageCommand(baseDsl, '2小節目のコードをCsus4に変えて');
  assert(
    'Chord replace Csus4: "2小節目のコードをCsus4に変えて" successfully replaced chord with Csus4',
    res8b.success && res8b.newDsl.includes('Csus4'),
    res8b
  );

  // Test 9: Transpose Up
  const res9 = processNaturalLanguageCommand(baseDsl, '全体を半音上げて');
  assert(
    'Transpose: "全体を半音上げて" successfully transposed E♭m7 to Em7',
    res9.success && res9.newDsl.includes('Em7')
  );

  // Test 10: Arbitrary beat combination: 1拍目、2拍目裏、4拍目
  const res10 = processNaturalLanguageCommand(baseDsl, '4小節目のキメを 1拍目、2拍目裏、4拍目 にして');
  const parsed10 = parseMasterChartText(res10.newDsl);
  const m4_10 = parsed10.measures[3];
  assert(
    'Arbitrary phrase: "4小節目のキメを 1拍目、2拍目裏、4拍目 にして" applies [kick: 1, 2&, 4]',
    res10.success &&
      res10.newDsl.includes('[kick: 1, 2&, 4]') &&
      m4_10.kicks[0] === true &&
      m4_10.kicks[6] === true &&
      m4_10.kicks[12] === true &&
      !m4_10.kicks[1]
  );

  // Test 11: Keyword "チャールストン" (1, 2&)
  const res11 = processNaturalLanguageCommand(baseDsl, '3小節目にチャールストンのキメを入れて');
  const parsed11 = parseMasterChartText(res11.newDsl);
  const m3_11 = parsed11.measures[2];
  assert(
    'Keyword Charleston: "3小節目にチャールストンのキメを入れて" applies [kick: 1, 2&]',
    res11.success &&
      res11.newDsl.includes('[kick: 1, 2&]') &&
      m3_11.kicks[0] === true &&
      m3_11.kicks[6] === true &&
      !m3_11.kicks[12]
  );

  // Test 12: Backbeat: 2拍目と4拍目
  const res12 = processNaturalLanguageCommand(baseDsl, '5小節目の2拍目と4拍目をキメて');
  const parsed12 = parseMasterChartText(res12.newDsl);
  const m5_12 = parsed12.measures[4];
  assert(
    'Backbeat: "5小節目の2拍目と4拍目をキメて" applies [kick: 2, 4]',
    res12.success &&
      res12.newDsl.includes('[kick: 2, 4]') &&
      m5_12.kicks[4] === true &&
      m5_12.kicks[12] === true &&
      !m5_12.kicks[0]
  );

  // Test 13: 4つ打ちキメ (1, 2, 3, 4)
  const res13 = processNaturalLanguageCommand(baseDsl, '8小節目を4つ打ちキメにして');
  const parsed13 = parseMasterChartText(res13.newDsl);
  const m8_13 = parsed13.measures[7];
  assert(
    'Four-beat: "8小節目を4つ打ちキメにして" applies [kick: 1, 2, 3, 4]',
    res13.success &&
      res13.newDsl.includes('[kick: 1, 2, 3, 4]') &&
      m8_13.kicks[0] === true &&
      m8_13.kicks[4] === true &&
      m8_13.kicks[8] === true &&
      m8_13.kicks[12] === true
  );

  // Test 14: Off-beats: 1拍裏と3拍裏
  const res14 = processNaturalLanguageCommand(baseDsl, '2小節目に1拍裏と3拍裏のキメ');
  const parsed14 = parseMasterChartText(res14.newDsl);
  const m2_14 = parsed14.measures[1];
  assert(
    'Off-beats: "2小節目に1拍裏と3拍裏のキメ" applies [kick: 1&, 3&]',
    res14.success &&
      res14.newDsl.includes('[kick: 1&, 3&]') &&
      m2_14.kicks[2] === true &&
      m2_14.kicks[10] === true &&
      !m2_14.kicks[0]
  );

  // Test 15: Phrasing with tie: 2拍裏をタイで伸ばして、4拍目もキメて
  const res15 = processNaturalLanguageCommand(baseDsl, '4小節目の2拍裏をタイで伸ばして、4拍目もキメて');
  const parsed15 = parseMasterChartText(res15.newDsl);
  const m4_15 = parsed15.measures[3];
  assert(
    'Tied syncopation: "4小節目の2拍裏をタイで伸ばして、4拍目もキメて" applies [kick: 2&~, 4]',
    res15.success &&
      res15.newDsl.includes('[kick: 2&~, 4]') &&
      m4_15.kicks[6] === true &&
      m4_15.ties[6] === true &&
      m4_15.kicks[12] === true
  );

  // Test 16: Multi-measure kick: 4小節目と8小節目のキメをチャールストンにして
  const res16 = processNaturalLanguageCommand(baseDsl, '4小節目と8小節目のキメをチャールストンにして');
  const parsed16 = parseMasterChartText(res16.newDsl);
  assert(
    'Multi-measure: "4小節目と8小節目のキメをチャールストンにして" applies to both M4 and M8',
    res16.success &&
      parsed16.measures[3].kicks[0] === true &&
      parsed16.measures[3].kicks[6] === true &&
      parsed16.measures[7].kicks[0] === true &&
      parsed16.measures[7].kicks[6] === true
  );

  // Test 17: Direct DSL embedded: 小節3に [kick: 1, 2.5, 4]
  const res17 = processNaturalLanguageCommand(baseDsl, '小節3に [kick: 1, 2.5, 4]');
  const parsed17 = parseMasterChartText(res17.newDsl);
  assert(
    'Direct DSL: "小節3に [kick: 1, 2.5, 4]" parses and applies correctly',
    res17.success &&
      parsed17.measures[2].kicks[0] === true &&
      parsed17.measures[2].kicks[6] === true &&
      parsed17.measures[2].kicks[12] === true
  );

  // Test 18: Multi-measure compact syntax: "4と8小節目のキメを消して"
  const res18 = processNaturalLanguageCommand(res16.newDsl, '4と8小節目のキメを消して');
  const parsed18 = parseMasterChartText(res18.newDsl);
  assert(
    'Multi-measure compact: "4と8小節目のキメを消して" clears both M4 and M8',
    res18.success &&
      parsed18.measures[3].kicks?.every((k) => !k) &&
      parsed18.measures[7].kicks?.every((k) => !k)
  );

  // Test 19: Break hit: "4小節目をブレイクにして"
  const res19 = processNaturalLanguageCommand(baseDsl, '4小節目をブレイクにして');
  const parsed19 = parseMasterChartText(res19.newDsl);
  assert(
    'Break hit: "4小節目をブレイクにして" sets beat 1 hit',
    res19.success &&
      parsed19.measures[3].kicks[0] === true &&
      !parsed19.measures[3].kicks.slice(1).some(Boolean)
  );

  // Test 20: Charleston syncopation: "3小節目にチャールストンをシンコペーションで入れて"
  const res20 = processNaturalLanguageCommand(baseDsl, '3小節目にチャールストンをシンコペーションで入れて');
  const parsed20 = parseMasterChartText(res20.newDsl);
  assert(
    'Charleston syncopation: "3小節目にチャールストンをシンコペーションで入れて" applies [kick: 1, 2&~]',
    res20.success &&
      res20.newDsl.includes('[kick: 1, 2&~]') &&
      parsed20.measures[2].kicks[0] === true &&
      parsed20.measures[2].kicks[6] === true &&
      parsed20.measures[2].ties[6] === true
  );

  // Test 21: Tension chord modification robustness: "2小節目のコードをA11に変えて"
  const res21 = processNaturalLanguageCommand(baseDsl, '2小節目のコードをA11に変えて');
  assert(
    'Chord replace A11: "2小節目のコードをA11に変えて" successfully replaced chord with A11 without kick false-positive',
    res21.success && res21.newDsl.includes('A11') && !res21.newDsl.includes('[kick:')
  );

  // Test 22: Metadata headers parsing (Key, BPM, 拍子)
  const metaDsl = `Key: G\nBPM: 140\nTime: 3/4\n[INTRO]\n| G | C | D7 | G |`;
  const metaChart = parseMasterChartText(metaDsl);
  assert(
    'Metadata headers: parses Key=G, BPM=140, Time=3/4 correctly',
    metaChart.keySignature === 'G' && metaChart.bpm === 140 && metaChart.timeSignature[0] === 3 && metaChart.timeSignature[1] === 4
  );

  // Test 23: updateMetadataInDsl closed-loop reactivity
  const updatedDsl = updateMetadataInDsl(metaDsl, { key: 'F♯m', bpm: 96, timeSignature: [6, 8] });
  const reParsed = parseMasterChartText(updatedDsl);
  assert(
    'updateMetadataInDsl: updates Key to F♯m, BPM to 96, Time to 6/8',
    reParsed.keySignature === 'F♯m' && reParsed.bpm === 96 && reParsed.timeSignature[0] === 6 && reParsed.timeSignature[1] === 8
  );

  // Test 24: Title metadata parsing
  const titleDsl = `Title: 夜に駆ける\nKey: E♭m\nBPM: 130\nTime: 4/4\n| E♭m |`;
  const titleChart = parseMasterChartText(titleDsl);
  assert(
    'Title metadata parsing: parses Title="夜に駆ける" correctly from DSL',
    titleChart.title === '夜に駆ける'
  );

  // Test 25: updateMetadataInDsl for title
  const updatedTitleDsl = updateMetadataInDsl(titleDsl, { title: 'アイドル' });
  const reParsedTitle = parseMasterChartText(updatedTitleDsl);
  assert(
    'updateMetadataInDsl: updates Title to "アイドル"',
    reParsedTitle.title === 'アイドル' && updatedTitleDsl.includes('Title: アイドル')
  );

  console.log(`\nTests completed: ${passCount} / ${totalTests} passed.`);
  if (passCount !== totalTests) {
    throw new Error(`Test failure: only ${passCount}/${totalTests} passed.`);
  }
}

runTests();


