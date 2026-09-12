import type { ContributionDay, ContributionYear } from '../types';

const GRAPHQL_URL = 'https://api.github.com/graphql';

/**
 * Third-party CORS proxies used only in token-less mode. GitHub's contribution
 * fragment sends no CORS headers, so a direct browser fetch is impossible.
 * Nothing sensitive crosses these proxies: the URL they fetch is fully public.
 * They are tried in order — any one of them being down should not break the app.
 */
const CORS_PROXIES = [
  (url: string) => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
];

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

/**
 * Token-less fallback: scrape the public contributions fragment through
 * whatever CORS proxy answers first. Fragile by nature — GitHub can change
 * the markup at any time.
 */
export async function fetchViaScrape(username: string, signal?: AbortSignal): Promise<ContributionYear> {
  const target = `https://github.com/users/${encodeURIComponent(username)}/contributions`;

  let parsed: ScrapedCalendar | null = null;
  for (const proxied of CORS_PROXIES) {
    try {
      const response = await fetch(proxied(target), { signal });
      if (!response.ok) continue;
      parsed = parseContributionsHtml(await response.text());
      if (parsed) break;
    } catch {
      // try the next proxy
    }
  }
  if (!parsed) {
    throw new FetchError(
      'network',
      'The public-page fallback failed through every proxy. Add a token for reliable data.',
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
