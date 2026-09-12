import type { ContributionDay, ContributionYear } from '../types';

const GRAPHQL_URL = 'https://api.github.com/graphql';

/**
 * Third-party CORS proxy used only in token-less mode. GitHub's contribution
 * fragment sends no CORS headers, so a direct browser fetch is impossible.
 * Nothing sensitive crosses this proxy: the URL it fetches is fully public.
 */
const CORS_PROXY = 'https://corsproxy.io/?url=';

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

/**
 * Token-less fallback: scrape the public contributions fragment through a
 * CORS proxy. Fragile by nature — GitHub can change the markup at any time —
 * and counts are quantized to levels 0-4 when the tooltip text is missing.
 */
export async function fetchViaScrape(username: string, signal?: AbortSignal): Promise<ContributionYear> {
  const target = `https://github.com/users/${encodeURIComponent(username)}/contributions`;
  let html: string;
  try {
    const response = await fetch(CORS_PROXY + encodeURIComponent(target), { signal });
    if (!response.ok) throw new Error(String(response.status));
    html = await response.text();
  } catch {
    throw new FetchError('network', 'The public-page fallback failed. A token is more reliable.');
  }

  const doc = new DOMParser().parseFromString(html, 'text/html');
  const cells = Array.from(doc.querySelectorAll<HTMLElement>('td[data-date]'));
  if (cells.length === 0) {
    throw new FetchError('not-found', `No public contribution data found for "${username}".`);
  }

  // Tooltips carry the exact counts ("12 contributions on ..."); index them by cell id.
  const countsByCellId = new Map<string, number>();
  for (const tip of Array.from(doc.querySelectorAll('tool-tip'))) {
    const forId = tip.getAttribute('for');
    const match = tip.textContent?.match(/([\d,]+)\s+contribution/);
    if (forId && match) countsByCellId.set(forId, Number(match[1].replace(/,/g, '')));
  }

  const days: ContributionDay[] = cells.map((cell) => {
    const date = cell.getAttribute('data-date') ?? '';
    const level = Number(cell.getAttribute('data-level') ?? 0);
    const exact = countsByCellId.get(cell.id);
    return { date, count: exact ?? level };
  });
  days.sort((a, b) => a.date.localeCompare(b.date));

  const weeks: ContributionDay[][] = [];
  for (const day of days) {
    const weekday = new Date(`${day.date}T00:00:00Z`).getUTCDay();
    if (weekday === 0 || weeks.length === 0) weeks.push([]);
    weeks[weeks.length - 1].push(day);
  }

  return {
    username,
    totalContributions: days.reduce((sum, d) => sum + d.count, 0),
    weeks,
    approximate: true,
  };
}

/** Token present -> GraphQL (exact). Otherwise -> scraping fallback (approximate). */
export function fetchContributions(username: string, token?: string, signal?: AbortSignal): Promise<ContributionYear> {
  return token ? fetchViaGraphql(username, token, signal) : fetchViaScrape(username, signal);
}
