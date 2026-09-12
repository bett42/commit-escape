import type { RefObject } from 'react';
import type { TruchetScene } from '../lib/truchet';
import type { Palette } from '../lib/palettes';

interface Props {
  scene: TruchetScene;
  palette: Palette;
  svgRef: RefObject<SVGSVGElement | null>;
}

/** Classic Smith tile: two quarter-circle arcs joining edge midpoints. */
function tilePath(cell: number): string {
  const h = cell / 2;
  return `M 0 ${h} A ${h} ${h} 0 0 1 ${h} 0 M ${cell} ${h} A ${h} ${h} 0 0 1 ${h} ${cell}`;
}

export function Truchet({ scene, palette, svgRef }: Props) {
  const d = tilePath(scene.cell);
  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 1600 900`}
      role="img"
      aria-label="Truchet pattern generated from GitHub contributions"
      className="artwork-svg"
    >
      <rect width="1600" height="900" fill={palette.ridges[3]} />
      {scene.tiles.map((tile, i) => (
        <path
          key={i}
          d={d}
          transform={`translate(${tile.x} ${tile.y}) rotate(${tile.rotation * 90} ${scene.cell / 2} ${scene.cell / 2})`}
          fill="none"
          stroke={palette.body}
          strokeWidth={scene.cell * (0.1 + 0.22 * tile.level)}
          strokeLinecap="round"
          opacity={0.1 + 0.9 * tile.level}
        >
          <title>{`${tile.date}: ${tile.level.toFixed(2)}`}</title>
        </path>
      ))}
    </svg>
  );
}
