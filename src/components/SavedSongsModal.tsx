import React from 'react';
import type { SavedSong } from '../utils/songStorage';
import { Music, Trash2, Plus, X, FolderOpen, Clock } from 'lucide-react';

interface SavedSongsModalProps {
  isOpen: boolean;
  onClose: () => void;
  songs: SavedSong[];
  currentSongId: string | null;
  onSelectSong: (song: SavedSong) => void;
  onDeleteSong: (id: string) => void;
  onNewSong: () => void;
}

export const SavedSongsModal: React.FC<SavedSongsModalProps> = ({
  isOpen,
  onClose,
  songs,
  currentSongId,
  onSelectSong,
  onDeleteSong,
  onNewSong,
}) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '560px',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#0f172a',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '16px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '1.2rem 1.5rem',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <FolderOpen size={20} color="var(--accent-cyan)" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', margin: 0 }}>
              保存済み楽曲一覧 ({songs.length})
            </h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <button
              className="btn btn-accent"
              style={{ fontSize: '0.8rem', padding: '0.3rem 0.7rem' }}
              onClick={() => {
                onNewSong();
                onClose();
              }}
              title="新しい白紙の楽曲チャートを作成"
            >
              <Plus size={14} /> 新規作成
            </button>
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '0.2rem',
                borderRadius: '6px',
                display: 'flex',
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Body: Songs List */}
        <div
          style={{
            padding: '1.2rem 1.5rem',
            overflowY: 'auto',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '0.8rem',
          }}
        >
          {songs.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '3rem 1rem',
                color: 'var(--text-muted)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.8rem',
              }}
            >
              <Music size={40} opacity={0.3} />
              <p style={{ margin: 0, fontSize: '0.95rem' }}>保存されている楽曲がまだありません。</p>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                ツールバーの「保存」ボタンをクリックすると、ここに楽曲が保存されます。
              </p>
            </div>
          ) : (
            songs.map((song) => {
              const isCurrent = song.id === currentSongId;
              const dateStr = new Date(song.updatedAt).toLocaleString('ja-JP', {
                month: 'numeric',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={song.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.8rem 1rem',
                    background: isCurrent ? 'rgba(6, 182, 212, 0.12)' : 'rgba(255, 255, 255, 0.04)',
                    border: `1px solid ${isCurrent ? 'var(--accent-cyan)' : 'rgba(255, 255, 255, 0.08)'}`,
                    borderRadius: '10px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div
                    style={{ flex: 1, cursor: 'pointer' }}
                    onClick={() => {
                      onSelectSong(song);
                      onClose();
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                      <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>
                        {song.title}
                      </span>
                      {isCurrent && (
                        <span
                          style={{
                            fontSize: '0.65rem',
                            padding: '0.1rem 0.4rem',
                            borderRadius: '4px',
                            background: 'var(--accent-cyan)',
                            color: '#000',
                            fontWeight: 700,
                          }}
                        >
                          編集中
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      <span>Key: <strong style={{ color: 'var(--accent-cyan)' }}>{song.key}</strong></span>
                      <span>BPM: <strong style={{ color: '#a78bfa' }}>{song.bpm}</strong></span>
                      <span>拍子: <strong style={{ color: '#34d399' }}>{song.timeSignature}</strong></span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', color: 'var(--text-dim)' }}>
                        <Clock size={12} /> {dateStr}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: '0.8rem' }}>
                    <button
                      className={isCurrent ? 'btn btn-accent' : 'btn btn-secondary'}
                      style={{ fontSize: '0.78rem', padding: '0.3rem 0.7rem' }}
                      onClick={() => {
                        onSelectSong(song);
                        onClose();
                      }}
                    >
                      {isCurrent ? '選択中' : '開く'}
                    </button>
                    <button
                      style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                        color: '#f87171',
                        borderRadius: '6px',
                        padding: '0.35rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      title="この楽曲を削除"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`楽曲「${song.title}」を削除しますか？`)) {
                          onDeleteSong(song.id);
                        }
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
