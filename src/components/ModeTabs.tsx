import type { RenderMode } from '../types';

interface Props {
  mode: RenderMode;
  onChange: (mode: RenderMode) => void;
}

const MODES: { id: RenderMode; label: string }[] = [
  { id: 'landscape', label: 'Landscape' },
  { id: 'truchet', label: 'Truchet' },
  { id: 'sound', label: 'Sound' },
];

export function ModeTabs({ mode, onChange }: Props) {
  return (
    <div className="segmented" role="tablist" aria-label="Render mode">
      {MODES.map((m) => (
        <button
          key={m.id}
          role="tab"
          aria-selected={mode === m.id}
          className={mode === m.id ? 'segment active' : 'segment'}
          onClick={() => onChange(m.id)}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
