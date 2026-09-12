import type { ContributionDay, ContributionYear } from '../types';

const GRAPHQL_URL = 'https://api.github.com/graphql';

/**
 * Token-less mode reads only fully public data, from several sources raced
 * in parallel — any one of them answering is enough:
 *
 * 1. a community mirror of the contribution calendar (JSON, CORS-enabled)
 * 2. third-party CORS proxies fronting the public github.com fragment
 *
 * Nothing sensitive crosses these services: no token is ever involved here.
 */
const MIRROR_URL = (username: string) =>
  `https://github-contributions-api.jogruber.de/v4/${encodeURIComponent(username)}?y=last`;

const CORS_PROXIES = [
  (url: string) => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
];

/** Per-source timeout so one hanging service can't stall the others. */
const SOURCE_TIMEOUT_MS = 9000;

const CALENDAR_QUERY = `query($username: String!) {
  user(login: $username) {
    contributionsCollection {
      contributionCalendar {
        totalContributions
        weeks {
          contributionDays {
            date
            contributionCount
          }
        }
      }
    }
  }
}`;

export type FetchErrorCode = 'not-found' | 'unauthorized' | 'no-data' | 'network';

export class FetchError extends Error {
  code: FetchErrorCode;
  constructor(code: FetchErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

interface GraphqlDay {
  date: string;
  contributionCount: number;
}

interface GraphqlResponse {
  data?: {
    user: null | {
      contributionsCollection: {
        contributionCalendar: {
          totalContributions: number;
          weeks: { contributionDays: GraphqlDay[] }[];
        };
      };
    };
  };
  errors?: { message: string }[];
}

/** Fetch the contribution calendar through the official GraphQL API. */
export async function fetchViaGraphql(
  username: string,
  token: string,
  signal?: AbortSignal,
): Promise<ContributionYear> {
  let response: Response;
  try {
    response = await fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ query: CALENDAR_QUERY, variables: { username } }),
      signal,
    });
  } catch {
    throw new FetchError('network', 'Could not reach the GitHub API.');
  }

  if (response.status === 401 || response.status === 403) {
    throw new FetchError('unauthorized', 'GitHub rejected the token. Check it and try again.');
  }
  if (!response.ok) {
    throw new FetchError('network', `GitHub answered with status ${response.status}.`);
  }

  const json = (await response.json()) as GraphqlResponse;
  if (json.errors?.length) {
    const message = json.errors[0].message;
    if (/could not resolve to a user/i.test(message)) {
      throw new FetchError('not-found', `No GitHub user named "${username}".`);
    }
    throw new FetchError('network', message);
  }
  const calendar = json.data?.user?.contributionsCollection.contributionCalendar;
  if (!calendar) {
    throw new FetchError('not-found', `No GitHub user named "${username}".`);
  }

  return {
    username,
    totalContributions: calendar.totalContributions,
    weeks: calendar.weeks.map((week) =>
      week.contributionDays.map((day): ContributionDay => ({ date: day.date, count: day.contributionCount })),
    ),
    approximate: false,
  };
}

export interface ScrapedDay extends ContributionDay {
  /** 0 = Sunday, from the cell id */
  weekday: number;
  /** column index in the calendar grid, from the cell id */
  week: number;
}

export interface ScrapedCalendar {
  days: ScrapedDay[];
  total: number;
  /** true when at least one day fell back to its 0-4 level instead of an exact count */
  approximate: boolean;
}

/**
 * Parse the public contributions fragment. Pure string matching (no DOMParser)
 * so it stays testable outside a browser.
 *
 * Real markup, as served by github.com:
 *   <td ... data-date="2026-09-10" id="contribution-day-component-4-52" data-level="1" ...>
 *   <tool-tip ... for="contribution-day-component-4-52" ...>8 contributions on ...</tool-tip>
 * The cell id encodes {weekday}-{week}, which also gives the week grouping.
 */
export function parseContributionsHtml(html: string): ScrapedCalendar | null {
  const countsByCellId = new Map<string, number>();
  const tooltipRe = /<tool-tip\b[^>]*?\bfor="([^"]+)"[^>]*>([\s\S]*?)<\/tool-tip>/g;
  for (const match of html.matchAll(tooltipRe)) {
    const text = match[2];
    const count = text.match(/([\d,]+)\s+contribution/);
    if (count) countsByCellId.set(match[1], Number(count[1].replace(/,/g, '')));
    else if (/No contributions/.test(text)) countsByCellId.set(match[1], 0);
  }

  const days: ScrapedDay[] = [];
  let approximate = false;
  const cellRe = /<td\b[^>]*>/g;
  for (const match of html.matchAll(cellRe)) {
    const tag = match[0];
    const date = tag.match(/\bdata-date="(\d{4}-\d{2}-\d{2})"/)?.[1];
    const id = tag.match(/\bid="(contribution-day-component-(\d+)-(\d+))"/);
    if (!date || !id) continue;
    const exact = countsByCellId.get(id[1]);
    const level = Number(tag.match(/\bdata-level="(\d+)"/)?.[1] ?? 0);
    if (exact === undefined) approximate = true;
    days.push({
      date,
      count: exact ?? level,
      weekday: Number(id[2]),
      week: Number(id[3]),
    });
  }
  if (days.length === 0) return null;

  days.sort((a, b) => a.week - b.week || a.weekday - b.weekday);

  const totalMatch = html.match(/([\d,]+)\s+contributions\s+in the last year/);
  const total = totalMatch
    ? Number(totalMatch[1].replace(/,/g, ''))
    : days.reduce((sum, d) => sum + d.count, 0);

  return { days, total, approximate };
}

interface MirrorJson {
  total?: { lastYear?: unknown };
  contributions?: { date?: unknown; count?: unknown }[];
}

/** Parse the mirror's JSON shape into calendar days, grouping by calendar week. */
export function parseContributionsJson(json: unknown): ScrapedCalendar | null {
  const data = json as MirrorJson;
  if (!data || !Array.isArray(data.contributions)) return null;
  const total = data.total?.lastYear;
  if (typeof total !== 'number') return null;

  const days: ScrapedDay[] = [];
  for (const entry of data.contributions) {
    if (typeof entry.date !== 'string' || typeof entry.count !== 'number') return null;
    days.push({
      date: entry.date,
      count: entry.count,
      weekday: new Date(`${entry.date}T00:00:00Z`).getUTCDay(),
      week: 0,
    });
  }
  if (days.length === 0) return null;

  days.sort((a, b) => a.date.localeCompare(b.date));
  let week = 0;
  for (let i = 0; i < days.length; i++) {
    if (i > 0 && days[i].weekday === 0) week++;
    days[i].week = week;
  }
  return { days, total, approximate: false };
}

/** Resolve with the first non-null result, or null once every source failed. */
function firstSuccess(tasks: (() => Promise<ScrapedCalendar | null>)[]): Promise<ScrapedCalendar | null> {
  return new Promise((resolve) => {
    let pending = tasks.length;
    for (const task of tasks) {
      task()
        .then((result) => {
          if (result) resolve(result);
        })
        .catch(() => {
          // a failed source just leaves the race
        })
        .finally(() => {
          if (--pending === 0) resolve(null);
        });
    }
  });
}

async function fetchJsonSource(username: string, signal?: AbortSignal): Promise<ScrapedCalendar | null> {
  const combined = AbortSignal.any([signal ?? new AbortController().signal, AbortSignal.timeout(SOURCE_TIMEOUT_MS)]);
  const response = await fetch(MIRROR_URL(username), { signal: combined });
  if (response.status === 404) {
    throw new FetchError('not-found', `No GitHub user named "${username}".`);
  }
  if (!response.ok) return null;
  return parseContributionsJson(await response.json());
}

async function fetchHtmlSource(username: string, proxied: (url: string) => string, signal?: AbortSignal): Promise<ScrapedCalendar | null> {
  const combined = AbortSignal.any([signal ?? new AbortController().signal, AbortSignal.timeout(SOURCE_TIMEOUT_MS)]);
  const target = `https://github.com/users/${encodeURIComponent(username)}/contributions`;
  const response = await fetch(proxied(target), { signal: combined });
  if (!response.ok) return null;
  return parseContributionsHtml(await response.text());
}

/**
 * Token-less fallback: race the public mirror and the CORS proxies, first
 * good answer wins. Fragile by nature — GitHub can change its markup and
 * third-party services can rate-limit — so the token path stays recommended.
 */
export async function fetchViaScrape(username: string, signal?: AbortSignal): Promise<ContributionYear> {
  let sawNotFound = false;
  const sources = [
    () =>
      fetchJsonSource(username, signal).catch((error: unknown) => {
        if (error instanceof FetchError && error.code === 'not-found') sawNotFound = true;
        return null;
      }),
    ...CORS_PROXIES.map(
      (proxied) => () => fetchHtmlSource(username, proxied, signal).catch(() => null),
    ),
  ];

  const parsed = await firstSuccess(sources);
  if (!parsed) {
    if (sawNotFound) throw new FetchError('not-found', `No GitHub user named "${username}".`);
    throw new FetchError(
      'network',
      'Every public data source failed right now. Add a token for reliable data.',
    );
  }

  const weeks: ContributionDay[][] = [];
  for (const day of parsed.days) {
    (weeks[day.week] ??= []).push({ date: day.date, count: day.count });
  }

  return {
    username,
    totalContributions: parsed.total,
    weeks: weeks.filter((week) => week.length > 0),
    approximate: parsed.approximate,
  };
}

/** Token present -> GraphQL (exact). Otherwise -> scraping fallback (approximate). */
export function fetchContributions(username: string, token?: string, signal?: AbortSignal): Promise<ContributionYear> {
  return token ? fetchViaGraphql(username, token, signal) : fetchViaScrape(username, signal);
}
