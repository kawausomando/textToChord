import React from 'react';
import { LayoutGrid } from 'lucide-react';

interface VisualLeadSheetProps {
  formattedText: string;
  activeBarIndex: number;
}

export const VisualLeadSheet: React.FC<VisualLeadSheetProps> = ({ formattedText, activeBarIndex }) => {
  if (!formattedText.trim()) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-dim)' }}>
        入力すると、ここに視覚的なリードシート（小節カード表示）が生成されます。
      </div>
    );
  }

  // Parse formatted text into lines of bar arrays
  const lines: { barIndex: number; chords: string[] }[][] = [];
  let currentBarCounter = 0;

  const rawLines = formattedText.split('\n');
  for (const rawLine of rawLines) {
    const rawBars = rawLine.split('|').map(b => b.trim()).filter(Boolean);
    if (rawBars.length === 0) continue;

    const lineData: { barIndex: number; chords: string[] }[] = [];
    for (const rawBar of rawBars) {
      const chords = rawBar.split(/\s+/).filter(Boolean);
      lineData.push({
        barIndex: currentBarCounter,
        chords,
      });
      currentBarCounter++;
    }
    lines.push(lineData);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600 }}>
        <LayoutGrid size={16} color="var(--accent-cyan)" />
        リードシート・プレビュー（小節グリッド）
      </div>

      {lines.map((lineBars, lineIdx) => (
        <div
          key={lineIdx}
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${Math.min(lineBars.length, 4)}, 1fr)`,
            gap: '0.75rem',
          }}
        >
          {lineBars.map((bar) => {
            const isActive = activeBarIndex === bar.barIndex;

            return (
              <div
                key={bar.barIndex}
                style={{
                  background: isActive ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255, 255, 255, 0.03)',
                  border: isActive ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                  borderRadius: '10px',
                  padding: '1rem 0.8rem',
                  minHeight: '75px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.6rem',
                  boxShadow: isActive ? '0 0 20px var(--primary-glow)' : 'none',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                }}
              >
                {/* Bar number indicator */}
                <span
                  style={{
                    position: 'absolute',
                    top: '4px',
                    left: '8px',
                    fontSize: '0.65rem',
                    color: 'var(--text-dim)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  m.{bar.barIndex + 1}
                </span>

                {bar.chords.map((chord, cIdx) => (
                  <span
                    key={cIdx}
                    style={{
                      fontFamily: 'var(--font-sans)',
                      fontSize: '1.25rem',
                      fontWeight: 700,
                      color: isActive ? '#fff' : 'var(--accent-cyan)',
                      textShadow: isActive ? '0 0 10px rgba(255, 255, 255, 0.8)' : 'none',
                    }}
                  >
                    {chord}
                  </span>
                ))}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};
