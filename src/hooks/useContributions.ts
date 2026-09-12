import { useCallback, useRef, useState } from 'react';
import { getCached, setCached } from '../lib/cache';
import { FetchError, fetchContributions } from '../lib/github';
import type { ContributionYear } from '../types';

export type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface ContributionsState {
  status: LoadStatus;
  year: ContributionYear | null;
  error: string | null;
  /** where the data came from, for the small print under the artwork */
  source: 'cache' | 'graphql' | 'scrape' | null;
  /** true when a token-less attempt failed — the UI nudges toward the token field */
  suggestToken: boolean;
}

const INITIAL: ContributionsState = {
  status: 'idle',
  year: null,
  error: null,
  source: null,
  suggestToken: false,
};

function friendlyMessage(error: unknown): string {
  if (error instanceof FetchError) return error.message;
  return 'Something went wrong while talking to GitHub.';
}

export function useContributions() {
  const [state, setState] = useState<ContributionsState>(INITIAL);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async (username: string, token: string) => {
    const clean = username.trim();
    if (!clean) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState((prev) => ({ ...INITIAL, status: 'loading', year: prev.year }));

    const cached = await getCached(clean);
    if (cached) {
      setState({ ...INITIAL, status: 'ready', year: cached, source: 'cache' });
      return;
    }

    try {
      const year = await fetchContributions(clean, token || undefined, controller.signal);
      if (year.totalContributions === 0) {
        setState({
          ...INITIAL,
          status: 'error',
          error: `@${clean} has no public contributions in the last year.`,
          suggestToken: !token,
        });
        return;
      }
      void setCached(clean, year);
      setState({
        ...INITIAL,
        status: 'ready',
        year,
        source: token ? 'graphql' : 'scrape',
      });
    } catch (error) {
      if (controller.signal.aborted) return;
      setState({
        ...INITIAL,
        status: 'error',
        error: friendlyMessage(error),
        suggestToken: !token,
      });
    }
  }, []);

  return { state, load };
}
