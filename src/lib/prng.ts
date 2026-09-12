/**
 * Deterministic pseudo-random utilities.
 *
 * Everything visual in commit-scape derives from the username, so the same
 * person always gets the same artwork unless their commits change.
 */

/** FNV-1a 32-bit hash of a string. */
export function hashString(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** mulberry32: small, fast, seedable PRNG returning floats in [0, 1). */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Smoothstep interpolation between two lattice values. */
function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

/** Hash of an integer lattice coordinate into [0, 1). */
function lattice(seed: number, x: number): number {
  let h = seed ^ Math.imul(x, 0x27d4eb2d);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/**
 * 1D value noise in [0, 1). Continuous and deterministic for a given seed.
 * `x` is a real coordinate; integer crossings hit the lattice values.
 */
export function valueNoise(seed: number, x: number): number {
  const x0 = Math.floor(x);
  const t = smooth(x - x0);
  return lattice(seed, x0) * (1 - t) + lattice(seed, x0 + 1) * t;
}

/** Fractal noise: a few octaves of value noise, normalized to [0, 1). */
export function fbm(seed: number, x: number, octaves = 3): number {
  let sum = 0;
  let amp = 0.5;
  let freq = 1;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * valueNoise(seed + i * 101, x * freq);
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / norm;
}
