import { processNaturalLanguageCommand } from './aiCommandProcessor';

function runTests() {
  console.log('--- Testing Natural Language AI Command Processor ---');

  const baseDsl = `[INTRO]
|: E♭m7 | C♭ | A♭m7 | B♭7 :|

[A]
| E♭m7 | C♭ | A♭m7 | B♭7 |
| A♭m7 | B♭7 | E♭m7 | E♭m7 |`;

  // Test 1: Kick instruction
  const res1 = processNaturalLanguageCommand(baseDsl, '3小節目の4拍目裏を食わせて');
  if (res1.success && res1.newDsl.includes('[kick: 4a~]')) {
    console.log('[PASS] "3小節目の4拍目裏を食わせて" successfully applied [kick: 4a~]');
  } else {
    console.error('[FAIL] Kick command failed', res1);
  }

  // Test 2: Head hit instruction
  const res2 = processNaturalLanguageCommand(baseDsl, '5小節目を頭キメにして');
  if (res2.success && res2.newDsl.includes('[kick: 1]')) {
    console.log('[PASS] "5小節目を頭キメにして" successfully applied [kick: 1]');
  } else {
    console.error('[FAIL] Head hit command failed', res2);
  }

  // Test 3: Navigation To Coda
  const res3 = processNaturalLanguageCommand(baseDsl, '8小節目にTo Codaを追加して');
  if (res3.success && res3.newDsl.includes('$ToCoda')) {
    console.log('[PASS] "8小節目にTo Codaを追加して" successfully added $ToCoda');
  } else {
    console.error('[FAIL] To Coda command failed', res3);
  }

  // Test 4: Chord modification
  const res4 = processNaturalLanguageCommand(baseDsl, '2小節目のコードをFm7に変えて');
  if (res4.success && res4.newDsl.includes('Fm7')) {
    console.log('[PASS] "2小節目のコードをFm7に変えて" successfully replaced chord with Fm7');
  } else {
    console.error('[FAIL] Chord change command failed', res4);
  }

  // Test 5: Transpose Up
  const res5 = processNaturalLanguageCommand(baseDsl, '全体を半音上げて');
  if (res5.success && res5.newDsl.includes('Em7')) {
    console.log('[PASS] "全体を半音上げて" successfully transposed E♭m7 to Em7');
  } else {
    console.error('[FAIL] Transpose command failed', res5);
  }
}

runTests();
