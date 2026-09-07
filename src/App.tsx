import { useState, useMemo, useRef } from 'react';
import { Header } from './components/Header';
import { Toolbar } from './components/Toolbar';
import { VisualLeadSheet } from './components/VisualLeadSheet';
import { SettingsModal } from './components/SettingsModal';
import { MasterChartSpreadView } from './components/MasterChartSpreadView';
import { KickStepSequencer } from './components/KickStepSequencer';
import { NaturalLanguageBar } from './components/NaturalLanguageBar';
import { ApiKeyModal } from './components/ApiKeyModal';
import { convertRoughText, DEFAULT_OPTIONS } from './utils/converter';
import type { ConverterOptions } from './utils/converter';
import { parseMasterChartText, updateMeasureKickInDsl } from './utils/chartParser';
import { processNaturalLanguageCommand } from './utils/aiCommandProcessor';
import { executeLlmChartCommand } from './utils/llmService';
import type { MasterChart } from './types/chart';
import { audioPlayer } from './utils/audio';
import { downloadMusicXML } from './utils/musicxml';
import { downloadAdvancedMusicXML } from './utils/musicxmlAdvanced';
import { Copy, Check, Sparkles, FileText, Download, Layers, Music2 } from 'lucide-react';

const SOP_DEFAULT_DSL = `[INTRO] (vocal in)
|: E♭m7 | C♭ | A♭m7 | B♭7 :|

[A] $Segno
|: E♭m7 | C♭ | A♭m7 |1. B♭7 :|2. B♭m7(>4a~) ||

[B]
| C♭Δ7 | D♭ | % | % |
| A♭m7 | B♭7 | E♭m7 | E♭m7 $ToCoda |

[PAGE_BREAK]

[CHORUS]
| C♭Δ7 | D♭ | B♭m7 | E♭m7 |
| A♭m7 | B♭7 | E♭m7 | E♭m7 |
| C♭Δ7 | D♭ | B♭m7 | E♭m7 |
| A♭m7 | B♭7 | E♭m7 | E♭m7 $DSalCoda |

[CODA]
| A♭m7 | B♭7 | E♭m7(hit) | % |`;

export function App() {
  const [activeTab, setActiveTab] = useState<'workbench' | 'converter'>('workbench');

  // Converter State
  const [inputText, setInputText] = useState<string>('4m7, AM7, 7m7-5, Bbaug, 5m7(11)\n4.5/4, 3.6');
  const [options, setOptions] = useState<ConverterOptions>(DEFAULT_OPTIONS);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeBarIndex, setActiveBarIndex] = useState<number>(-1);
  const [bpm, setBpm] = useState<number>(125);

  // Workbench State
  const [chartDsl, setChartDsl] = useState<string>(SOP_DEFAULT_DSL);
  const [selectedMeasureId, setSelectedMeasureId] = useState<string | null>(null);
  const [editingKickMeasureId, setEditingKickMeasureId] = useState<string | null>(null);
  const [chartCopied, setChartCopied] = useState(false);
  const [nlFeedback, setNlFeedback] = useState<string | null>(null);

  // LLM State
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem('textToChord_gemini_api_key') || '');
  const [selectedModel, setSelectedModel] = useState<string>(
    () => localStorage.getItem('textToChord_gemini_model') || 'gemini-3.6-flash'
  );
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState<boolean>(false);
  const [isLlmLoading, setIsLlmLoading] = useState<boolean>(false);

  const handleSaveApiKey = (newKey: string, newModel: string) => {
    setApiKey(newKey);
    setSelectedModel(newModel);
    if (newKey) {
      localStorage.setItem('textToChord_gemini_api_key', newKey);
    } else {
      localStorage.removeItem('textToChord_gemini_api_key');
    }
    if (newModel) {
      localStorage.setItem('textToChord_gemini_model', newModel);
    }
  };

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dslTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Live conversion (simple mode)
  const formattedText = useMemo(() => {
    return convertRoughText(inputText, options);
  }, [inputText, options]);

  // Live Master Chart AST (workbench mode)
  const masterChart: MasterChart = useMemo(() => {
    return parseMasterChartText(chartDsl, 'MASTER RHYTHM LEAD SHEET');
  }, [chartDsl]);

  const editingKickMeasure = useMemo(() => {
    if (!editingKickMeasureId) return null;
    return masterChart.measures.find((m) => m.id === editingKickMeasureId) || null;
  }, [masterChart, editingKickMeasureId]);

  // Insert symbol in Simple Converter
  const handleInsertSymbol = (symbol: string) => {
    if (!textareaRef.current) {
      setInputText((prev) => prev + symbol);
      return;
    }

    const el = textareaRef.current;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const text = el.value;

    const newText = text.substring(0, start) + symbol + text.substring(end);
    setInputText(newText);

    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + symbol.length, start + symbol.length);
    }, 0);
  };

  // Insert DSL tag in Workbench
  const handleInsertDslTag = (tag: string) => {
    if (!dslTextareaRef.current) {
      setChartDsl((prev) => prev + '\n' + tag);
      return;
    }
    const el = dslTextareaRef.current;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const text = el.value;

    const newText = text.substring(0, start) + tag + text.substring(end);
    setChartDsl(newText);

    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + tag.length, start + tag.length);
    }, 0);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(formattedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyDsl = () => {
    navigator.clipboard.writeText(chartDsl);
    setChartCopied(true);
    setTimeout(() => setChartCopied(false), 2000);
  };

  const handleTogglePlay = () => {
    if (isPlaying) {
      audioPlayer.stop();
      setIsPlaying(false);
      setActiveBarIndex(-1);
    } else {
      setIsPlaying(true);
      audioPlayer.playProgression(formattedText, bpm, (barIdx) => {
        if (barIdx === -1) {
          setIsPlaying(false);
          setActiveBarIndex(-1);
        } else {
          setActiveBarIndex(barIdx);
        }
      });
    }
  };

  // 16-Step Sequencer Update (persisted into chartDsl)
  const handleUpdateMeasureKicks = (measureId: string, kicks: boolean[], ties: boolean[]) => {
    const target = masterChart.measures.find((m) => m.id === measureId);
    if (!target) return;

    const nextDsl = updateMeasureKickInDsl(chartDsl, target.number, kicks, ties);
    setChartDsl(nextDsl);
  };

  // Natural Language Command Execution (LLM with local fallback)
  const handleExecuteNlCommand = async (instruction: string) => {
    if (apiKey.trim()) {
      setIsLlmLoading(true);
      try {
        const result = await executeLlmChartCommand(chartDsl, instruction, apiKey.trim(), selectedModel);
        setNlFeedback(result.explanation);
        if (result.success) {
          setChartDsl(result.newDsl);
        }
      } finally {
        setIsLlmLoading(false);
      }
    } else {
      // Local zero-latency fallback engine
      const result = processNaturalLanguageCommand(chartDsl, instruction);
      const hint = ' (⚡ローカル処理。より自由・複雑な指示は右上のGemini API設定をご利用ください)';
      setNlFeedback(result.explanation + (result.success ? hint : ''));
      if (result.success) {
        setChartDsl(result.newDsl);
      }
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header
        isPlaying={isPlaying}
        onTogglePlay={handleTogglePlay}
        onOpenSettings={() => setIsSettingsOpen(true)}
        bpm={bpm}
        setBpm={setBpm}
      />

      {/* Mode Switcher Tabs */}
      <div style={{ padding: '0 1.5rem', maxWidth: '1400px', margin: '0 auto', width: '100%', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
          <button
            onClick={() => setActiveTab('workbench')}
            className={`btn ${activeTab === 'workbench' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.95rem', padding: '0.5rem 1.2rem' }}
          >
            <Music2 size={18} /> マスターリズム譜 ワークベンチ (見開き2P & キメ)
          </button>
          <button
            onClick={() => setActiveTab('converter')}
            className={`btn ${activeTab === 'converter' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.95rem', padding: '0.5rem 1.2rem' }}
          >
            <Layers size={18} /> 簡易コード・ディグリー変換 (シンプル)
          </button>
        </div>
      </div>

      <main style={{ flex: 1, padding: '0 1.5rem 2rem 1.5rem', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
        {activeTab === 'workbench' ? (
          /* ============================================================ */
          /* WORKBENCH MODE (SOP MASTER RHYTHM CHART)                      */
          /* ============================================================ */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Workbench DSL Toolbar & Controls */}
            <div className="glass-panel" style={{ padding: '1rem 1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.8rem' }}>
              {/* Quick Tag Insert Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>挿入:</span>
                {['[INTRO]', '[A]', '[B]', '[CHORUS]', '[CODA]', '|:', ':|', '||', '[1.]', '[2.]', '%', '$Segno', '$ToCoda', '$DSalCoda', '[PAGE_BREAK]'].map((tag) => (
                  <button
                    key={tag}
                    className="chip"
                    style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                    onClick={() => handleInsertDslTag(tag.startsWith('[') && tag.endsWith(']') ? `\n${tag}\n` : ` ${tag} `)}
                  >
                    {tag}
                  </button>
                ))}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '0.6rem' }}>
                <button
                  onClick={() => downloadAdvancedMusicXML(masterChart)}
                  className="btn btn-accent"
                  style={{ fontSize: '0.85rem' }}
                  title="Sibelius段頭115pt余白・実質228pt均等化・スラッシュキメ対応MusicXML"
                >
                  <Download size={16} /> Sibelius用 MusicXML出力
                </button>
                <button
                  onClick={handleCopyDsl}
                  className={chartCopied ? 'btn btn-accent' : 'btn btn-secondary'}
                  style={{ fontSize: '0.85rem' }}
                >
                  {chartCopied ? <Check size={16} /> : <Copy size={16} />}
                  {chartCopied ? 'コピー完了' : 'DSLテキストをコピー'}
                </button>
              </div>
            </div>

            {/* Split View: Left Input DSL / Right Spread View */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 380px) 1fr', gap: '1.5rem', alignItems: 'start' }}>
              {/* Left Column: Text DSL Editor */}
              <div className="glass-panel" style={{ padding: '1.2rem', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                  <label style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <FileText size={16} color="var(--accent-cyan)" /> リズム譜 DSLテキスト
                  </label>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    |: 反復 | [1.] [2.] 1・2番
                  </span>
                </div>

                <textarea
                  ref={dslTextareaRef}
                  value={chartDsl}
                  onChange={(e) => setChartDsl(e.target.value)}
                  placeholder="コード・セクション・リピート記号を入力..."
                  rows={18}
                  style={{
                    width: '100%',
                    background: 'rgba(0, 0, 0, 0.35)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '0.8rem',
                    color: '#e2e8f0',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.9rem',
                    lineHeight: 1.6,
                    resize: 'vertical',
                    outline: 'none',
                  }}
                />

                <div style={{ marginTop: '0.8rem', fontSize: '0.75rem', color: 'var(--text-dim)', lineHeight: 1.5 }}>
                  💡 簡易変換モードの <code>| Fm7 | G7 |</code> を貼り付け可能。<br />
                  💡 譜面の小節をダブルクリックすると16ステップキメ編集が開きます。
                </div>
              </div>

              {/* Right Column: Master Rhythm Chart Spread View & AI Copilot */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Natural Language Prompt Bar */}
                <NaturalLanguageBar
                  onExecuteCommand={handleExecuteNlCommand}
                  lastFeedback={nlFeedback}
                  hasApiKey={Boolean(apiKey.trim())}
                  onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
                  isLoading={isLlmLoading}
                />

                <MasterChartSpreadView
                  chart={masterChart}
                  selectedMeasureId={selectedMeasureId}
                  onSelectMeasure={(id) => setSelectedMeasureId(id)}
                  onDoubleClickMeasure={(id) => {
                    setSelectedMeasureId(id);
                    setEditingKickMeasureId(id);
                  }}
                />

                {/* 16-Step Comping Sequencer Modal (Appears on measure double-click) */}
                {editingKickMeasure && (
                  <KickStepSequencer
                    measure={editingKickMeasure}
                    onClose={() => setEditingKickMeasureId(null)}
                    onUpdateKicks={handleUpdateMeasureKicks}
                  />
                )}
              </div>
            </div>
          </div>
        ) : (
          /* ============================================================ */
          /* SIMPLE CONVERTER MODE                                        */
          /* ============================================================ */
          <div>
            <Toolbar
              onInsertSymbol={handleInsertSymbol}
              onSelectPreset={(text) => setInputText(text)}
            />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
              {/* Left Column: Input Textarea */}
              <div className="glass-panel" style={{ padding: '1.2rem', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                  <label style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <FileText size={16} color="var(--primary)" /> 雑なテキスト入力
                  </label>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    カンマ `,` で小節区切り
                  </span>
                </div>

                <textarea
                  ref={textareaRef}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="例: 4m7, AM7, 7m7-5, Bbaug, 5m7(11) または 4, 5, 3, 6"
                  rows={8}
                  style={{
                    width: '100%',
                    flex: 1,
                    background: 'rgba(0, 0, 0, 0.25)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '1rem',
                    color: '#fff',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '1rem',
                    lineHeight: 1.6,
                    resize: 'vertical',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Right Column: Formatted Output */}
              <div className="glass-panel" style={{ padding: '1.2rem', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Sparkles size={16} color="var(--accent-emerald)" /> 変換結果（整形済みテキスト）
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => downloadMusicXML(formattedText)}
                      className="btn btn-secondary"
                      style={{ fontSize: '0.8rem', padding: '0.3rem 0.7rem' }}
                      title="Sibelius / Dorico / MuseScore 用 MusicXML (.musicxml) ファイル出力"
                    >
                      <Download size={14} /> MusicXML出力
                    </button>
                    <button
                      onClick={handleCopy}
                      className={copied ? 'btn btn-accent' : 'btn btn-secondary'}
                      style={{ fontSize: '0.8rem', padding: '0.3rem 0.7rem' }}
                    >
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                      {copied ? 'コピー完了！' : 'テキストをコピー'}
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    width: '100%',
                    flex: 1,
                    minHeight: '180px',
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: '1px solid var(--border-active)',
                    borderRadius: '8px',
                    padding: '1rem',
                    color: 'var(--accent-cyan)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    lineHeight: 1.8,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                  }}
                >
                  {formattedText || <span style={{ color: 'var(--text-dim)' }}>変換結果がここにリアルタイムで表示されます</span>}
                </div>
              </div>
            </div>

            {/* Visual Lead Sheet Display */}
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <VisualLeadSheet formattedText={formattedText} activeBarIndex={activeBarIndex} />
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-dim)', fontSize: '0.8rem' }}>
        @kawausomando
      </footer>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        options={options}
        setOptions={setOptions}
      />

      {/* Gemini API Key Modal */}
      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        apiKey={apiKey}
        selectedModel={selectedModel}
        onSaveApiKey={handleSaveApiKey}
      />
    </div>
  );
}

export default App;
