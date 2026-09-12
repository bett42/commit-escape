import * as Tone from 'tone';
import { encodeWav } from './wav';
import { sequenceDuration, type NoteStep } from './sonify';

const SYNTH_OPTIONS = {
  oscillator: { type: 'triangle' as const },
  envelope: { attack: 0.02, decay: 0.35, sustain: 0.25, release: 1.1 },
};

export interface PlaybackHandle {
  stop: () => void;
}

/** Play the sequence live, reporting each step for the visualizer. */
export async function playSequence(
  sequence: NoteStep[],
  bpm: number,
  onStep: (index: number) => void,
  onEnd: () => void,
): Promise<PlaybackHandle> {
  await Tone.start();
  const synth = new Tone.PolySynth(Tone.Synth, SYNTH_OPTIONS).toDestination();
  synth.volume.value = -5;

  const indices = sequence.map((_, i) => i);
  const part = new Tone.Sequence(
    (time, i) => {
      const step = sequence[i];
      synth.triggerAttackRelease(step.note, '4n', time, step.velocity);
      Tone.getDraw().schedule(() => onStep(i), time);
    },
    indices,
    '4n',
  ).start(0);

  const transport = Tone.getTransport();
  transport.bpm.value = bpm;
  const totalSeconds = sequenceDuration(sequence, bpm);
  transport.scheduleOnce(() => {
    Tone.getDraw().schedule(() => onEnd(), 0);
  }, totalSeconds - 1.2);
  transport.start();

  let stopped = false;
  return {
    stop: () => {
      if (stopped) return;
      stopped = true;
      transport.stop();
      transport.cancel();
      part.dispose();
      synth.releaseAll();
      synth.dispose();
    },
  };
}

/** Render the whole sequence offline and encode it as a WAV blob. */
export async function renderWav(sequence: NoteStep[], bpm: number): Promise<Blob> {
  const duration = sequenceDuration(sequence, bpm);
  const rendered = await Tone.Offline(() => {
    const synth = new Tone.PolySynth(Tone.Synth, SYNTH_OPTIONS).toDestination();
    synth.volume.value = -5;
    for (const step of sequence) {
      synth.triggerAttackRelease(step.note, '4n', step.time, step.velocity);
    }
  }, duration);
  const wav = encodeWav(rendered.get() as AudioBuffer);
  return new Blob([wav], { type: 'audio/wav' });
}
