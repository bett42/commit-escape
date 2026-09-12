export interface Palette {
  id: string;
  label: string;
  /** Sky gradient, top to bottom */
  sky: [string, string, string];
  /** Celestial body (sun / moon) fill and halo */
  body: string;
  halo: string;
  /** Ridge fills, back to front (atmospheric perspective) */
  ridges: [string, string, string, string];
  /** Overlay text colors */
  ink: string;
  inkSoft: string;
  stars: boolean;
  birds: boolean;
}

export const PALETTES: Palette[] = [
  {
    id: 'dawn',
    label: 'Amanecer',
    sky: ['#2b2d5c', '#c96f8f', '#f7c59f'],
    body: '#ffd9a0',
    halo: '#ffb37b',
    ridges: ['#7a5c8e', '#5d4470', '#3e2f52', '#241b33'],
    ink: '#fdf3ec',
    inkSoft: '#e8c9bb',
    stars: false,
    birds: true,
  },
  {
    id: 'night',
    label: 'Noche',
    sky: ['#05070f', '#101a33', '#27355c'],
    body: '#e8ecf7',
    halo: '#9fb4dd',
    ridges: ['#2c3a5e', '#202c4a', '#151f38', '#0a1020'],
    ink: '#eef2fb',
    inkSoft: '#a9b6d3',
    stars: true,
    birds: false,
  },
  {
    id: 'github',
    label: 'GitHub',
    sky: ['#04120a', '#0a2e1a', '#0e4429'],
    body: '#c4f5d0',
    halo: '#39d353',
    ridges: ['#0e4429', '#0b5a2b', '#117a37', '#0a3d20'],
    ink: '#e6f9ec',
    inkSoft: '#7ee2a0',
    stars: true,
    birds: false,
  },
  {
    id: 'mono',
    label: 'Monocromo',
    sky: ['#f4f1ea', '#ddd8cc', '#b9b2a2'],
    body: '#2b2823',
    halo: '#8a8378',
    ridges: ['#a39c8d', '#7d7668', '#57524a', '#2e2b26'],
    ink: '#211f1b',
    inkSoft: '#5b564d',
    stars: false,
    birds: true,
  },
];

export function getPalette(id: string): Palette {
  return PALETTES.find((p) => p.id === id) ?? PALETTES[0];
}
