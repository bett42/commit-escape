import { hashString, mulberry32 } from './prng';
import { ART_WIDTH, ART_HEIGHT, normalize } from './landscape';
import type { ContributionYear } from '../types';

export interface TruchetTile {
  x: number;
  y: number;
  /** 0 | 1 | 2 | 3 — quarter turns */
  rotation: number;
  /** normalized intensity 0..1 */
  level: number;
  date: string;
}

export interface TruchetScene {
  cols: number;
  rows: number;
  cell: number;
  offsetX: number;
  offsetY: number;
  tiles: TruchetTile[];
}

/**
 * Lay every day of the calendar out as a grid of Truchet tiles.
 * Rotation comes from a seeded hash of the date; intensity from commits.
 */
export function buildTruchet(year: ContributionYear): TruchetScene {
  const days = year.weeks.flat();
  const seed = hashString(year.username.trim().toLowerCase());
  const rand = mulberry32(seed ^ 0x9e3779b9);

  const counts = normalize(days.map((d) => d.count));

  const cols = Math.ceil(Math.sqrt((days.length * ART_WIDTH) / ART_HEIGHT));
  const rows = Math.ceil(days.length / cols);
  const cell = Math.min(ART_WIDTH / cols, ART_HEIGHT / rows);
  const offsetX = (ART_WIDTH - cols * cell) / 2;
  const offsetY = (ART_HEIGHT - rows * cell) / 2;

  const tiles: TruchetTile[] = days.map((day, i) => ({
    x: offsetX + (i % cols) * cell,
    y: offsetY + Math.floor(i / cols) * cell,
    rotation: Math.floor(rand() * 4),
    level: counts[i],
    date: day.date,
  }));

  return { cols, rows, cell, offsetX, offsetY, tiles };
}
