import React from 'react';
import type { Measure } from '../types/chart';
import { X, Sparkles, Music } from 'lucide-react';

interface KickStepSequencerProps {
  measure: Measure | null;
  onClose: () => void;
  onUpdateKicks: (measureId: string, kicks: boolean[], ties: boolean[]) => void;
}

const STEP_LABELS = [
  '1', 'e', '&', 'a',
  '2', 'e', '&', 'a',
  '3', 'e', '&', 'a',
  '4', 'e', '&', 'a',
];

export const KickStepSequencer: React.FC<KickStepSequencerProps> = ({
  measure,
  onClose,
  onUpdateKicks,
}) => {
  // Close on Escape key (called unconditionally before any early return)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!measure) return null;

  const currentKicks = measure.kicks || new Array(16).fill(false);
  const currentTies = measure.ties || new Array(16).fill(false);

  const handleToggleStep = (index: number) => {
    const nextKicks = [...currentKicks];
    const nextTies = [...currentTies];
    nextKicks[index] = !nextKicks[index];
    if (!nextKicks[index]) {
      nextTies[index] = false;
    }
    onUpdateKicks(measure.id, nextKicks, nextTies);
  };

  const handleToggleTie = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentKicks[index]) return;
    const nextTies = [...currentTies];
    nextTies[index] = !nextTies[index];
    onUpdateKicks(measure.id, currentKicks, nextTies);
  };

  // Preset macros
  const applyMacro = (
    type: '16th-push' | '8th-sync' | 'charleston' | '3-3-2' | 'four-beat' | 'offbeats' | 'break-hit' | 'clear'
  ) => {
    const nextKicks = new Array(16).fill(false);
    const nextTies = new Array(16).fill(false);

    if (type === '16th-push') {
      nextKicks[15] = true;
      nextTies[15] = true; // 4a~ (16th anticipation with tie)
    } else if (type === '8th-sync') {
      nextKicks[14] = true;
      nextTies[14] = true; // 4&~ (8th anticipation)
    } else if (type === 'charleston') {
      nextKicks[0] = true;
      nextKicks[6] = true; // 1, 2& (Charleston)
    } else if (type === '3-3-2') {
      nextKicks[0] = true;
      nextKicks[6] = true;
      nextKicks[12] = true; // 1, 2&, 4 (3-3-2 Clave / Syncopation)
    } else if (type === 'four-beat') {
      nextKicks[0] = true;
      nextKicks[4] = true;
      nextKicks[8] = true;
      nextKicks[12] = true; // 1, 2, 3, 4
    } else if (type === 'offbeats') {
      nextKicks[2] = true;
      nextKicks[6] = true;
      nextKicks[10] = true;
      nextKicks[14] = true; // 1&, 2&, 3&, 4&
    } else if (type === 'break-hit') {
      nextKicks[0] = true; // Beat 1 hit
    }
    onUpdateKicks(measure.id, nextKicks, nextTies);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel animate-fade-in"
        style={{
          maxWidth: '920px',
          width: '100%',
          background: '#0f172a',
          border: '1px solid var(--accent-cyan)',
          borderRadius: '14px',
          boxShadow: '0 12px 40px rgba(6, 182, 212, 0.25)',
          padding: '1.4rem',
        }}
        onClick={(e) => e.stopPropagation()}
      >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem', flexWrap: 'wrap', gap: '0.6rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Music size={18} color="var(--accent-cyan)" />
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>
            小節 {measure.number} : 16ステップ・キメ＆コンピング編集
          </h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            (コード: {measure.chords.map((c) => c.symbol).join(' ') || 'なし'})
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
          {/* Preset Phrase Macro buttons */}
          <button
            className="btn btn-secondary"
            style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
            onClick={() => applyMacro('charleston')}
            title="1拍目 + 2拍目裏 (1, 2&)"
          >
            チャールストン (1, 2&)
          </button>
          <button
            className="btn btn-secondary"
            style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
            onClick={() => applyMacro('3-3-2')}
            title="1拍目 + 2拍目裏 + 4拍目 (1, 2&, 4)"
          >
            3-3-2 (1, 2&, 4)
          </button>
          <button
            className="btn btn-secondary"
            style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
            onClick={() => applyMacro('four-beat')}
            title="全拍打ち (1, 2, 3, 4)"
          >
            4つ打ち
          </button>
          <button
            className="btn btn-secondary"
            style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
            onClick={() => applyMacro('offbeats')}
            title="8分裏打ち (1&, 2&, 3&, 4&)"
          >
            裏打ち
          </button>
          <button
            className="btn btn-secondary"
            style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
            onClick={() => applyMacro('8th-sync')}
            title="4拍目8分食い (4&~)"
          >
            8分食い (4&~)
          </button>
          <button
            className="btn btn-secondary"
            style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
            onClick={() => applyMacro('16th-push')}
            title="4拍目16分裏食い (4a~)"
          >
            <Sparkles size={11} color="var(--accent-cyan)" /> 16分食い (4a~)
          </button>
          <button
            className="btn btn-secondary"
            style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
            onClick={() => applyMacro('break-hit')}
            title="1拍目頭打ち (hit)"
          >
            頭キメ (hit)
          </button>
          <button
            className="btn btn-secondary"
            style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', color: 'var(--accent-rose)' }}
            onClick={() => applyMacro('clear')}
          >
            クリア
          </button>

          <button
            className="btn btn-secondary"
            style={{ padding: '0.25rem', marginLeft: '0.3rem' }}
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* 16 Step Buttons */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(16, 1fr)',
          gap: '6px',
          background: 'rgba(0,0,0,0.4)',
          padding: '0.8rem',
          borderRadius: '8px',
        }}
      >
        {STEP_LABELS.map((label, idx) => {
          const isDownbeat = idx % 4 === 0;
          const isActive = currentKicks[idx];
          const isTied = currentTies[idx];

          return (
            <div
              key={idx}
              onClick={() => handleToggleStep(idx)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0.5rem 0.2rem',
                borderRadius: '6px',
                background: isActive
                  ? 'linear-gradient(135deg, #06b6d4, #3b82f6)'
                  : isDownbeat
                  ? 'rgba(255, 255, 255, 0.08)'
                  : 'rgba(255, 255, 255, 0.03)',
                border: isActive
                  ? '1px solid #38bdf8'
                  : isDownbeat
                  ? '1px solid rgba(255, 255, 255, 0.2)'
                  : '1px solid rgba(255, 255, 255, 0.06)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                userSelect: 'none',
              }}
            >
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: isDownbeat ? 800 : 500,
                  color: isActive ? '#fff' : isDownbeat ? 'var(--accent-amber)' : 'var(--text-muted)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {label}
              </span>

              {/* Indicator Dot */}
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  marginTop: '4px',
                  background: isActive ? '#ffffff' : 'transparent',
                  border: isActive ? 'none' : '1px solid rgba(255,255,255,0.15)',
                }}
              />

              {/* Tie Toggle Button */}
              {isActive && (
                <button
                  onClick={(e) => handleToggleTie(idx, e)}
                  title="次の音とタイで結合"
                  style={{
                    marginTop: '4px',
                    fontSize: '0.65rem',
                    padding: '1px 3px',
                    borderRadius: '3px',
                    background: isTied ? '#f59e0b' : 'rgba(0,0,0,0.5)',
                    border: 'none',
                    color: '#fff',
                    cursor: 'pointer',
                  }}
                >
                  {isTied ? '⌒' : '−'}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  </div>
  );
};
