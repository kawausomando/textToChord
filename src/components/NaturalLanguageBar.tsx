import React, { useState } from 'react';
import { Sparkles, ArrowRight, CornerDownLeft, Key, Bot, Loader2 } from 'lucide-react';

interface NaturalLanguageBarProps {
  onExecuteCommand: (instruction: string) => void;
  lastFeedback: string | null;
  hasApiKey: boolean;
  onOpenApiKeyModal: () => void;
  isLoading: boolean;
}

const SAMPLE_COMMANDS = [
  '3小節目の4拍目裏を食わせて (>4a~)',
  '5小節目を頭キメ (hit) にして',
  'サビを王道進行(F, G, Em, Am)で4小節追加して',
  'Aメロに1番・2番カッコを設置',
  '8小節目にTo Codaを追加',
  '全体を半音上げて',
];

export const NaturalLanguageBar: React.FC<NaturalLanguageBarProps> = ({
  onExecuteCommand,
  lastFeedback,
  hasApiKey,
  onOpenApiKeyModal,
  isLoading,
}) => {
  const [instruction, setInstruction] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!instruction.trim() || isLoading) return;
    onExecuteCommand(instruction);
    setInstruction('');
  };

  const handleApplyPreset = (cmd: string) => {
    if (isLoading) return;
    onExecuteCommand(cmd);
  };

  return (
    <div
      className="glass-panel animate-fade-in"
      style={{
        padding: '1rem 1.2rem',
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 27, 75, 0.8))',
        border: '1px solid rgba(99, 102, 241, 0.5)',
        borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(99, 102, 241, 0.15)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '6px',
              background: 'linear-gradient(135deg, #6366f1, #a855f7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Sparkles size={15} color="#fff" />
          </div>
          <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#fff' }}>
            楽譜AIコパイロット（譜面を見ながら自然言語で直接編集）
          </span>

          {/* Mode Badge */}
          {hasApiKey ? (
            <span
              style={{
                fontSize: '0.72rem',
                padding: '2px 8px',
                borderRadius: '12px',
                background: 'rgba(16, 185, 129, 0.18)',
                color: 'var(--accent-emerald)',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Bot size={12} /> Gemini LLM 連動中
            </span>
          ) : (
            <span
              style={{
                fontSize: '0.72rem',
                padding: '2px 8px',
                borderRadius: '12px',
                background: 'rgba(6, 182, 212, 0.15)',
                color: 'var(--accent-cyan)',
                border: '1px solid rgba(6, 182, 212, 0.3)',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              ⚡ 高速ローカルエンジン
            </span>
          )}
        </div>

        {/* API Key Config Button */}
        <button
          onClick={onOpenApiKeyModal}
          className="btn btn-secondary"
          style={{
            fontSize: '0.78rem',
            padding: '0.3rem 0.7rem',
            color: hasApiKey ? 'var(--text-main)' : 'var(--accent-cyan)',
            borderColor: hasApiKey ? 'var(--border-color)' : 'var(--accent-cyan)',
          }}
          title="Gemini APIキーを設定して高度なLLM解釈を有効化"
        >
          <Key size={13} />
          {hasApiKey ? 'APIキー設定済み' : 'Gemini APIキーを設定 (無料)'}
        </button>
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '0.6rem' }}>
        <input
          type="text"
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          disabled={isLoading}
          placeholder="例: 「サビのコード進行をF, G, Em, Amにして」「3小節目の4拍目裏を食わせて」「Aメロに1番・2番カッコを設置」..."
          style={{
            flex: 1,
            background: 'rgba(0, 0, 0, 0.4)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '8px',
            padding: '0.6rem 1rem',
            color: '#ffffff',
            fontSize: '0.9rem',
            fontFamily: 'var(--font-sans)',
            outline: 'none',
          }}
        />
        <button
          type="submit"
          disabled={isLoading}
          className="btn btn-primary"
          style={{
            padding: '0.6rem 1.2rem',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            whiteSpace: 'nowrap',
          }}
        >
          {isLoading ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              <span>LLMが思考中...</span>
            </>
          ) : (
            <>
              <span>指示を実行</span>
              <CornerDownLeft size={14} />
            </>
          )}
        </button>
      </form>

      {/* Quick Suggestion Presets */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
          <ArrowRight size={12} /> 指示例:
        </span>
        {SAMPLE_COMMANDS.map((cmd) => (
          <button
            key={cmd}
            disabled={isLoading}
            className="chip"
            style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', color: '#cbd5e1' }}
            onClick={() => handleApplyPreset(cmd)}
          >
            {cmd}
          </button>
        ))}
      </div>

      {/* Execution Feedback Banner */}
      {lastFeedback && (
        <div
          className="animate-fade-in"
          style={{
            background: lastFeedback.startsWith('✅')
              ? 'rgba(16, 185, 129, 0.15)'
              : lastFeedback.startsWith('ℹ️')
              ? 'rgba(6, 182, 212, 0.15)'
              : 'rgba(245, 158, 11, 0.15)',
            border: `1px solid ${
              lastFeedback.startsWith('✅')
                ? '#10b981'
                : lastFeedback.startsWith('ℹ️')
                ? '#06b6d4'
                : '#f59e0b'
            }`,
            borderRadius: '6px',
            padding: '0.4rem 0.8rem',
            fontSize: '0.82rem',
            color: '#f8fafc',
            fontWeight: 500,
          }}
        >
          {lastFeedback}
        </div>
      )}
    </div>
  );
};
