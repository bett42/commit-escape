import { describe, expect, it } from 'vitest';
import { encodeWav, type PcmSource } from '../src/lib/wav';

function source(samples: number[], channels = 2, sampleRate = 44100): PcmSource {
  const data = new Float32Array(samples);
  return {
    numberOfChannels: channels,
    length: samples.length,
    sampleRate,
    getChannelData: () => data,
  };
}

describe('encodeWav', () => {
  it('writes a valid RIFF/WAVE header', () => {
    const wav = encodeWav(source([0, 0, 0, 0]));
    const view = new DataView(wav);
    const tag = (o: number, n: number) =>
      String.fromCharCode(...Array.from({ length: n }, (_, i) => view.getUint8(o + i)));
    expect(tag(0, 4)).toBe('RIFF');
    expect(tag(8, 4)).toBe('WAVE');
    expect(tag(12, 4)).toBe('fmt ');
    expect(tag(36, 4)).toBe('data');
    expect(view.getUint16(22, true)).toBe(2); // channels
    expect(view.getUint32(24, true)).toBe(44100); // sample rate
    expect(view.getUint32(40, true)).toBe(4 * 2 * 2); // frames * channels * 2 bytes
    expect(wav.byteLength).toBe(44 + 16);
  });

  it('encodes samples as little-endian 16-bit PCM with clipping', () => {
    const wav = encodeWav(source([0.5, -0.5, 2, -2], 1));
    const view = new DataView(wav);
    expect(view.getInt16(44, true)).toBe(Math.round(0.5 * 0x7fff));
    expect(view.getInt16(46, true)).toBe(Math.round(-0.5 * 0x8000));
    expect(view.getInt16(48, true)).toBe(0x7fff); // clipped
    expect(view.getInt16(50, true)).toBe(-0x8000); // clipped
  });
});
