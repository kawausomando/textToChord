import React from 'react';
import { X, Check } from 'lucide-react';
import type { ConverterOptions } from '../utils/converter';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  options: ConverterOptions;
  setOptions: React.Dispatch<React.SetStateAction<ConverterOptions>>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  options,
  setOptions,
}) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.7)',
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
          maxWidth: '480px',
          width: '100%',
          padding: '1.8rem',
          background: '#0f172a',
          borderColor: 'var(--border-active)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>表記スタイル設定</h2>
          <button className="btn btn-secondary" style={{ padding: '0.4rem' }} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          {/* Major 7th style */}
          <div>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
              メジャーセブンス表記 (M7 / maj7)
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {(['Δ7', 'Δ', 'maj7', 'M7'] as const).map((style) => (
                <button
                  key={style}
                  className={`btn ${options.major7Style === style ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1, padding: '0.4rem' }}
                  onClick={() => setOptions((prev) => ({ ...prev, major7Style: style }))}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>

          {/* Half Diminished style */}
          <div>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
              ハーフディミニッシュ表記 (m7-5)
            </label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {(['m7-5', 'm7(♭5)', 'ø7', 'ø'] as const).map((style) => (
                <button
                  key={style}
                  className={`btn ${options.halfDiminishedStyle === style ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1, minWidth: '70px', padding: '0.4rem' }}
                  onClick={() => setOptions((prev) => ({ ...prev, halfDiminishedStyle: style }))}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>

          {/* Bars per line */}
          <div>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
              1行あたりの表示小節数
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {[4, 8, 0].map((num) => (
                <button
                  key={num}
                  className={`btn ${options.barsPerLine === num ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1, padding: '0.4rem' }}
                  onClick={() => setOptions((prev) => ({ ...prev, barsPerLine: num }))}
                >
                  {num === 0 ? '折り返しなし' : `${num}小節`}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ marginTop: '1.8rem', textAlign: 'right' }}>
          <button className="btn btn-primary" onClick={onClose}>
            <Check size={16} /> 保存して閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
