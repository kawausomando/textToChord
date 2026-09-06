import React, { useState } from 'react';
import { X, Key, ExternalLink, Check, ShieldCheck } from 'lucide-react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  onSaveApiKey: (key: string) => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  isOpen,
  onClose,
  apiKey,
  onSaveApiKey,
}) => {
  const [inputKey, setInputKey] = useState(apiKey);
  const [savedToast, setSavedToast] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveApiKey(inputKey.trim());
    setSavedToast(true);
    setTimeout(() => {
      setSavedToast(false);
      onClose();
    }, 800);
  };

  const handleClear = () => {
    setInputKey('');
    onSaveApiKey('');
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
          maxWidth: '520px',
          width: '100%',
          padding: '2rem',
          background: '#0f172a',
          borderColor: 'var(--primary)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.2rem',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Key size={18} color="#fff" />
            </div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>
              Gemini API 設定 (LLMコパイロット)
            </h2>
          </div>
          <button className="btn btn-secondary" style={{ padding: '0.4rem' }} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          Google Gemini APIキーを設定すると、マスターリズム譜の全ルール（4小節グリッド、リピート、キメ記号）を熟知したLLMが、あなたの自然言語指示を解釈してDSLを賢く追記・再構築します。
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
            Google Gemini API Key
          </label>
          <input
            type="password"
            value={inputKey}
            onChange={(e) => setInputKey(e.target.value)}
            placeholder="AIzaSy..."
            style={{
              width: '100%',
              background: 'rgba(0, 0, 0, 0.4)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '0.7rem 1rem',
              color: '#fff',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.9rem',
              outline: 'none',
            }}
          />
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '0.8rem',
            color: 'var(--text-dim)',
          }}
        >
          <ShieldCheck size={16} color="var(--accent-emerald)" />
          <span>キーはお使いのブラウザ（localStorage）にのみ安全に保存され、外部サーバーには送信されません。</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.6rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: '0.8rem',
              color: 'var(--accent-cyan)',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
            }}
          >
            <ExternalLink size={14} /> Gemini APIキーを無料で取得（Google AI Studio）
          </a>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {apiKey && (
              <button
                className="btn btn-secondary"
                style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
                onClick={handleClear}
              >
                キーを削除
              </button>
            )}
            <button
              className="btn btn-primary"
              style={{ fontSize: '0.85rem', padding: '0.4rem 1.2rem' }}
              onClick={handleSave}
            >
              {savedToast ? <Check size={16} /> : <Key size={16} />}
              {savedToast ? '保存完了！' : '保存して適用'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
