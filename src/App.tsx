import { useMemo, useRef, useState } from 'react';
import { useContributions } from './hooks/useContributions';
import { buildLandscape } from './lib/landscape';
import { buildTruchet } from './lib/truchet';
import { getPalette } from './lib/palettes';
import { Landscape } from './components/Landscape';
import { Truchet } from './components/Truchet';
import { SoundPanel } from './components/SoundPanel';
import { SearchBar } from './components/SearchBar';
import { ModeTabs } from './components/ModeTabs';
import { PaletteSelector } from './components/PaletteSelector';
import { ExportButtons } from './components/ExportButtons';
import type { ContributionYear, RenderMode } from './types';

interface ArtworkProps {
  mode: RenderMode;
  year: ContributionYear;
  paletteId: string;
  showOverlay: boolean;
  svgRef: React.RefObject<SVGSVGElement | null>;
}

function Artwork({ mode, year, paletteId, showOverlay, svgRef }: ArtworkProps) {
  const palette = getPalette(paletteId);
  const landscape = useMemo(
    () => (mode === 'landscape' ? buildLandscape(year, palette) : null),
    [mode, year, palette],
  );
  const truchet = useMemo(() => (mode === 'truchet' ? buildTruchet(year) : null), [mode, year]);

  switch (mode) {
    case 'landscape':
      return landscape ? <Landscape scene={landscape} showOverlay={showOverlay} svgRef={svgRef} /> : null;
    case 'truchet':
      return truchet ? <Truchet scene={truchet} palette={palette} svgRef={svgRef} /> : null;
    case 'sound':
      return <SoundPanel year={year} />;
    default: {
      const exhaustive: never = mode;
      return exhaustive;
    }
  }
}

const SOURCE_LABEL = {
  cache: 'from your local cache',
  graphql: 'exact, via the GitHub GraphQL API',
  scrape: 'via public mirrors, no token',
} as const;

export default function App() {
  const { state, load } = useContributions();
  const [mode, setMode] = useState<RenderMode>('landscape');
  const [paletteId, setPaletteId] = useState('dawn');
  const [showOverlay, setShowOverlay] = useState(true);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const { year, status } = state;
  // keep the studio visible while re-fetching another user
  const ready = year !== null;

  return (
    <div className="app">
      <header className="site-header">
        <a
          className="wordmark"
          href="/"
          onClick={(e) => {
            e.preventDefault();
            window.location.assign('/');
          }}
        >
          commit-scape
        </a>
        <div className="header-right">
          <span className="header-note">100% client-side</span>
          <a
            className="github-link"
            href="https://github.com/bett42/commit-scape"
            target="_blank"
            rel="noreferrer"
            aria-label="Source code on GitHub"
            title="Source on GitHub"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
              <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
            </svg>
          </a>
        </div>
      </header>

      <main>
        {!ready && (
          <section className={status === 'loading' ? 'hero dimmed' : 'hero'}>
            <h1>
              Your commits,
              <br />
              as a <em>landscape</em>.
            </h1>
            <p className="tagline">
              commit-scape turns a year of GitHub contributions into generative art - a procedural
              mountain range, a Truchet pattern, or a piece of music. Nothing leaves your browser.
            </p>
            <SearchBar
              loading={status === 'loading'}
              suggestToken={state.suggestToken}
              onSubmit={load}
            />
            {state.error && <p className="error-line">{state.error}</p>}
          </section>
        )}

        {ready && (
          <section className="studio">
            <div className="studio-bar">
              <SearchBar
                loading={status === 'loading'}
                suggestToken={state.suggestToken}
                onSubmit={load}
              />
            </div>

            <div className="controls">
              <ModeTabs mode={mode} onChange={setMode} />
              {mode !== 'sound' && <PaletteSelector active={paletteId} onChange={setPaletteId} />}
              {mode === 'landscape' && (
                <label className="overlay-toggle">
                  <input
                    type="checkbox"
                    checked={showOverlay}
                    onChange={(e) => setShowOverlay(e.target.checked)}
                  />
                  <span>Caption</span>
                </label>
              )}
              {mode !== 'sound' && (
                <ExportButtons svgRef={svgRef} username={year.username} mode={mode} />
              )}
            </div>

            <figure className={mode === 'sound' ? 'frame frame-sound' : 'frame'}>
              <Artwork
                mode={mode}
                year={year}
                paletteId={paletteId}
                showOverlay={showOverlay}
                svgRef={svgRef}
              />
            </figure>

            <p className="caption">
              <strong>@{year.username}</strong> - {year.totalContributions.toLocaleString('en-US')}{' '}
              contributions in the last 12 months · data {SOURCE_LABEL[state.source ?? 'graphql']}
              {year.approximate && ' (levels 0–4, not exact counts)'}
            </p>
            {state.error && <p className="error-line">{state.error}</p>}
          </section>
        )}
      </main>

      <footer className="site-footer">
        <span>commit-scape - generative art from your GitHub graph.</span>
        <span>Your token is used only from this tab and never stored.</span>
      </footer>
    </div>
  );
}
