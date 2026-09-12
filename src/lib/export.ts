import frauncesItalicUrl from '@fontsource-variable/fraunces/files/fraunces-latin-standard-italic.woff2?url';
import jetbrainsMonoUrl from '@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2?url';

/**
 * SVG drawn into a canvas via <img> cannot see document fonts, so the two
 * typefaces used inside the artwork get embedded as data URIs on export.
 */
const EMBED_FONTS = [
  { family: 'Fraunces Variable', style: 'italic', url: frauncesItalicUrl },
  { family: 'JetBrains Mono Variable', style: 'normal', url: jetbrainsMonoUrl },
];

let fontCssCache: string | null = null;

async function toDataUrl(url: string): Promise<string> {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return `data:font/woff2;base64,${btoa(binary)}`;
}

async function embeddedFontCss(): Promise<string> {
  if (fontCssCache) return fontCssCache;
  const rules = await Promise.all(
    EMBED_FONTS.map(async (font) => {
      const dataUrl = await toDataUrl(font.url);
      return `@font-face { font-family: '${font.family}'; font-style: ${font.style}; font-weight: 100 900; src: url('${dataUrl}') format('woff2'); }`;
    }),
  );
  fontCssCache = rules.join('\n');
  return fontCssCache;
}

/** Serialize an SVG element to a self-contained SVG string. */
export async function serializeSvg(svg: SVGSVGElement): Promise<string> {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', String(svg.viewBox.baseVal.width || 1600));
  clone.setAttribute('height', String(svg.viewBox.baseVal.height || 900));

  const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
  style.textContent = await embeddedFontCss();
  clone.insertBefore(style, clone.firstChild);

  return new XMLSerializer().serializeToString(clone);
}

/** Rasterize an SVG element to a PNG blob at the given pixel size. */
export async function svgToPng(svg: SVGSVGElement, width: number, height: number): Promise<Blob> {
  const markup = await serializeSvg(svg);
  const url = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const image = new Image();
    image.decoding = 'sync';
    const loaded = new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('Could not rasterize the artwork.'));
    });
    image.src = url;
    await loaded;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas is not available.');
    ctx.drawImage(image, 0, 0, width, height);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('PNG encoding failed.'))), 'image/png');
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
