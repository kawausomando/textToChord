import React from 'react';
import { Sparkles, Plus } from 'lucide-react';

interface ToolbarProps {
  onInsertSymbol: (symbol: string) => void;
  onSelectPreset: (text: string) => void;
}

const SYMBOLS = ['♭', '♯', 'Δ', 'ø', 'm7-5', 'aug', 'dim', ',', '.', '/', '1', '2', '3', '4', '5', '6', '7'];

const PRESETS = [
  { name: 'ユーザー質問の例', text: '4m7, AM7, 7m7-5, Bbaug, 5m7(11)' },
  { name: '4, 5, 3, 6 (王道進行)', text: '4, 5, 3, 6' },
  { name: '4.5/4, 3.6 (1小節複数)', text: '4.5/4, 3.6' },
  { name: '小室進行 (6, 4, 5, 1)', text: '6m, 4, 5, 1' },
  { name: 'マイナー 2-5-1', text: '2m7-5, 57, 1m7' },
];

export const Toolbar: React.FC<ToolbarProps> = ({ onInsertSymbol, onSelectPreset }) => {
  return (
    <div className="glass-panel animate-fade-in" style={{ padding: '0.8rem 1.2rem', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
      {/* Symbol insertion palette */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <Plus size={14} /> 記号挿入:
        </span>
        {SYMBOLS.map(sym => (
          <button key={sym} className="chip" onClick={() => onInsertSymbol(sym)}>
            {sym}
          </button>
        ))}
      </div>

      {/* Preset buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', paddingTop: '0.4rem', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <Sparkles size={14} color="var(--accent-cyan)" /> プリセット:
        </span>
        {PRESETS.map(p => (
          <button
            key={p.name}
            className="btn btn-secondary"
            style={{ fontSize: '0.78rem', padding: '0.25rem 0.6rem' }}
            onClick={() => onSelectPreset(p.text)}
          >
            {p.name}
          </button>
        ))}
      </div>
    </div>
  );
};
