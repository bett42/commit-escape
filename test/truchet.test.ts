import { describe, expect, it } from 'vitest';
import { buildTruchet } from '../src/lib/truchet';
import { makeYear, variedWeeks } from './helpers';

describe('buildTruchet', () => {
  const year = makeYear(variedWeeks());

  it('lays out one tile per day', () => {
    const scene = buildTruchet(year);
    expect(scene.tiles).toHaveLength(53 * 7);
  });

  it('keeps levels and rotations in range', () => {
    const scene = buildTruchet(year);
    for (const tile of scene.tiles) {
      expect(tile.level).toBeGreaterThanOrEqual(0);
      expect(tile.level).toBeLessThanOrEqual(1);
      expect(tile.rotation).toBeGreaterThanOrEqual(0);
      expect(tile.rotation).toBeLessThanOrEqual(3);
    }
  });

  it('is deterministic for the same username', () => {
    expect(buildTruchet(year)).toEqual(buildTruchet(makeYear(variedWeeks())));
  });
});
