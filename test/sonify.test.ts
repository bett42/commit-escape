import { describe, expect, it } from 'vitest';
import { SCALE, buildSequence, noteForLevel, sequenceDuration, stepDuration } from '../src/lib/sonify';
import { makeYear, variedWeeks } from './helpers';

describe('noteForLevel', () => {
  it('always returns a note from the scale', () => {
    for (let i = 0; i <= 100; i++) {
      expect(SCALE).toContain(noteForLevel(i / 100));
    }
  });

  it('clamps out-of-range input', () => {
    expect(noteForLevel(-1)).toBe(SCALE[0]);
    expect(noteForLevel(2)).toBe(SCALE[SCALE.length - 1]);
  });

  it('maps monotonically upward', () => {
    const notes = [0, 0.25, 0.5, 0.75, 1].map((l) => SCALE.indexOf(noteForLevel(l) as (typeof SCALE)[number]));
    for (let i = 1; i < notes.length; i++) expect(notes[i]).toBeGreaterThanOrEqual(notes[i - 1]);
  });
});

describe('buildSequence', () => {
  it('produces one step per week, spaced by the tempo', () => {
    const year = makeYear(variedWeeks());
    const bpm = 120;
    const seq = buildSequence(year, bpm);
    expect(seq).toHaveLength(53);
    expect(seq[1].time - seq[0].time).toBeCloseTo(stepDuration(bpm));
    for (const step of seq) {
      expect(SCALE).toContain(step.note);
      expect(step.velocity).toBeGreaterThan(0);
      expect(step.velocity).toBeLessThanOrEqual(1);
    }
  });

  it('gives busier weeks higher notes and louder velocity', () => {
    const quiet = makeYear([Array(7).fill(0)]);
    const busy = makeYear([Array(7).fill(20)]);
    const [q] = buildSequence(quiet, 120);
    const [b] = buildSequence(busy, 120);
    expect(SCALE.indexOf(b.note as (typeof SCALE)[number])).toBeGreaterThan(
      SCALE.indexOf(q.note as (typeof SCALE)[number]),
    );
    expect(b.velocity).toBeGreaterThan(q.velocity);
  });
});

describe('sequenceDuration', () => {
  it('covers the last note plus a release tail', () => {
    const seq = buildSequence(makeYear(variedWeeks()), 120);
    const last = seq[seq.length - 1];
    expect(sequenceDuration(seq, 120)).toBeGreaterThan(last.time + stepDuration(120));
  });

  it('is zero for an empty sequence', () => {
    expect(sequenceDuration([], 120)).toBe(0);
  });
});
