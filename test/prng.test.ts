import { describe, expect, it } from 'vitest';
import { fbm, hashString, mulberry32, valueNoise } from '../src/lib/prng';

describe('hashString', () => {
  it('is deterministic', () => {
    expect(hashString('octocat')).toBe(hashString('octocat'));
  });

  it('differs across inputs', () => {
    expect(hashString('octocat')).not.toBe(hashString('monalisa'));
  });
});

describe('mulberry32', () => {
  it('reproduces the same sequence for the same seed', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 100; i++) expect(a()).toBe(b());
  });

  it('stays in [0, 1)', () => {
    const rand = mulberry32(1);
    for (let i = 0; i < 1000; i++) {
      const v = rand();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('valueNoise / fbm', () => {
  it('is deterministic and bounded in [0, 1]', () => {
    for (let x = 0; x < 10; x += 0.37) {
      const v = valueNoise(99, x);
      expect(v).toBe(valueNoise(99, x));
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
      const f = fbm(99, x);
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThanOrEqual(1);
    }
  });

  it('is continuous across lattice boundaries', () => {
    const before = valueNoise(7, 2 - 1e-6);
    const after = valueNoise(7, 2 + 1e-6);
    expect(Math.abs(before - after)).toBeLessThan(0.001);
  });
});
