import { processNaturalLanguageCommand } from './aiCommandProcessor';
import { parseMasterChartText } from './chartParser';

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

  // Test 9: Transpose Up
  const res9 = processNaturalLanguageCommand(baseDsl, '全体を半音上げて');
  assert(
    'Transpose: "全体を半音上げて" successfully transposed E♭m7 to Em7',
    res9.success && res9.newDsl.includes('Em7')
  );

  console.log(`\nTests completed: ${passCount} / ${totalTests} passed.`);
  if (passCount !== totalTests) {
    throw new Error(`Test failure: only ${passCount}/${totalTests} passed.`);
  }
}

runTests();


