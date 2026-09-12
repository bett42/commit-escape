export interface ContributionDay {
  /** ISO date, e.g. "2026-09-12" */
  date: string;
  count: number;
}

export interface ContributionYear {
  username: string;
  totalContributions: number;
  /** 52-53 arrays of up to 7 days, as returned by the GitHub calendar */
  weeks: ContributionDay[][];
  /** true when data comes from HTML scraping (levels, not exact counts) */
  approximate: boolean;
}

export type RenderMode = 'landscape' | 'truchet' | 'sound';
