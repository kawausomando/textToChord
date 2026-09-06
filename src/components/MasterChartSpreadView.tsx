import React from 'react';
import type { MasterChart, Measure } from '../types/chart';
import { parseKickDsl } from '../utils/chartParser';

interface MasterChartSpreadViewProps {
  chart: MasterChart;
  selectedMeasureId: string | null;
  onSelectMeasure: (measureId: string) => void;
}

// 5-line staff constants
const STAFF_Y_START = 54;
const LINE_SPACING = 9;
const STAFF_HEIGHT = LINE_SPACING * 4; // 36px
const SYSTEM_HEIGHT = 132;
const SVG_WIDTH = 880;
const MEASURES_PER_SYSTEM = 4;
const BAR_WIDTH = SVG_WIDTH / MEASURES_PER_SYSTEM; // 220px per bar

export const MasterChartSpreadView: React.FC<MasterChartSpreadViewProps> = ({
  chart,
  selectedMeasureId,
  onSelectMeasure,
}) => {
  // Group measures into systems of 4
  const systems: Measure[][] = [];
  let currentSystem: Measure[] = [];

  chart.measures.forEach((m, idx) => {
    if (m.pageBreakBefore && currentSystem.length > 0) {
      systems.push(currentSystem);
      currentSystem = [];
    } else if (idx > 0 && idx % MEASURES_PER_SYSTEM === 0 && currentSystem.length > 0) {
      systems.push(currentSystem);
      currentSystem = [];
    }
    currentSystem.push(m);
  });
  if (currentSystem.length > 0) {
    systems.push(currentSystem);
  }

  // Split systems into Page 1 and Page 2 (Default max 6 systems on Page 1, rest on Page 2)
  let page1Systems: Measure[][] = [];
  let page2Systems: Measure[][] = [];

  // Check if any measure has explicit pageBreakBefore
  const pageBreakSystemIdx = systems.findIndex((sys) => sys.some((m) => m.pageBreakBefore));

  if (pageBreakSystemIdx !== -1) {
    page1Systems = systems.slice(0, pageBreakSystemIdx);
    page2Systems = systems.slice(pageBreakSystemIdx);
  } else {
    // SOP guideline: Page 1 around 6 systems (approx 22-24 bars), Page 2 up to 8 systems
    const splitIdx = Math.min(6, Math.max(1, Math.ceil(systems.length / 2)));
    page1Systems = systems.slice(0, splitIdx);
    page2Systems = systems.slice(splitIdx);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
      {/* Spread Container: 2-Page side-by-side on desktop */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: page2Systems.length > 0 ? 'repeat(auto-fit, minmax(480px, 1fr))' : '1fr',
          gap: '1.5rem',
          width: '100%',
        }}
      >
        {/* Page 1 */}
        <div className="glass-panel" style={{ padding: '1.5rem', background: '#0a0e1a', border: '1px solid #1f293d' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.6rem' }}>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-cyan)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                MASTER RHYTHM CHART • PAGE 1
              </span>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff' }}>{chart.title}</h2>
            </div>
            <div style={{ textAlign: 'right', fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              <div>Key: <strong style={{ color: 'var(--accent-amber)' }}>{chart.keySignature}</strong></div>
              <div>BPM: <strong style={{ color: '#fff' }}>{chart.bpm}</strong> • 4/4</div>
            </div>
          </div>

          <svg viewBox={`0 0 ${SVG_WIDTH} ${Math.max(200, page1Systems.length * SYSTEM_HEIGHT)}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
            {page1Systems.map((systemMeasures, sIdx) => renderSystem(systemMeasures, sIdx, selectedMeasureId, onSelectMeasure))}
          </svg>
        </div>

        {/* Page 2 (if exists) */}
        {page2Systems.length > 0 && (
          <div className="glass-panel" style={{ padding: '1.5rem', background: '#0a0e1a', border: '1px solid #1f293d' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.6rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-emerald)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  MASTER RHYTHM CHART • PAGE 2
                </span>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff' }}>{chart.title} (Cont.)</h2>
              </div>
              <div style={{ textAlign: 'right', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                見開き完了 (譜めくりゼロ)
              </div>
            </div>

            <svg viewBox={`0 0 ${SVG_WIDTH} ${Math.max(200, page2Systems.length * SYSTEM_HEIGHT)}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
              {page2Systems.map((systemMeasures, sIdx) => renderSystem(systemMeasures, sIdx, selectedMeasureId, onSelectMeasure))}
            </svg>
          </div>
        )}
      </div>
    </div>
  );
};

function renderSystem(
  measures: Measure[],
  systemIndex: number,
  selectedMeasureId: string | null,
  onSelectMeasure: (id: string) => void
) {
  const yOffset = systemIndex * SYSTEM_HEIGHT;
  const staffTop = yOffset + STAFF_Y_START;

  return (
    <g key={systemIndex} className="chart-system">
      {/* 5 Staff Lines */}
      {[0, 1, 2, 3, 4].map((lineIndex) => {
        const lineY = staffTop + lineIndex * LINE_SPACING;
        return (
          <line
            key={lineIndex}
            x1={0}
            y1={lineY}
            x2={SVG_WIDTH}
            y2={lineY}
            stroke="#475569"
            strokeWidth="1.2"
          />
        );
      })}

      {/* Render Individual Measures */}
      {measures.map((m, mIdx) => {
        const barX = mIdx * BAR_WIDTH;
        const isSelected = selectedMeasureId === m.id;

        return (
          <g
            key={m.id}
            onClick={() => onSelectMeasure(m.id)}
            style={{ cursor: 'pointer' }}
          >
            {/* Clickable Hover / Select Background */}
            <rect
              x={barX + 2}
              y={yOffset + 2}
              width={BAR_WIDTH - 4}
              height={SYSTEM_HEIGHT - 6}
              fill={isSelected ? 'rgba(6, 182, 212, 0.14)' : 'transparent'}
              stroke={isSelected ? '#06b6d4' : 'transparent'}
              strokeWidth="2"
              rx="6"
            />

            {/* Bar Number Indicator (Suppressed on measures with rehearsal mark, volta, or segno to adhere to Gould/Dorico engraving rules and avoid text collisions) */}
            {!m.rehearsalMark && !m.volta && !m.segno && (
              <text
                x={barX + 6}
                y={yOffset + 18}
                fill="#64748b"
                fontSize="10"
                fontFamily="var(--font-mono)"
              >
                {m.number}
              </text>
            )}

            {/* Rehearsal Mark (Boxed System Text) - Placed in dedicated Top Tier (y: 3..23) */}
            {m.rehearsalMark && (
              <g>
                <rect
                  x={barX + 6}
                  y={yOffset + 3}
                  width={Math.max(34, m.rehearsalMark.length * 9 + 16)}
                  height="20"
                  rx="4"
                  fill="#0f172a"
                  stroke="#06b6d4"
                  strokeWidth="2"
                />
                <text
                  x={barX + 14}
                  y={yOffset + 17}
                  fill="#ffffff"
                  fontSize="11"
                  fontWeight="800"
                  fontFamily="var(--font-sans)"
                >
                  {m.rehearsalMark}
                </text>
              </g>
            )}

            {/* Segno / Coda / To Coda Navigation Texts (Offset dynamically if rehearsal mark or volta is present) */}
            {m.segno && (() => {
              const markWidth = m.rehearsalMark ? Math.max(34, m.rehearsalMark.length * 9 + 16) : 0;
              const startX = m.rehearsalMark ? barX + 6 + markWidth + 6 : barX;
              const segnoX = m.rehearsalMark
                ? barX + 6 + markWidth + 8
                : m.volta
                ? startX + 24
                : barX + 10;
              return (
                <text x={segnoX} y={yOffset + 19} fill="#f59e0b" fontSize="18" fontWeight="bold">
                  𝄋
                </text>
              );
            })()}
            {m.toCoda && (
              <text x={barX + BAR_WIDTH - 80} y={yOffset + 15} fill="#f43f5e" fontSize="11" fontWeight="bold">
                To Coda 𝄌
              </text>
            )}
            {m.dsAlCoda && (
              <text x={barX + BAR_WIDTH - 85} y={yOffset + 15} fill="#38bdf8" fontSize="11" fontWeight="bold">
                D.S. al Coda
              </text>
            )}

            {/* Volta (1., 2. Endings) - Clear of chords and rehearsal marks */}
            {m.volta && (() => {
              const markWidth = m.rehearsalMark ? Math.max(34, m.rehearsalMark.length * 9 + 16) : 0;
              const startX = m.rehearsalMark ? barX + 6 + markWidth + 6 : barX;
              return (
                <g>
                  <line
                    x1={startX}
                    y1={yOffset + 18}
                    x2={barX + BAR_WIDTH}
                    y2={yOffset + 18}
                    stroke="#f59e0b"
                    strokeWidth="1.5"
                  />
                  <line
                    x1={startX}
                    y1={yOffset + 18}
                    x2={startX}
                    y2={yOffset + 28}
                    stroke="#f59e0b"
                    strokeWidth="1.5"
                  />
                  <text x={startX + 6} y={yOffset + 15} fill="#f59e0b" fontSize="11" fontWeight="bold">
                    {m.volta}.
                  </text>
                </g>
              );
            })()}

            {/* Band Instructions (e.g. -> half, (vocal in)) */}
            {m.bandText && (
              <text
                x={barX + 8}
                y={staffTop + STAFF_HEIGHT + 20}
                fill="#94a3b8"
                fontSize="11"
                fontStyle="italic"
                fontFamily="var(--font-sans)"
              >
                {m.bandText}
              </text>
            )}

            {/* Chord Symbols */}
            {m.chords.length > 0 && (
              <g>
                {m.chords.map((chord, cIdx) => {
                  // Defensive cleanup: ensure raw kick DSL never leaks into chord label display
                  const cleanSymbol = chord.symbol
                    .replace(/\[kick:[^\]]+\]/g, '')
                    .replace(/\(>?[0-9a-z~&+.!]+\)/gi, '')
                    .trim();

                  if (!cleanSymbol) return null;

                  let chordX = barX + 16 + (cIdx * (BAR_WIDTH - 32)) / Math.max(1, m.chords.length);

                  // If chord has specific kickDsl (e.g. Fm7(1) or B♭7(2&~) or anticipation >4&~),
                  // align it directly above its respective kick slash notehead!
                  if (chord.kickDsl) {
                    const parsed = parseKickDsl(chord.kickDsl);
                    const kickStep = parsed.kicks.findIndex(Boolean);
                    if (kickStep >= 0) {
                      const stepX = barX + 14 + (kickStep * (BAR_WIDTH - 28)) / 16;
                      chordX = Math.max(barX + 8, Math.min(barX + BAR_WIDTH - 32, stepX - 10));
                    }
                  } else if (cIdx > 0 && m.kicks && (m.kicks[14] || m.kicks[15])) {
                    const kickStep = m.kicks[15] ? 15 : 14;
                    const stepX = barX + 14 + (kickStep * (BAR_WIDTH - 28)) / 16;
                    chordX = Math.max(barX + 70, stepX - 12);
                  }

                  return (
                    <text
                      key={cIdx}
                      x={chordX}
                      y={staffTop - 8}
                      fill="#38bdf8"
                      fontSize="15"
                      fontWeight="700"
                      fontFamily="var(--font-sans)"
                    >
                      {cleanSymbol}
                    </text>
                  );
                })}
              </g>
            )}

            {/* Simile (%, %2%, %4%) or Kicks or Incoming Tied Comping or Whole Rest */}
            {m.simile === 'percent1' ? (
              <g>
                {/* 1-bar simile symbol: thick diagonal slash with 2 dots */}
                <line
                  x1={barX + BAR_WIDTH / 2 - 14}
                  y1={staffTop + STAFF_HEIGHT - 6}
                  x2={barX + BAR_WIDTH / 2 + 14}
                  y2={staffTop + 6}
                  stroke="#cbd5e1"
                  strokeWidth="3"
                />
                <circle cx={barX + BAR_WIDTH / 2 - 9} cy={staffTop + 14} r="2.8" fill="#cbd5e1" />
                <circle cx={barX + BAR_WIDTH / 2 + 9} cy={staffTop + STAFF_HEIGHT - 14} r="2.8" fill="#cbd5e1" />
              </g>
            ) : m.simile === 'percent2' ? (
              <g>
                {/* 2-bar simile symbol: double diagonal slash with 2 dots and "2" on top */}
                <line
                  x1={barX + BAR_WIDTH / 2 - 18}
                  y1={staffTop + STAFF_HEIGHT - 6}
                  x2={barX + BAR_WIDTH / 2 + 10}
                  y2={staffTop + 6}
                  stroke="#cbd5e1"
                  strokeWidth="2.8"
                />
                <line
                  x1={barX + BAR_WIDTH / 2 - 10}
                  y1={staffTop + STAFF_HEIGHT - 6}
                  x2={barX + BAR_WIDTH / 2 + 18}
                  y2={staffTop + 6}
                  stroke="#cbd5e1"
                  strokeWidth="2.8"
                />
                <circle cx={barX + BAR_WIDTH / 2 - 13} cy={staffTop + 14} r="2.6" fill="#cbd5e1" />
                <circle cx={barX + BAR_WIDTH / 2 + 13} cy={staffTop + STAFF_HEIGHT - 14} r="2.6" fill="#cbd5e1" />
                <text x={barX + BAR_WIDTH / 2 - 4} y={staffTop - 4} fill="#f59e0b" fontSize="13" fontWeight="bold">
                  2
                </text>
              </g>
            ) : m.simile === 'percent4' ? (
              <g>
                {/* 4-bar simile block */}
                <rect
                  x={barX + 10}
                  y={staffTop + 6}
                  width={BAR_WIDTH - 20}
                  height={STAFF_HEIGHT - 12}
                  fill="rgba(245, 158, 11, 0.1)"
                  stroke="#f59e0b"
                  strokeWidth="1.5"
                  strokeDasharray="4 2"
                  rx="4"
                />
                <text
                  x={barX + BAR_WIDTH / 2 - 32}
                  y={staffTop + STAFF_HEIGHT / 2 + 5}
                  fill="#f59e0b"
                  fontSize="11"
                  fontWeight="bold"
                >
                  [4-BAR SIM.]
                </text>
              </g>
            ) : m.kicks && m.kicks.some(Boolean) ? (
              <g>
                {/* If kick is only an anticipation on beat 4 (steps 14/15 active, steps 0..11 all false),
                    render comping rhythm slashes on beats 1, 2, 3 */}
                {(m.kicks[14] || m.kicks[15]) && !m.kicks.slice(0, 12).some(Boolean) && (
                  <g opacity="0.6">
                    {[0, 1, 2].map((b) => {
                      const slashX = barX + 26 + (b * (BAR_WIDTH - 48)) / 3;
                      const slashY = staffTop + LINE_SPACING * 2;
                      return (
                        <line
                          key={b}
                          x1={slashX - 6}
                          y1={slashY + 7}
                          x2={slashX + 6}
                          y2={slashY - 7}
                          stroke="#cbd5e1"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        />
                      );
                    })}
                  </g>
                )}

                {/* 16-Step Comping Kicks (Slash noteheads on 3rd staff space) */}
                {/* 8th note beams for pairs within the same beat */}
                {[0, 1, 2, 3].map((b) => {
                  const s1 = b * 4;
                  const s2 = b * 4 + 2;
                  if (m.kicks[s1] && m.kicks[s2] && !m.kicks[s1 + 1] && !m.kicks[s1 + 3]) {
                    const x1 = barX + 14 + (s1 * (BAR_WIDTH - 28)) / 16 + 5;
                    const x2 = barX + 14 + (s2 * (BAR_WIDTH - 28)) / 16 + 5;
                    const beamY = staffTop + LINE_SPACING * 2 - 24 + 1.2;
                    return (
                      <line
                        key={`beam-${b}`}
                        x1={x1}
                        y1={beamY}
                        x2={x2}
                        y2={beamY}
                        stroke="#f8fafc"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                    );
                  }
                  return null;
                })}

                {m.kicks.map((isActive, stepIdx) => {
                  if (!isActive) return null;
                  const stepX = barX + 14 + (stepIdx * (BAR_WIDTH - 28)) / 16;
                  const noteY = staffTop + LINE_SPACING * 2; // Middle 3rd line/space
                  const stemX = stepX + 5;
                  const stemTopY = noteY - 24;
                  const isTied = m.ties && m.ties[stepIdx];

                  // Note duration flag / beam determination
                  const b = Math.floor(stepIdx / 4);
                  const isBeamed8th =
                    m.kicks[b * 4] &&
                    m.kicks[b * 4 + 2] &&
                    !m.kicks[b * 4 + 1] &&
                    !m.kicks[b * 4 + 3] &&
                    (stepIdx === b * 4 || stepIdx === b * 4 + 2);

                  const is16thNote = stepIdx % 2 === 1;
                  const is8thNote = !isBeamed8th && stepIdx % 4 === 2;

                  // If anticipation at end of measure (step 14 or 15), tie curves over the barline into the next measure
                  const isAnticipationEnd = stepIdx >= 14;
                  const tieEndX = isAnticipationEnd ? barX + BAR_WIDTH + 14 : stepX + 22;
                  const tieMidX = (stepX + 6 + tieEndX) / 2;
                  const tieMidY = isAnticipationEnd ? noteY + 6 : noteY + 4;

                  return (
                    <g key={stepIdx}>
                      {/* Slash Notehead */}
                      <line
                        x1={stepX - 5}
                        y1={noteY + 7}
                        x2={stepX + 5}
                        y2={noteY - 7}
                        stroke="#f8fafc"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                      />
                      {/* Stem up */}
                      <line
                        x1={stemX}
                        y1={noteY - 7}
                        x2={stemX}
                        y2={stemTopY}
                        stroke="#f8fafc"
                        strokeWidth="1.2"
                      />

                      {/* 8th Note Single Flag (8分音符の旗) */}
                      {is8thNote && (
                        <path
                          d={`M ${stemX} ${stemTopY}
                              C ${stemX + 6.5} ${stemTopY + 1.5}, ${stemX + 7.5} ${stemTopY + 5.5}, ${stemX + 4.5} ${stemTopY + 10.5}
                              C ${stemX + 6} ${stemTopY + 7}, ${stemX + 3.5} ${stemTopY + 3.5}, ${stemX} ${stemTopY + 3.5}
                              Z`}
                          fill="#f8fafc"
                        />
                      )}

                      {/* 16th Note Double Flag (16分音符の2本旗) */}
                      {is16thNote && (
                        <g fill="#f8fafc">
                          <path
                            d={`M ${stemX} ${stemTopY}
                                C ${stemX + 6.5} ${stemTopY + 1.5}, ${stemX + 7.5} ${stemTopY + 5.5}, ${stemX + 4.5} ${stemTopY + 10.5}
                                C ${stemX + 6} ${stemTopY + 7}, ${stemX + 3.5} ${stemTopY + 3.5}, ${stemX} ${stemTopY + 3.5}
                                Z`}
                          />
                          <path
                            d={`M ${stemX} ${stemTopY + 4.5}
                                C ${stemX + 6.5} ${stemTopY + 6}, ${stemX + 7.5} ${stemTopY + 10}, ${stemX + 4.5} ${stemTopY + 15}
                                C ${stemX + 6} ${stemTopY + 11.5}, ${stemX + 3.5} ${stemTopY + 8}, ${stemX} ${stemTopY + 8}
                                Z`}
                          />
                        </g>
                      )}

                      {/* Tie curve if tied */}
                      {isTied && (
                        <path
                          d={`M ${stepX + 6} ${noteY - 4} Q ${tieMidX} ${tieMidY} ${tieEndX} ${noteY - 4}`}
                          fill="none"
                          stroke="#38bdf8"
                          strokeWidth="1.8"
                        />
                      )}
                    </g>
                  );
                })}
              </g>
            ) : (() => {
              // Check if previous measure has a tie over the barline into this measure
              const prevMeasure = mIdx > 0 ? measures[mIdx - 1] : undefined;
              const hasIncomingTie = prevMeasure?.ties && (prevMeasure.ties[14] || prevMeasure.ties[15]);

              if (hasIncomingTie) {
                // Downbeat is tied from previous measure! Render tied slash notehead on beat 1 + comping slashes on beats 2, 3, 4
                const noteY = staffTop + LINE_SPACING * 2;
                const beat1X = barX + 24;
                return (
                  <g>
                    {/* Tied Slash Notehead on Beat 1 */}
                    <line
                      x1={beat1X - 5}
                      y1={noteY + 7}
                      x2={beat1X + 5}
                      y2={noteY - 7}
                      stroke="#f8fafc"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />
                    <line
                      x1={beat1X + 5}
                      y1={noteY - 7}
                      x2={beat1X + 5}
                      y2={noteY - 24}
                      stroke="#f8fafc"
                      strokeWidth="1.2"
                    />
                    {/* Comping rhythm slashes on beats 2, 3, 4 */}
                    <g opacity="0.6">
                      {[1, 2, 3].map((b) => {
                        const slashX = barX + 24 + (b * (BAR_WIDTH - 36)) / 3;
                        return (
                          <line
                            key={b}
                            x1={slashX - 6}
                            y1={noteY + 7}
                            x2={slashX + 6}
                            y2={noteY - 7}
                            stroke="#cbd5e1"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                          />
                        );
                      })}
                    </g>
                  </g>
                );
              }

              return (
                /* Normal Whole Measure Rest */
                <rect
                  x={barX + BAR_WIDTH / 2 - 8}
                  y={staffTop + LINE_SPACING}
                  width="16"
                  height="6"
                  fill="#64748b"
                />
              );
            })()}

            {/* Left Barline (Start Repeat 𝄆) */}
            {m.leftBarline === 'start' && (
              <g>
                <line x1={barX + 2} y1={staffTop} x2={barX + 2} y2={staffTop + STAFF_HEIGHT} stroke="#fff" strokeWidth="4" />
                <line x1={barX + 7} y1={staffTop} x2={barX + 7} y2={staffTop + STAFF_HEIGHT} stroke="#fff" strokeWidth="1.2" />
                <circle cx={barX + 12} cy={staffTop + LINE_SPACING * 1.5} r="2.2" fill="#fff" />
                <circle cx={barX + 12} cy={staffTop + LINE_SPACING * 2.5} r="2.2" fill="#fff" />
              </g>
            )}

            {/* Right Barline */}
            {renderRightBarline(m.rightBarline, barX + BAR_WIDTH, staffTop)}
          </g>
        );
      })}

      {/* System Left Enclosing Barline */}
      <line x1={0} y1={staffTop} x2={0} y2={staffTop + STAFF_HEIGHT} stroke="#64748b" strokeWidth="1.5" />
    </g>
  );
}

function renderRightBarline(type: string, rightX: number, staffTop: number) {
  if (type === 'end') {
    // End repeat 𝄇
    return (
      <g>
        <circle cx={rightX - 12} cy={staffTop + LINE_SPACING * 1.5} r="2.2" fill="#fff" />
        <circle cx={rightX - 12} cy={staffTop + LINE_SPACING * 2.5} r="2.2" fill="#fff" />
        <line x1={rightX - 7} y1={staffTop} x2={rightX - 7} y2={staffTop + STAFF_HEIGHT} stroke="#fff" strokeWidth="1.2" />
        <line x1={rightX - 2} y1={staffTop} x2={rightX - 2} y2={staffTop + STAFF_HEIGHT} stroke="#fff" strokeWidth="4" />
      </g>
    );
  }
  if (type === 'double') {
    return (
      <g>
        <line x1={rightX - 4} y1={staffTop} x2={rightX - 4} y2={staffTop + STAFF_HEIGHT} stroke="#fff" strokeWidth="1.2" />
        <line x1={rightX} y1={staffTop} x2={rightX} y2={staffTop + STAFF_HEIGHT} stroke="#fff" strokeWidth="1.2" />
      </g>
    );
  }
  if (type === 'final') {
    return (
      <g>
        <line x1={rightX - 5} y1={staffTop} x2={rightX - 5} y2={staffTop + STAFF_HEIGHT} stroke="#fff" strokeWidth="1.2" />
        <line x1={rightX - 1} y1={staffTop} x2={rightX - 1} y2={staffTop + STAFF_HEIGHT} stroke="#fff" strokeWidth="4" />
      </g>
    );
  }

  // Standard barline
  return (
    <line
      x1={rightX}
      y1={staffTop}
      x2={rightX}
      y2={staffTop + STAFF_HEIGHT}
      stroke="#64748b"
      strokeWidth="1.2"
    />
  );
}
