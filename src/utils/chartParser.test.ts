import { parseMasterChartText, parseKickDsl } from './chartParser';

function testParser() {
  console.log('--- Testing Master Rhythm Chart Parser ---');

  // 1. Test Kick DSL
  const kick1 = parseKickDsl('>4a~');
  if (kick1.kicks[15] && kick1.ties[15]) {
    console.log('[PASS] Kick DSL >4a~ mapped to step 15 with tie');
  } else {
    console.error('[FAIL] Kick DSL >4a~ did not map to step 15 with tie', kick1);
  }

  const kick2 = parseKickDsl('hit');
  if (kick2.kicks[0]) {
    console.log('[PASS] Kick DSL hit mapped to step 0');
  } else {
    console.error('[FAIL] Kick DSL hit did not map to step 0', kick2);
  }

  // 2. Test Complex Chart Parsing
  const inputDsl = `
[INTRO] (vocal in)
|: E♭m7 | C♭ | A♭m7 | B♭7 :|

[A] $Segno
|: E♭m7 | C♭ | A♭m7 |1. B♭7 :|2. B♭m7(>4a~) ||

[B]
| C♭Δ7 | D♭ | % | % |
| A♭m7 | B♭7 | E♭m7 | E♭m7 $ToCoda |

[CODA]
| A♭m7 | B♭7 | E♭m7(hit) | % |
`;

  const chart = parseMasterChartText(inputDsl);

  console.log(`Parsed ${chart.measures.length} measures.`);

  // Verify Measures count: 4 (INTRO) + 5 (A: 3 bars + 1st ending + 2nd ending) + 4 (B line 1) + 4 (B line 2) + 4 (CODA) = 21 measures
  if (chart.measures.length === 21) {
    console.log('[PASS] Total measures = 21 (correctly parsed all 5 systems including 2 endings)');
  } else {
    console.error(`[FAIL] Total measures expected 21, got ${chart.measures.length}`);
  }

  // Verify M1
  const m1 = chart.measures[0];
  if (m1.rehearsalMark === 'INTRO' && m1.bandText === '(vocal in)' && m1.leftBarline === 'start') {
    console.log('[PASS] M1 rehearsalMark=INTRO, bandText=(vocal in), leftBarline=start');
  } else {
    console.error('[FAIL] M1 attributes mismatch', m1);
  }

  // Verify M4
  const m4 = chart.measures[3];
  if (m4.rightBarline === 'end') {
    console.log('[PASS] M4 rightBarline=end (:|)');
  } else {
    console.error('[FAIL] M4 rightBarline mismatch', m4.rightBarline);
  }

  // Verify M5 (A, Segno)
  const m5 = chart.measures[4];
  if (m5.rehearsalMark === 'A' && m5.segno) {
    console.log('[PASS] M5 rehearsalMark=A, segno=true');
  } else {
    console.error('[FAIL] M5 attributes mismatch', m5);
  }

  // Verify Volta 1 (M8) & Volta 2 (M9)
  const m8 = chart.measures[7];
  const m9 = chart.measures[8];
  if (m8.volta === 1 && m8.rightBarline === 'end') {
    console.log('[PASS] M8 volta=1, rightBarline=end');
  } else {
    console.error('[FAIL] M8 volta mismatch', m8);
  }

  if (m9.volta === 2 && m9.rightBarline === 'double') {
    console.log('[PASS] M9 volta=2, rightBarline=double (||)');
  } else {
    console.error('[FAIL] M9 volta mismatch', m9);
  }

  // Verify Kick on M9
  if (m9.kicks[15] && m9.ties[15]) {
    console.log('[PASS] M9 has kick & tie on step 15 from >4a~');
  } else {
    console.error('[FAIL] M9 kick mismatch', m9.kicks, m9.ties);
  }

  // Verify Simile %
  const m11 = chart.measures[11];
  if (m11.simile === 'percent1') {
    console.log('[PASS] M11 simile=percent1');
  } else {
    console.error('[FAIL] M11 simile mismatch', m11.simile);
  }

  // 3. Test Metadata Headers (Key, BPM, 拍子)
  const metaDsl = `Key: G
BPM: 140
Time: 3/4
[INTRO]
| G | C | D7 | G |`;

  const metaChart = parseMasterChartText(metaDsl);
  if (metaChart.keySignature === 'G' && metaChart.bpm === 140 && metaChart.timeSignature[0] === 3 && metaChart.timeSignature[1] === 4) {
    console.log('[PASS] Parsed Key=G, BPM=140, Time=3/4 correctly from DSL');
  } else {
    console.error('[FAIL] Metadata mismatch', metaChart.keySignature, metaChart.bpm, metaChart.timeSignature);
  }
}

testParser();
