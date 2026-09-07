import React from 'react';
import type { MasterChart, Measure } from '../types/chart';
import { parseKickDsl } from '../utils/chartParser';

interface MasterChartSpreadViewProps {
  chart: MasterChart;
  selectedMeasureId: string | null;
  onSelectMeasure: (measureId: string) => void;
  onDoubleClickMeasure?: (measureId: string) => void;
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
  onDoubleClickMeasure,
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
              <div>BPM: <strong style={{ color: '#fff' }}>{chart.bpm}</strong> • {chart.timeSignature ? `${chart.timeSignature[0]}/${chart.timeSignature[1]}` : '4/4'}</div>
            </div>
          </div>

          <svg viewBox={`0 0 ${SVG_WIDTH} ${Math.max(200, page1Systems.length * SYSTEM_HEIGHT)}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
            {page1Systems.map((systemMeasures, sIdx) => renderSystem(systemMeasures, sIdx, selectedMeasureId, onSelectMeasure, onDoubleClickMeasure))}
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
              {page2Systems.map((systemMeasures, sIdx) => renderSystem(systemMeasures, sIdx, selectedMeasureId, onSelectMeasure, onDoubleClickMeasure))}
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
  onSelectMeasure: (id: string) => void,
  onDoubleClickMeasure?: (id: string) => void
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
            onDoubleClick={(e) => {
              e.stopPropagation();
              onDoubleClickMeasure?.(m.id);
            }}
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
                {(() => {
                  interface MeasureNote {
                    step: number;
                    span: number;
                    isDotted: boolean;
                    isUserKick: boolean;
                    isTiedToNext: boolean;
                    isTiedFromPrev: boolean;
                  }

                  const allNotes: MeasureNote[] = [];
                  const userSteps: number[] = [];
                  m.kicks.forEach((act, s) => {
                    if (act) userSteps.push(s);
                  });

                  for (let i = 0; i < userSteps.length; i++) {
                    const s = userSteps[i];
                    const nextS = i + 1 < userSteps.length ? userSteps[i + 1] : 16;
                    const targetSpan = nextS - s;

                    const startBeat = Math.floor(s / 4);
                    const beatEnd = startBeat * 4 + 3;
                    const stepsInBeat = beatEnd - s + 1;

                    // Off-beat note extending beyond current beat cannot have a dot crossing the beat boundary.
                    // When an offbeat note has a dotted duration (targetSpan === 3 or 6) or an explicit tie (m.ties[s]),
                    // and extends into the next beat (nextS < 16), split at beat boundary:
                    // note in current beat + tied note at downbeat of next beat!
                    const isOffBeat = s % 4 !== 0;
                    const isDottedCandidate = targetSpan === 3 || targetSpan === 6;
                    const hasExplicitTie = Boolean(m.ties && m.ties[s]);
                    const crossesBeat = isOffBeat && (isDottedCandidate || hasExplicitTie) && targetSpan > stepsInBeat && nextS < 16;

                    if (crossesBeat) {
                      // Note in current beat (truncated to beatEnd, no dot crossing beat boundary)
                      allNotes.push({
                        step: s,
                        span: stepsInBeat,
                        isDotted: stepsInBeat === 3, // only dotted if it completely fits within beat
                        isUserKick: true,
                        isTiedToNext: true,
                        isTiedFromPrev: false,
                      });

                      // Synthesized tied note in next beat:
                      const nextBeatStep = (startBeat + 1) * 4;
                      const remainingSpan = Math.min(4, targetSpan - stepsInBeat);
                      allNotes.push({
                        step: nextBeatStep,
                        span: remainingSpan,
                        isDotted: remainingSpan === 3,
                        isUserKick: false,
                        isTiedToNext: false,
                        isTiedFromPrev: true,
                      });
                    } else {
                      // Downbeat or note contained within beat
                      const isDotted =
                        (targetSpan === 3 && targetSpan <= stepsInBeat) ||
                        (s % 4 === 0 && (targetSpan === 6 || targetSpan === 12));
                      allNotes.push({
                        step: s,
                        span: targetSpan,
                        isDotted,
                        isUserKick: true,
                        isTiedToNext: Boolean(m.ties && m.ties[s]),
                        isTiedFromPrev: false,
                      });
                    }
                  }

                  // Sort notes by step
                  allNotes.sort((a, b) => a.step - b.step);

                  const getStepX = (step: number) => barX + 14 + (step * (BAR_WIDTH - 28)) / 16;
                  const getStemX = (step: number) => getStepX(step) + 5;
                  const noteY = staffTop + LINE_SPACING * 2;
                  const stemTopY = noteY - 24;

                  return (
                    <g>
                      {/* Strict 1-Beat Grouping Beams (Beams NEVER cross beats) */}
                      {[0, 1, 2, 3].map((b) => {
                        const notesInBeat = allNotes.filter((n) => Math.floor(n.step / 4) === b);
                        if (notesInBeat.length < 2) return null;

                        const firstStep = notesInBeat[0].step;
                        const lastStep = notesInBeat[notesInBeat.length - 1].step;
                        const primaryBeamY = stemTopY + 1.2;
                        const secondaryBeamY = stemTopY + 5.8;

                        const is16thLevel = (n: MeasureNote) => (n.step % 2 === 1) || (n.span === 1);

                        // Secondary beams for consecutive 16th notes
                        const secondaryBeams: Array<{ x1: number; x2: number }> = [];
                        for (let i = 0; i < notesInBeat.length - 1; i++) {
                          const nA = notesInBeat[i];
                          const nB = notesInBeat[i + 1];
                          if (is16thLevel(nA) && is16thLevel(nB) && nB.step - nA.step === 1) {
                            secondaryBeams.push({ x1: getStemX(nA.step), x2: getStemX(nB.step) });
                          }
                        }

                        // Fractional beamlets for isolated 16th notes in a beamed beat
                        notesInBeat.forEach((n) => {
                          if (n.step % 2 === 1 || n.span === 1) {
                            const hasSec = secondaryBeams.some(
                              (sb) => Math.abs(sb.x1 - getStemX(n.step)) < 0.1 || Math.abs(sb.x2 - getStemX(n.step)) < 0.1
                            );
                            if (!hasSec) {
                              const beamletLen = 7;
                              if (n.step > firstStep) {
                                secondaryBeams.push({ x1: getStemX(n.step) - beamletLen, x2: getStemX(n.step) });
                              } else {
                                secondaryBeams.push({ x1: getStemX(n.step), x2: getStemX(n.step) + beamletLen });
                              }
                            }
                          }
                        });

                        return (
                          <g key={`beat-beams-${b}`}>
                            {/* Primary 8th Beam */}
                            <line
                              x1={getStemX(firstStep)}
                              y1={primaryBeamY}
                              x2={getStemX(lastStep)}
                              y2={primaryBeamY}
                              stroke="#f8fafc"
                              strokeWidth="3"
                              strokeLinecap="round"
                            />
                            {/* Secondary 16th Beams / Beamlets */}
                            {secondaryBeams.map((sb, sbIdx) => (
                              <line
                                key={`sec-${sbIdx}`}
                                x1={sb.x1}
                                y1={secondaryBeamY}
                                x2={sb.x2}
                                y2={secondaryBeamY}
                                stroke="#f8fafc"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                              />
                            ))}
                          </g>
                        );
                      })}

                      {/* Active Kick Noteheads, Stems, Flags, Dots, Ties */}
                      {allNotes.map((note, nIdx) => {
                        const stepX = getStepX(note.step);
                        const stemX = getStemX(note.step);

                        // 1-Beat grouping check: if 2+ notes in beat, this note is beamed
                        const b = Math.floor(note.step / 4);
                        const notesInBeat = allNotes.filter((n) => Math.floor(n.step / 4) === b);
                        const isBeamed = notesInBeat.length >= 2;

                        // Isolated flags: only if note is NOT beamed
                        // Dotted quarter notes (span === 6 or longer) and downbeat quarter notes have 0 flags!
                        // Dotted 8th notes (span === 3) and 8th notes have 1 flag.
                        // 16th notes have 2 flags.
                        const isDottedQuarterOrLonger = note.span >= 6 || (note.step % 4 === 0 && note.span >= 4);
                        const is8thNote = !isBeamed && !isDottedQuarterOrLonger && (note.span === 3 || note.step % 4 === 2);
                        const is16thNote = !isBeamed && !isDottedQuarterOrLonger && note.span !== 3 && note.step % 2 === 1;

                        // Tie curves:
                        // 1. Intra-measure beat-crossing tie (connects to next note in allNotes)
                        // 2. Barline anticipation tie (step 14 or 15 with tie curving across barline)
                        // Standard music notation (Gould, Behind Bars): ties on notes on middle line
                        // are positioned in Space 3 underneath the noteheads (between Line 3 and Line 4).
                        let tieCurve: React.ReactNode = null;
                        if (note.isTiedToNext) {
                          const isAnticipationEnd = note.step >= 14;
                          const startX = stepX + 2;
                          const startY = noteY + 4;
                          const tieMidY = noteY + 11;

                          if (isAnticipationEnd) {
                            // Crosses barline into next measure as an open-ended tie (no destination note rendered)
                            const tieEndX = Math.min(SVG_WIDTH - 2, barX + BAR_WIDTH + 14);
                            const tieMidX = (startX + tieEndX) / 2;
                            tieCurve = (
                              <path
                                d={`M ${startX} ${startY} Q ${tieMidX} ${tieMidY} ${tieEndX} ${startY}`}
                                fill="none"
                                stroke="#38bdf8"
                                strokeWidth="1.8"
                              />
                            );
                          } else {
                            const nextNote = allNotes[nIdx + 1];
                            if (nextNote) {
                              const destX = getStepX(nextNote.step);
                              const endX = destX - 2;
                              const tieMidX = (startX + endX) / 2;
                              tieCurve = (
                                <path
                                  d={`M ${startX} ${startY} Q ${tieMidX} ${tieMidY} ${endX} ${startY}`}
                                  fill="none"
                                  stroke="#38bdf8"
                                  strokeWidth="1.8"
                                />
                              );
                            }
                          }
                        }

                        return (
                          <g key={`note-${note.step}-${nIdx}`}>
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

                            {/* Augmentation Dot (付点) in 3rd staff space */}
                            {note.isDotted && (
                              <circle
                                cx={stepX + 11}
                                cy={noteY - 4.5}
                                r="2.2"
                                fill="#f8fafc"
                              />
                            )}

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
                            {tieCurve}
                          </g>
                        );
                      })}
                    </g>
                  );
                })()}
              </g>
            ) : (
              /* Normal Whole Measure Rest (Simplified master rhythm chart: no note is synthesized across the barline) */
              <rect
                x={barX + BAR_WIDTH / 2 - 8}
                y={staffTop + LINE_SPACING}
                width="16"
                height="6"
                fill="#64748b"
              />
            )}

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
