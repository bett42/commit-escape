import { describe, expect, it } from 'vitest';
import { buildLandscape, normalize, smoothPath, weeklyTotals } from '../src/lib/landscape';
import { getPalette } from '../src/lib/palettes';
import { makeYear, variedWeeks } from './helpers';

describe('weeklyTotals', () => {
  it('sums each week', () => {
    const year = makeYear([
      [1, 2, 3, 4, 5, 6, 7],
      [0, 0, 0, 0, 0, 0, 0],
    ]);
    expect(weeklyTotals(year)).toEqual([28, 0]);
  });
});

describe('normalize', () => {
  it('scales by the max value', () => {
    expect(normalize([0, 5, 10])).toEqual([0, 0.5, 1]);
  });

  it('keeps an all-zero series at zero', () => {
    expect(normalize([0, 0, 0])).toEqual([0, 0, 0]);
  });
});

describe('smoothPath', () => {
  it('produces a cubic bezier path', () => {
    const d = smoothPath([
      { x: 0, y: 0 },
      { x: 10, y: 5 },
      { x: 20, y: 0 },
    ]);
    expect(d).toMatch(/^M /);
    expect(d).toContain('C ');
  });
});

describe('buildLandscape', () => {
  const palette = getPalette('night');

  it('is deterministic: same input, same scene', () => {
    const year = makeYear(variedWeeks(), 'octocat');
    expect(buildLandscape(year, palette)).toEqual(buildLandscape(year, palette));
  });

  it('changes with the username seed', () => {
    const a = buildLandscape(makeYear(variedWeeks(), 'octocat'), palette);
    const b = buildLandscape(makeYear(variedWeeks(), 'monalisa'), palette);
    expect(a.ridges).not.toEqual(b.ridges);
  });

  it('changes with the commit data', () => {
    const a = buildLandscape(makeYear(variedWeeks(7), 'octocat'), palette);
    const b = buildLandscape(makeYear(variedWeeks(1234), 'octocat'), palette);
    expect(a.ridges[3]).not.toBe(b.ridges[3]);
  });

  it('renders four ridge layers and respects palette features', () => {
    const scene = buildLandscape(makeYear(variedWeeks()), palette);
    expect(scene.ridges).toHaveLength(4);
    expect(scene.stars.length).toBeGreaterThan(0); // night palette
    expect(buildLandscape(makeYear(variedWeeks()), getPalette('dawn')).stars).toHaveLength(0);
  });

  it('handles a year with zero contributions', () => {
    const zeros = Array.from({ length: 53 }, () => Array(7).fill(0));
    const scene = buildLandscape(makeYear(zeros), palette);
    expect(scene.ridges).toHaveLength(4);
    for (const d of scene.ridges) expect(d).toMatch(/^M .* Z$/);
  });
});
