// Web Audio API chord playback synth

const NOTE_FREQS: Record<string, number> = {
  'C': 261.63,
  'C♯': 277.18, 'D♭': 277.18,
  'D': 293.66,
  'D♯': 311.13, 'E♭': 311.13,
  'E': 329.63,
  'F': 349.23,
  'F♯': 369.99, 'G♭': 369.99,
  'G': 392.00,
  'G♯': 415.30, 'A♭': 415.30,
  'A': 440.00,
  'A♯': 466.16, 'B♭': 466.16,
  'B': 493.88
};

// Degrees in Key C (C, D, E, F, G, A, B)
const DEGREE_SEMITONES: Record<string, number> = {
  'Ⅰ': 0,
  '♭Ⅱ': 1, '♯Ⅰ': 1,
  'Ⅱ': 2,
  '♭Ⅲ': 3, '♯Ⅱ': 3,
  'Ⅲ': 4,
  'Ⅳ': 5,
  '♯Ⅳ': 6, '♭Ⅴ': 6,
  'Ⅴ': 7,
  '♭Ⅵ': 8, '♯Ⅴ': 8,
  'Ⅵ': 9,
  '♭Ⅶ': 10, '♯Ⅵ': 10,
  'Ⅶ': 11
};

export class ChordAudioPlayer {
  private ctx: AudioContext | null = null;
  private isPlaying = false;
  private activeTimers: number[] = [];

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public stop() {
    this.isPlaying = false;
    this.activeTimers.forEach(t => clearTimeout(t));
    this.activeTimers = [];
  }

  public playProgression(formattedText: string, bpm = 100, onBarChange?: (barIdx: number) => void) {
    this.stop();
    this.initCtx();
    if (!this.ctx) return;

    this.isPlaying = true;

    // Parse bars from formatted text "| Ⅳ | Ⅴ | Ⅲ | Ⅵ |"
    const bars: string[][] = [];
    const lines = formattedText.split('\n');

    for (const line of lines) {
      const lineBars = line.split('|').map(b => b.trim()).filter(Boolean);
      for (const b of lineBars) {
        const chords = b.split(/\s+/).filter(Boolean);
        if (chords.length > 0) {
          bars.push(chords);
        }
      }
    }

    if (bars.length === 0) return;

    const msPerBeat = (60 / bpm) * 1000;
    const msPerBar = msPerBeat * 4; // Assuming 4/4 time

    let currentTime = 0;

    bars.forEach((chordsInBar, barIdx) => {
      const barTimer = window.setTimeout(() => {
        if (!this.isPlaying) return;
        if (onBarChange) onBarChange(barIdx);

        const chordDurationMs = msPerBar / chordsInBar.length;
        chordsInBar.forEach((chordSymbol, chordIdx) => {
          const chordTimer = window.setTimeout(() => {
            if (!this.isPlaying) return;
            this.playChord(chordSymbol, chordDurationMs / 1000);
          }, chordIdx * chordDurationMs);
          this.activeTimers.push(chordTimer);
        });
      }, currentTime);

      this.activeTimers.push(barTimer);
      currentTime += msPerBar;
    });

    // End timer
    const totalTimer = window.setTimeout(() => {
      this.isPlaying = false;
      if (onBarChange) onBarChange(-1);
    }, currentTime);
    this.activeTimers.push(totalTimer);
  }

  private playChord(chordSymbol: string, durationSeconds: number) {
    if (!this.ctx) return;

    // Extract root
    const rootMatch = chordSymbol.match(/^([♭♯]?[ⅠⅡⅢⅣⅤⅥⅦ]|[A-G][♭♯]?)/);
    if (!rootMatch) return;

    const rootStr = rootMatch[1];
    let rootFreq = 261.63; // Default C4

    if (DEGREE_SEMITONES[rootStr] !== undefined) {
      const semitones = DEGREE_SEMITONES[rootStr];
      rootFreq = 261.63 * Math.pow(2, semitones / 12);
    } else if (NOTE_FREQS[rootStr]) {
      rootFreq = NOTE_FREQS[rootStr];
    }

    // Determine triad / 7th intervals
    let intervals = [0, 4, 7]; // Major triad by default

    if (chordSymbol.includes('m7-5') || chordSymbol.includes('m7(♭5)') || chordSymbol.includes('ø')) {
      intervals = [0, 3, 6, 10]; // Half diminished
    } else if (chordSymbol.includes('m7')) {
      intervals = [0, 3, 7, 10]; // Minor 7th
    } else if (chordSymbol.includes('m')) {
      intervals = [0, 3, 7]; // Minor triad
    } else if (chordSymbol.includes('Δ') || chordSymbol.includes('M7') || chordSymbol.includes('maj7')) {
      intervals = [0, 4, 7, 11]; // Major 7th
    } else if (chordSymbol.includes('7')) {
      intervals = [0, 4, 7, 10]; // Dominant 7th
    } else if (chordSymbol.includes('aug')) {
      intervals = [0, 4, 8];
    } else if (chordSymbol.includes('dim')) {
      intervals = [0, 3, 6];
    }

    // Play notes
    const now = this.ctx.currentTime;
    intervals.forEach(semitone => {
      if (!this.ctx) return;
      const freq = rootFreq * Math.pow(2, semitone / 12);
      
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      // Envelope: Soft attack, decay, release
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.15, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + durationSeconds - 0.05);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + durationSeconds);
    });
  }
}

export const audioPlayer = new ChordAudioPlayer();
