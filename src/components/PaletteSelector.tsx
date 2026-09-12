import { PALETTES } from '../lib/palettes';

interface Props {
  active: string;
  onChange: (id: string) => void;
}

export function PaletteSelector({ active, onChange }: Props) {
  return (
    <div className="swatches" role="radiogroup" aria-label="Color palette">
      {PALETTES.map((palette) => (
        <button
          key={palette.id}
          role="radio"
          aria-checked={active === palette.id}
          title={palette.label}
          className={active === palette.id ? 'swatch active' : 'swatch'}
          style={{
            background: `linear-gradient(160deg, ${palette.sky[0]} 0%, ${palette.sky[1]} 55%, ${palette.sky[2]} 100%)`,
          }}
          onClick={() => onChange(palette.id)}
        >
          <span className="swatch-dot" style={{ background: palette.body }} />
        </button>
      ))}
    </div>
  );
}
