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
        <span className="wordmark">commit-scape</span>
        <span className="header-note">100% client-side</span>
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
              commit-scape turns a year of GitHub contributions into generative art — a procedural
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
              <strong>@{year.username}</strong> — {year.totalContributions.toLocaleString('en-US')}{' '}
              contributions in the last 12 months · data {SOURCE_LABEL[state.source ?? 'graphql']}
              {year.approximate && ' (levels 0–4, not exact counts)'}
            </p>
            {state.error && <p className="error-line">{state.error}</p>}
          </section>
        )}
      </main>

      <footer className="site-footer">
        <span>commit-scape — generative art from your GitHub graph.</span>
        <span>Your token is used only from this tab and never stored.</span>
      </footer>
    </div>
  );
}
