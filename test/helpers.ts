import type { ContributionYear } from '../src/types';

/** Build a fake contribution year from weekly count rows. */
export function makeYear(weeks: number[][], username = 'octocat'): ContributionYear {
  let day = 0;
  return {
    username,
    totalContributions: weeks.flat().reduce((a, b) => a + b, 0),
    weeks: weeks.map((week) =>
      week.map((count) => ({
        date: `2026-01-${String((day++ % 28) + 1).padStart(2, '0')}`,
        count,
      })),
    ),
    approximate: false,
  };
}

/** 53 weeks of pseudo-varied counts. */
export function variedWeeks(seed = 7): number[][] {
  const weeks: number[][] = [];
  let x = seed;
  for (let w = 0; w < 53; w++) {
    const week: number[] = [];
    for (let d = 0; d < 7; d++) {
      x = (x * 16807) % 2147483647;
      week.push(x % 15);
    }
    weeks.push(week);
  }
  return weeks;
}
