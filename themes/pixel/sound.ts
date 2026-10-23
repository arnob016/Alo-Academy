"use client";

/*
 * Tiny Web Audio synth: every sound is generated with square/triangle
 * oscillators, so there are no audio files and nothing plays until the visitor
 * turns sound on (browsers require a click before audio anyway).
 */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let enabled = false;
let musicTimer: number | null = null;

const mtof = (note: number) => 440 * 2 ** ((note - 69) / 12);

function tone(freq: number, start: number, duration: number, type: OscillatorType = "square", volume = 0.05) {
  if (!ctx || !master) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain).connect(master);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

function play(fn: (now: number) => void) {
  if (!enabled || !ctx) return;
  fn(ctx.currentTime);
}

export const sfx = {
  blip: () => play((t) => tone(880, t, 0.04, "square", 0.025)),
  type: () => play((t) => tone(1240, t, 0.015, "square", 0.012)),
  coin: () =>
    play((t) => {
      tone(988, t, 0.08);
      tone(1319, t + 0.08, 0.32);
    }),
  select: () =>
    play((t) => {
      tone(660, t, 0.06);
      tone(990, t + 0.06, 0.1);
    }),
  error: () => play((t) => tone(130, t, 0.25, "sawtooth", 0.04)),
  fanfare: () =>
    play((t) => {
      [72, 76, 79, 84, 79, 84].forEach((n, i) => tone(mtof(n), t + i * 0.11, i === 5 ? 0.5 : 0.1));
    }),
};

// An original 16-step loop: melody arpeggio over a simple bass line.
const MELODY = [72, 76, 79, 76, 74, 77, 81, 77, 72, 76, 79, 84, 83, 79, 76, 74];
const BASS = [48, 0, 55, 0, 50, 0, 57, 0, 48, 0, 55, 0, 43, 0, 50, 0];
const STEP = 60 / 132 / 2; // eighth notes at 132 bpm

function startMusic() {
  if (!ctx || musicTimer !== null) return;
  let step = 0;
  let next = ctx.currentTime + 0.1;
  // Look-ahead scheduler: queue notes slightly ahead so timing stays tight.
  musicTimer = window.setInterval(() => {
    if (!ctx) return;
    while (next < ctx.currentTime + 0.15) {
      tone(mtof(MELODY[step]), next, STEP * 0.9, "square", 0.018);
      if (BASS[step]) tone(mtof(BASS[step]), next, STEP * 1.8, "triangle", 0.05);
      step = (step + 1) % MELODY.length;
      next += STEP;
    }
  }, 30);
}

function stopMusic() {
  if (musicTimer !== null) window.clearInterval(musicTimer);
  musicTimer = null;
}

export function setSound(on: boolean) {
  enabled = on;
  if (on) {
    if (!ctx) {
      ctx = new AudioContext();
      master = ctx.createGain();
      master.gain.value = 0.8;
      master.connect(ctx.destination);
    }
    void ctx.resume();
    startMusic();
    sfx.coin();
  } else {
    stopMusic();
    void ctx?.suspend();
  }
}

export function isSoundOn() {
  return enabled;
}
