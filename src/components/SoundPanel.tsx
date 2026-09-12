import { useEffect, useMemo, useRef, useState } from 'react';
import { buildSequence } from '../lib/sonify';
import { playSequence, renderWav, type PlaybackHandle } from '../lib/player';
import { downloadBlob } from '../lib/export';
import type { ContributionYear } from '../types';

interface Props {
  year: ContributionYear;
}

export function SoundPanel({ year }: Props) {
  const [bpm, setBpm] = useState(120);
  const [playing, setPlaying] = useState(false);
  const [step, setStep] = useState(-1);
  const [exporting, setExporting] = useState(false);
  const handleRef = useRef<PlaybackHandle | null>(null);

  const sequence = useMemo(() => buildSequence(year, bpm), [year, bpm]);

  const stop = () => {
    handleRef.current?.stop();
    handleRef.current = null;
    setPlaying(false);
    setStep(-1);
  };

  useEffect(() => stop, []);

  const toggle = async () => {
    if (playing) {
      stop();
      return;
    }
    setPlaying(true);
    handleRef.current = await playSequence(sequence, bpm, setStep, stop);
  };

  const exportWav = async () => {
    setExporting(true);
    try {
      const blob = await renderWav(sequence, bpm);
      downloadBlob(blob, `commit-scape-${year.username}.wav`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="sound-panel">
      <div className="sound-viz" aria-hidden="true">
        {sequence.map((s, i) => (
          <div
            key={i}
            className={i === step ? 'sound-bar current' : 'sound-bar'}
            style={{ height: `${8 + s.level * 92}%` }}
            title={`${s.note}`}
          />
        ))}
      </div>

      <div className="sound-controls">
        <button className="btn-primary" onClick={toggle}>
          {playing ? 'Stop' : 'Play'}
        </button>
        <label className="tempo">
          <span>{bpm} bpm</span>
          <input
            type="range"
            min="80"
            max="160"
            step="2"
            value={bpm}
            disabled={playing}
            onChange={(e) => setBpm(Number(e.target.value))}
          />
        </label>
        <button className="btn-ghost" onClick={exportWav} disabled={exporting || playing}>
          {exporting ? 'Rendering…' : 'Export WAV'}
        </button>
      </div>

      <p className="sound-note">
        One note per week, A minor pentatonic. Pitch and volume follow the intensity of that
        week — {sequence.length} notes, about {Math.round(sequence.length * (60 / bpm))} seconds.
      </p>
    </div>
  );
}
