import React from 'react';
import { Music, Play, Square, Settings, Volume2 } from 'lucide-react';

interface HeaderProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  onOpenSettings: () => void;
  bpm: number;
  setBpm: (b: number) => void;
}

export const Header: React.FC<HeaderProps> = ({
  isPlaying,
  onTogglePlay,
  onOpenSettings,
  bpm,
  setBpm,
}) => {
  return (
    <header className="glass-panel" style={{ margin: '1rem', padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{
          width: '42px',
          height: '42px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(99, 102, 241, 0.4)'
        }}>
          <Music size={24} color="#fff" />
        </div>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, background: 'linear-gradient(90deg, #fff, #9ca3af)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            TextToChord Converter
          </h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            雑な入力から美しいコードネーム・ディグリー表記（小節線 | 付き）へ自動変換
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        {/* BPM Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255, 255, 255, 0.05)', padding: '0.3rem 0.6rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          <Volume2 size={16} color="var(--text-muted)" />
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>BPM:</span>
          <input
            type="number"
            min={40}
            max={240}
            value={bpm}
            onChange={(e) => setBpm(Number(e.target.value))}
            style={{
              width: '55px',
              background: 'transparent',
              border: 'none',
              color: '#fff',
              fontWeight: 'bold',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.9rem'
            }}
          />
        </div>

        {/* Play Audio Button */}
        <button
          onClick={onTogglePlay}
          className={isPlaying ? 'btn btn-secondary' : 'btn btn-accent'}
          style={isPlaying ? { borderColor: 'var(--accent-rose)', color: 'var(--accent-rose)' } : {}}
        >
          {isPlaying ? (
            <>
              <Square size={16} fill="currentColor" /> 停止
            </>
          ) : (
            <>
              <Play size={16} fill="currentColor" /> 音声を聴く
            </>
          )}
        </button>

        {/* Settings Button */}
        <button onClick={onOpenSettings} className="btn btn-secondary" title="設定">
          <Settings size={18} />
          <span>設定</span>
        </button>
      </div>
    </header>
  );
};
