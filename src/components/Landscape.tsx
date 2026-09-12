import type { RefObject } from 'react';
import type { LandscapeScene } from '../lib/landscape';

interface Props {
  scene: LandscapeScene;
  showOverlay: boolean;
  svgRef: RefObject<SVGSVGElement | null>;
}

const FONT_DISPLAY = "'Fraunces Variable', Georgia, serif";
const FONT_MONO = "'JetBrains Mono Variable', ui-monospace, monospace";

export function Landscape({ scene, showOverlay, svgRef }: Props) {
  const { palette, width, height } = scene;
  const stats = `${scene.totalContributions.toLocaleString('en-US')} contributions · last 12 months`;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`Procedural landscape generated from ${scene.username}'s GitHub contributions`}
      className="artwork-svg"
    >
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={palette.sky[0]} />
          <stop offset="55%" stopColor={palette.sky[1]} />
          <stop offset="100%" stopColor={palette.sky[2]} />
        </linearGradient>
        <radialGradient id="halo" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={palette.halo} stopOpacity="0.55" />
          <stop offset="100%" stopColor={palette.halo} stopOpacity="0" />
        </radialGradient>
        <linearGradient id="mist" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="0.09" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      <rect width={width} height={height} fill="url(#sky)" />

      {scene.stars.map((star, i) => (
        <circle key={i} cx={star.x} cy={star.y} r={star.r} fill="#ffffff" opacity={star.opacity} />
      ))}

      <circle cx={scene.body.cx} cy={scene.body.cy} r={scene.body.r * 3} fill="url(#halo)" />
      <circle cx={scene.body.cx} cy={scene.body.cy} r={scene.body.r} fill={palette.body} />

      {scene.birds.map((bird, i) => (
        <path
          key={i}
          d={`M 0 0 Q ${bird.size * 0.5} ${-bird.size * 0.75} ${bird.size} 0 Q ${bird.size * 1.5} ${-bird.size * 0.75} ${bird.size * 2} 0`}
          transform={`translate(${bird.x} ${bird.y}) scale(${bird.flip ? -1 : 1} 1)`}
          fill="none"
          stroke={palette.ridges[3]}
          strokeWidth={bird.size * 0.16}
          strokeLinecap="round"
          opacity="0.8"
        />
      ))}

      {scene.ridges.map((d, i) => (
        <g key={i}>
          <path d={d} fill={palette.ridges[i]} />
          {i < scene.mist.length && (
            <rect x="0" y={scene.mist[i] - 34} width={width} height="68" fill="url(#mist)" />
          )}
        </g>
      ))}

      {showOverlay && (
        <g>
          <text
            x="72"
            y={height - 118}
            fill={palette.ink}
            fontFamily={FONT_DISPLAY}
            fontStyle="italic"
            fontWeight="560"
            fontSize="76"
          >
            {scene.username}
          </text>
          <text
            x="74"
            y={height - 70}
            fill={palette.inkSoft}
            fontFamily={FONT_MONO}
            fontSize="21"
            letterSpacing="3.5"
          >
            {stats.toUpperCase()}
          </text>
        </g>
      )}
    </svg>
  );
}
