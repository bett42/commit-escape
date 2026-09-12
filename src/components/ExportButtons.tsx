import { useState, type RefObject } from 'react';
import { downloadBlob, serializeSvg, svgToPng } from '../lib/export';

interface Props {
  svgRef: RefObject<SVGSVGElement | null>;
  username: string;
  mode: string;
}

const PNG_WIDTH = 2400;
const PNG_HEIGHT = 1350;

export function ExportButtons({ svgRef, username, mode }: Props) {
  const [busy, setBusy] = useState<'png' | 'svg' | null>(null);
  const [failed, setFailed] = useState(false);

  const run = async (kind: 'png' | 'svg') => {
    const svg = svgRef.current;
    if (!svg || busy) return;
    setBusy(kind);
    setFailed(false);
    try {
      const base = `commit-scape-${username}-${mode}`;
      if (kind === 'png') {
        downloadBlob(await svgToPng(svg, PNG_WIDTH, PNG_HEIGHT), `${base}.png`);
      } else {
        const markup = await serializeSvg(svg);
        downloadBlob(new Blob([markup], { type: 'image/svg+xml' }), `${base}.svg`);
      }
    } catch {
      setFailed(true);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="export-buttons">
      <button className="btn-ghost" onClick={() => run('png')} disabled={busy !== null}>
        {busy === 'png' ? 'Rendering…' : 'PNG'}
      </button>
      <button className="btn-ghost" onClick={() => run('svg')} disabled={busy !== null}>
        {busy === 'svg' ? 'Saving…' : 'SVG'}
      </button>
      {failed && <span className="export-error">Export failed</span>}
    </div>
  );
}
