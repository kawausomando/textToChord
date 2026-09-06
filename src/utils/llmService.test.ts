import { parseLlmJsonResponse, MASTER_CHART_DSL_SYSTEM_PROMPT } from './llmService';

function runTests() {
  console.log('--- Testing LLM Service Module ---');

  // Test 1: System prompt presence
  if (MASTER_CHART_DSL_SYSTEM_PROMPT.includes('4小節グリッド原則') && MASTER_CHART_DSL_SYSTEM_PROMPT.includes('>4a~')) {
    console.log('[PASS] System prompt contains all required SOP rules');
  } else {
    console.error('[FAIL] System prompt missing required rules');
  }

  // Test 2: Standard JSON parsing
  const rawJson = JSON.stringify({
    newDsl: '[A]\n| C | G | Am | F |',
    explanation: 'Aセクションを追加しました。',
  });
  const res1 = parseLlmJsonResponse(rawJson);
  if (res1.newDsl === '[A]\n| C | G | Am | F |' && res1.explanation === 'Aセクションを追加しました。') {
    console.log('[PASS] Successfully parsed plain JSON');
  } else {
    console.error('[FAIL] Plain JSON parse failed', res1);
  }

  // Test 3: Markdown-wrapped JSON parsing
  const markdownJson = `\`\`\`json
{
  "newDsl": "[CHORUS]\\n| F | G | Em | Am |",
  "explanation": "サビのコード進行を更新しました。"
}
\`\`\``;
  const res2 = parseLlmJsonResponse(markdownJson);
  if (res2.newDsl === '[CHORUS]\n| F | G | Em | Am |') {
    console.log('[PASS] Successfully parsed markdown-wrapped JSON');
  } else {
    console.error('[FAIL] Markdown-wrapped JSON parse failed', res2);
  }

  // Test 4: Error handling on missing newDsl
  try {
    parseLlmJsonResponse(JSON.stringify({ invalid: true }));
    console.error('[FAIL] Expected error on missing newDsl, but passed');
  } catch {
    console.log('[PASS] Correctly threw error on missing newDsl');
  }
}

runTests();
