import { useState, useMemo, useRef } from 'react';
import { Header } from './components/Header';
import { Toolbar } from './components/Toolbar';
import { VisualLeadSheet } from './components/VisualLeadSheet';
import { SettingsModal } from './components/SettingsModal';
import { convertRoughText, DEFAULT_OPTIONS } from './utils/converter';
import type { ConverterOptions } from './utils/converter';
import { audioPlayer } from './utils/audio';
import { Copy, Check, Sparkles, FileText } from 'lucide-react';

export function App() {
  const [inputText, setInputText] = useState<string>('4m7, AM7, 7m7-5, Bbaug, 5m7(11)\n4.5/4, 3.6');
  const [options, setOptions] = useState<ConverterOptions>(DEFAULT_OPTIONS);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeBarIndex, setActiveBarIndex] = useState<number>(-1);
  const [bpm, setBpm] = useState<number>(100);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Live conversion
  const formattedText = useMemo(() => {
    return convertRoughText(inputText, options);
  }, [inputText, options]);

  // Insert symbol at cursor position
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

  // Copy output to clipboard
  const handleCopy = () => {
    navigator.clipboard.writeText(formattedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Toggle Audio Playback
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

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header
        isPlaying={isPlaying}
        onTogglePlay={handleTogglePlay}
        onOpenSettings={() => setIsSettingsOpen(true)}
        bpm={bpm}
        setBpm={setBpm}
      />

      <main style={{ flex: 1, padding: '0 1.5rem 2rem 1.5rem', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
        {/* Preset & Insertion Toolbar */}
        <Toolbar
          onInsertSymbol={handleInsertSymbol}
          onSelectPreset={(text) => setInputText(text)}
        />

        {/* 2-Column Split Editor */}
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Sparkles size={16} color="var(--accent-emerald)" /> 変換結果（整形済みテキスト）
              </label>
              <button
                onClick={handleCopy}
                className={copied ? 'btn btn-accent' : 'btn btn-secondary'}
                style={{ fontSize: '0.8rem', padding: '0.3rem 0.7rem' }}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'コピー完了！' : 'テキストをコピー'}
              </button>
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
    </div>
  );
}

export default App;
