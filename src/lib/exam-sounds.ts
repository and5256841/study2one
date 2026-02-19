/**
 * Web Audio API sounds for monthly exams.
 * No external MP3 files needed — generates beeps/tones programmatically.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

function playBeep(frequency: number, durationMs: number, volume = 0.3) {
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.value = frequency;
  gain.gain.value = volume;

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start();
  osc.stop(ctx.currentTime + durationMs / 1000);
}

/** 2 beeps at 880Hz — warning at 5min and 1min remaining */
export function playWarningSound() {
  playBeep(880, 200);
  setTimeout(() => playBeep(880, 200), 300);
}

/** Chord C5-E5-G5 — section submitted successfully */
export function playCompletionSound() {
  playBeep(523, 400, 0.2);
  playBeep(659, 400, 0.2);
  playBeep(784, 400, 0.2);
}

/** 4 rapid beeps at 1000Hz — time is up */
export function playTimeUpSound() {
  for (let i = 0; i < 4; i++) {
    setTimeout(() => playBeep(1000, 120, 0.4), i * 180);
  }
}
