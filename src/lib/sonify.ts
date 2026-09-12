import { weeklyTotals, normalize } from './landscape';
import type { ContributionYear } from '../types';

/**
 * A minor pentatonic across three octaves. Pentatonic scales have no
 * dissonant intervals, so any data sequence sounds intentional.
 */
export const SCALE = [
  'A2', 'C3', 'D3', 'E3', 'G3',
  'A3', 'C4', 'D4', 'E4', 'G4',
  'A4', 'C5', 'D5', 'E5', 'G5',
  'A5',
] as const;

export interface NoteStep {
  note: string;
  /** start time in seconds */
  time: number;
  /** 0..1 */
  velocity: number;
  /** normalized intensity that produced this step */
  level: number;
}

/** Map a normalized intensity in [0, 1] to a note on the scale. */
export function noteForLevel(level: number, scale: readonly string[] = SCALE): string {
  const clamped = Math.min(Math.max(level, 0), 1);
  const index = Math.min(Math.floor(clamped * scale.length), scale.length - 1);
  return scale[index];
}

/** Seconds per step: one quarter note per week. */
export function stepDuration(bpm: number): number {
  return 60 / bpm;
}

/**
 * Turn a year of contributions into a note sequence: one note per week,
 * pitch and velocity follow the normalized intensity.
 */
export function buildSequence(year: ContributionYear, bpm: number): NoteStep[] {
  const weekly = normalize(weeklyTotals(year));
  const step = stepDuration(bpm);
  return weekly.map((level, i) => ({
    note: noteForLevel(level),
    time: i * step,
    velocity: 0.3 + 0.7 * level,
    level,
  }));
}

/** Total render duration including a tail for the last note's release. */
export function sequenceDuration(sequence: NoteStep[], bpm: number): number {
  if (sequence.length === 0) return 0;
  return sequence[sequence.length - 1].time + stepDuration(bpm) + 1.4;
}
