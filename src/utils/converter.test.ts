import { convertRoughText } from './converter';

function runTests() {
  const tests = [
    // Standard User Examples
    { input: '4m7', expected: '| Ⅳm7 |' },
    { input: 'AM7', expected: '| AΔ7 |' },
    { input: '7m7-5', expected: '| Ⅶm7-5 |' },
    { input: 'Bbaug', expected: '| B♭aug |' },
    { input: '5m7(11)', expected: '| Ⅴm7(11) |' },
    { input: '4, 5, 3, 6', expected: '| Ⅳ | Ⅴ | Ⅲ | Ⅵ |' },
    { input: '4.5/4, 3.6', expected: '| Ⅳ Ⅴ/Ⅳ | Ⅲ Ⅵ |' },

    // Edge cases identified in Code Review
    { input: 'bbaug', expected: '| B♭aug |' },
    { input: 'am7', expected: '| Am7 |' },
    { input: 'c#m7', expected: '| C♯m7 |' },
    { input: 'b3m7', expected: '| ♭Ⅲm7 |' },
    { input: 'Cadd9', expected: '| Cadd9 |' },
    { input: 'G7(b9)', expected: '| G7(♭9) |' },
  ];

  let passed = 0;
  console.log('--- Running Expanded Chord Converter Tests ---');
  for (const t of tests) {
    const output = convertRoughText(t.input);
    if (output === t.expected) {
      console.log(`[PASS] "${t.input}" -> "${output}"`);
      passed++;
    } else {
      console.error(`[FAIL] "${t.input}"\n  Expected: "${t.expected}"\n  Got:      "${output}"`);
    }
  }
  console.log(`Passed ${passed}/${tests.length} tests.`);
}

runTests();
