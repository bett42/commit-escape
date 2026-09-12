import { fbm, hashString, mulberry32 } from './prng';
import type { Palette } from './palettes';
import type { ContributionYear } from '../types';

export const ART_WIDTH = 1600;
export const ART_HEIGHT = 900;

export interface Star {
  x: number;
  y: number;
  r: number;
  opacity: number;
}

export interface Bird {
  x: number;
  y: number;
  size: number;
  flip: boolean;
}

export interface LandscapeScene {
  width: number;
  height: number;
  palette: Palette;
  body: { cx: number; cy: number; r: number };
  stars: Star[];
  birds: Bird[];
  /** Ridge silhouette paths, back to front */
  ridges: string[];
  /** Vertical positions of the mist bands between ridges */
  mist: number[];
  totalContributions: number;
  username: string;
}

/** Sum each week's 7 days into a single intensity value. */
export function weeklyTotals(year: ContributionYear): number[] {
  return year.weeks.map((week) => week.reduce((sum, day) => sum + day.count, 0));
}

/** Scale values into [0, 1] using the max as reference. All-zero input stays zero. */
export function normalize(values: number[]): number[] {
  const max = Math.max(...values, 0);
  if (max === 0) return values.map(() => 0);
  return values.map((v) => v / max);
}

interface Point {
  x: number;
  y: number;
}

/** Catmull-Rom spline converted to cubic Bézier segments. */
export function smoothPath(points: Point[]): string {
  if (points.length < 2) return '';
  let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return d;
}

/** Linear interpolation over the weekly series at position t in [0, 1]. */
function sampleWeekly(weekly: number[], t: number): number {
  if (weekly.length === 0) return 0;
  const pos = t * (weekly.length - 1);
  const i = Math.min(Math.floor(pos), weekly.length - 2);
  const frac = pos - i;
  return weekly[i] * (1 - frac) + weekly[i + 1] * frac;
}

const LAYER_COUNT = 4;
/** How much the real data shapes each layer (back layers are mostly noise) */
const DATA_MIX = [0.3, 0.5, 0.72, 0.95];
const BASELINES = [0.5, 0.615, 0.73, 0.845];
const AMPLITUDES = [0.2, 0.24, 0.28, 0.3];
const NOISE_FREQ = [2.2, 3.0, 3.8, 4.6];

function ridgePath(weekly: number[], layer: number, seed: number): string {
  const mix = DATA_MIX[layer];
  const baseline = ART_HEIGHT * BASELINES[layer];
  const amp = ART_HEIGHT * AMPLITUDES[layer];
  const freq = NOISE_FREQ[layer];
  const noiseSeed = seed + layer * 7919;

  const samples = Math.max(weekly.length * 2, 24);
  const points: Point[] = [];
  for (let i = -1; i <= samples; i++) {
    const t = i / (samples - 1);
    const data = sampleWeekly(weekly, Math.min(Math.max(t, 0), 1));
    const noise = fbm(noiseSeed, t * freq, 3);
    const v = mix * data + (1 - mix) * noise;
    points.push({ x: t * ART_WIDTH, y: baseline - v * amp });
  }

  const line = smoothPath(points);
  const last = points[points.length - 1];
  const first = points[0];
  return `${line} L ${last.x.toFixed(2)} ${ART_HEIGHT + 4} L ${first.x.toFixed(2)} ${ART_HEIGHT + 4} Z`;
}

/**
 * Build the full scene model for a year's contributions.
 * Deterministic: same username + same data always yields the same scene.
 */
export function buildLandscape(year: ContributionYear, palette: Palette): LandscapeScene {
  const seed = hashString(year.username.trim().toLowerCase());
  const rand = mulberry32(seed);
  const weekly = normalize(weeklyTotals(year));

  const body = {
    cx: ART_WIDTH * (0.22 + 0.56 * rand()),
    cy: ART_HEIGHT * (0.15 + 0.13 * rand()),
    r: 44 + 26 * rand(),
  };

  const stars: Star[] = [];
  if (palette.stars) {
    const count = 70 + Math.floor(rand() * 40);
    for (let i = 0; i < count; i++) {
      stars.push({
        x: rand() * ART_WIDTH,
        y: rand() * ART_HEIGHT * 0.55,
        r: 0.6 + rand() * 1.3,
        opacity: 0.25 + rand() * 0.65,
      });
    }
  }

  const birds: Bird[] = [];
  if (palette.birds) {
    const count = 3 + Math.floor(rand() * 4);
    for (let i = 0; i < count; i++) {
      birds.push({
        x: ART_WIDTH * (0.1 + 0.8 * rand()),
        y: ART_HEIGHT * (0.18 + 0.22 * rand()),
        size: 9 + rand() * 8,
        flip: rand() > 0.5,
      });
    }
  }

  const ridges = [];
  for (let layer = 0; layer < LAYER_COUNT; layer++) {
    ridges.push(ridgePath(weekly, layer, seed));
  }

  return {
    width: ART_WIDTH,
    height: ART_HEIGHT,
    palette,
    body,
    stars,
    birds,
    ridges,
    mist: [ART_HEIGHT * 0.585, ART_HEIGHT * 0.705],
    totalContributions: year.totalContributions,
    username: year.username,
  };
}
