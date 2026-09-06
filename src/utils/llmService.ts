export interface LlmCommandResult {
  success: boolean;
  newDsl: string;
  explanation: string;
}

export const MASTER_CHART_DSL_SYSTEM_PROMPT = `あなたはコマーシャル・クオリティのマスターリズム譜（Master Rhythm Chart）を制作するエキスパートアレンジャーAIです。
ユーザーから「現在の楽譜DSLテキスト」と「自然言語での編集・追加指示」を受け取り、マスターリズム譜のDSL構文ルールに完全に従ってDSLを追記・更新・再構成してください。

# マスターリズム譜 DSLの文法体系と原則

1. 構造と基本レイアウト (4小節グリッド原則)
- ポピュラー音楽のリズム譜は、1段あたり必ず4小節（| bar1 | bar2 | bar3 | bar4 |）で構成されます。小節線を垂直に揃えるため、4小節ごとに改行してください（端数段やコーダを除く）。
- セクション見出しは角括弧で記述します: [INTRO], [A], [B], [CHORUS], [CODA], [OUTRO] 等。
- バンド指示テキストはセクション行または小節内に併記できます: 例 [INTRO] (vocal in), [A] → half
- 見開き2ページ完結のため、前半と後半の区切りに [PAGE_BREAK] を単独行で挿入できます。

2. 反復小節線とカッコ (Repeats & Voltas)
- リピート開始: |:
- リピート終了: :|
- 複縦線（セクション区切り）: ||
- 終止線: |.
- 1番カッコ・2番カッコ（Volta）: |1. 最後の小節 :|2. 飛び先小節 || のように記述します。

3. 小節繰り返し記号 (Simile)
- 1小節リピート: % （前小節と同じコード・パターンを繰り返す）
- 2小節リピート: %2%
- 4小節リピート: %4% または [sim. 4 bars]

4. ナビゲーション・ジャンプ記号
- セーニョ: $Segno または 𝄋 （飛び先小節に配置）
- トゥー・コーダ: $ToCoda または 𝄌 （飛び出し小節に配置）
- ダル・セーニョ: $DSalCoda または $DS （反復元の小節に配置）
- コーダセクション: [CODA] で独立段を作ります。

5. キメ・シンコペーション (Kick & Comping DSL)
- 16分裏食い＋タイ（アンティシペーション）: (>4a~) または [kick: 4a~] （4拍目の16分ウラで食って次小節へタイで伸ばす）
- 8分食い＋タイ: (>4&~) または [kick: 4&~]
- 頭キメ: (hit) または [kick: 1] （1拍目頭打ち）
- コード記号と結合して記述できます: 例 B♭m7(>4a~) や E♭m7(hit)

# 出力フォーマット
出力は必ず以下のJSON形式のみを返してください（前後にマークダウンや追加の雑談を含めないでください）:
{
  "newDsl": "更新後の完全なDSLテキスト全体",
  "explanation": "ユーザーの指示に対して何を変更・追記したかの日本語でのわかりやすい説明"
}`;

/**
 * Clean and parse JSON response from LLM, handling markdown code blocks if present.
 */
export function parseLlmJsonResponse(text: string): { newDsl: string; explanation: string } {
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
  }
  const parsed = JSON.parse(cleaned);
  if (!parsed.newDsl || typeof parsed.newDsl !== 'string') {
    throw new Error('Invalid LLM response: missing newDsl');
  }
  return {
    newDsl: parsed.newDsl,
    explanation: parsed.explanation || '✅ 楽譜DSLを更新しました。',
  };
}

/**
 * Call Google Gemini API to intelligently update the Master Rhythm Chart DSL.
 */
export async function executeLlmChartCommand(
  currentDsl: string,
  instruction: string,
  apiKey: string,
  model = 'gemini-2.0-flash'
): Promise<LlmCommandResult> {
  if (!apiKey) {
    return {
      success: false,
      newDsl: currentDsl,
      explanation: '⚠️ Gemini APIキーが設定されていません。右上の設定（鍵アイコン）からAPIキーを入力してください。',
    };
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const promptMessage = `現在のマスターリズム譜DSL:
\`\`\`
${currentDsl}
\`\`\`

ユーザーの指示:
「${instruction}」

上記ルールに従い、指示を反映した新しいDSL全体と変更内容の解説をJSONで出力してください。`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: MASTER_CHART_DSL_SYSTEM_PROMPT }],
        },
        contents: [
          {
            parts: [{ text: promptMessage }],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const msg = errorData?.error?.message || `HTTP ${response.status} ${response.statusText}`;
      return {
        success: false,
        newDsl: currentDsl,
        explanation: `❌ Gemini APIエラー: ${msg}`,
      };
    }

    const data = await response.json();
    const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!candidateText) {
      return {
        success: false,
        newDsl: currentDsl,
        explanation: '❌ Gemini APIから有効な応答を受信できませんでした。',
      };
    }

    const parsed = parseLlmJsonResponse(candidateText);
    return {
      success: true,
      newDsl: parsed.newDsl,
      explanation: parsed.explanation,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      newDsl: currentDsl,
      explanation: `❌ エラー: ${errorMsg}`,
    };
  }
}
