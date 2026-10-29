// Short UI sounds, synthesised with the Web Audio API: no audio files, works offline.
// Each recipe schedules oscillators/noise on a given context, so the same sounds can also be
// rendered offline (OfflineAudioContext) to check their loudness.

export type SoundName =
  | 'correct' | 'wrong' | 'streak' | 'limit'
  | 'start' | 'begin' | 'pass' | 'fail' | 'finishGood' | 'finishOk'
  | 'warn' | 'timeup'
  | 'magic' | 'save' | 'flip' | 'flag';

type Ctx = BaseAudioContext;

interface Note {
  f: number;
  /** start offset, s */
  t?: number;
  /** duration, s */
  d?: number;
  type?: OscillatorType;
  /** peak gain */
  g?: number;
  /** glide to this frequency */
  to?: number;
  /** attack, s */
  a?: number;
  /** vibrato depth in Hz */
  vib?: number;
}

function note(c: Ctx, out: AudioNode, { f, t = 0, d = 0.2, type = 'sine', g = 0.4, to, a = 0.006, vib }: Note) {
  const t0 = c.currentTime + t;
  const osc = c.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(f, t0);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t0 + d);
  if (vib) {
    const lfo = c.createOscillator(), depth = c.createGain();
    lfo.frequency.value = 5.5;
    depth.gain.value = vib;
    lfo.connect(depth).connect(osc.frequency);
    lfo.start(t0);
    lfo.stop(t0 + d + 0.05);
  }
  const env = c.createGain();
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.exponentialRampToValueAtTime(g, t0 + a);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
  osc.connect(env).connect(out);
  osc.start(t0);
  osc.stop(t0 + d + 0.05);
}

/** Bell-like tone: fundamental plus two quiet inharmonic partials. */
function bell(c: Ctx, out: AudioNode, f: number, t = 0, d = 0.5, g = 0.35) {
  note(c, out, { f, t, d, g });
  note(c, out, { f: f * 2, t, d: d * 0.6, g: g * 0.14 });
  note(c, out, { f: f * 2.76, t, d: d * 0.4, g: g * 0.1 });
}

let noiseBuffer: AudioBuffer | null = null;
function noise(c: Ctx, out: AudioNode, { t = 0, d = 0.12, g = 0.4, filter = 'lowpass', f = 600, to, q = 0.8 }:
  { t?: number; d?: number; g?: number; filter?: BiquadFilterType; f?: number; to?: number; q?: number }) {
  if (!noiseBuffer || noiseBuffer.sampleRate !== c.sampleRate) {
    noiseBuffer = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  const t0 = c.currentTime + t;
  const src = c.createBufferSource();
  src.buffer = noiseBuffer;
  const bq = c.createBiquadFilter();
  bq.type = filter;
  bq.Q.value = q;
  bq.frequency.setValueAtTime(f, t0);
  if (to) bq.frequency.exponentialRampToValueAtTime(to, t0 + d);
  const env = c.createGain();
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.exponentialRampToValueAtTime(g, t0 + 0.004);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
  src.connect(bq).connect(env).connect(out);
  src.start(t0);
  src.stop(t0 + d + 0.05);
}

/** A rubber stamp hitting paper (Bestått / Ikke bestått). */
function stamp(c: Ctx, out: AudioNode) {
  noise(c, out, { d: 0.11, g: 0.5, f: 380 });
  note(c, out, { f: 120, to: 55, d: 0.16, g: 0.55 });
}

const C5 = 523.25, E5 = 659.25, G5 = 783.99, A5 = 880, C6 = 1046.5, E6 = 1318.5, G6 = 1568, C7 = 2093;

export const RECIPES: Record<SoundName, (c: Ctx, out: AudioNode) => void> = {
  // answers
  correct: (c, o) => { bell(c, o, C6, 0, 0.42, 0.3); bell(c, o, E6, 0.085, 0.5, 0.3); },
  wrong: (c, o) => {
    note(c, o, { f: 220, to: 175, d: 0.17, type: 'triangle', g: 0.42 });
    note(c, o, { f: 176, to: 132, t: 0.15, d: 0.26, type: 'triangle', g: 0.42 });
  },
  streak: (c, o) => [C6, E6, G6, C7].forEach((f, i) => bell(c, o, f, i * 0.07, 0.45, 0.24)),
  limit: (c, o) => {
    note(c, o, { f: 330, d: 0.16, type: 'triangle', g: 0.36 });
    note(c, o, { f: 262, t: 0.19, d: 0.34, type: 'triangle', g: 0.36 });
  },
  // a session starts: start lights for the exam, a short "ready–go" for practice
  start: (c, o) => {
    for (const t of [0, 0.34, 0.68]) note(c, o, { f: 660, t, d: 0.13, type: 'triangle', g: 0.4 });
    note(c, o, { f: 990, t: 1.02, d: 0.42, type: 'triangle', g: 0.42 });
    bell(c, o, 1980, 1.02, 0.4, 0.08);
  },
  begin: (c, o) => {
    note(c, o, { f: 660, d: 0.1, type: 'triangle', g: 0.32 });
    note(c, o, { f: 990, t: 0.16, d: 0.3, type: 'triangle', g: 0.34 });
  },
  // results
  pass: (c, o) => {
    stamp(c, o);
    [C5, E5, G5].forEach((f, i) => note(c, o, { f, t: 0.22 + i * 0.12, d: 0.24, type: 'triangle', g: 0.3 }));
    for (const f of [C5, E5, G5, C6]) note(c, o, { f, t: 0.58, d: 1.1, type: 'triangle', g: 0.15, a: 0.02 });
    [E6, G6, C7].forEach((f, i) => bell(c, o, f, 0.6 + i * 0.09, 0.6, 0.12));
  },
  fail: (c, o) => {
    stamp(c, o);
    [392, 370, 349.2].forEach((f, i) => note(c, o, { f, t: 0.26 + i * 0.3, d: 0.3, type: 'triangle', g: 0.34, a: 0.02 }));
    note(c, o, { f: 329.6, t: 1.16, d: 0.85, type: 'triangle', g: 0.34, a: 0.02, vib: 5 });
  },
  finishGood: (c, o) => [C6, E6, G6].forEach((f, i) => bell(c, o, f, i * 0.12, 0.6, 0.26)),
  finishOk: (c, o) => { bell(c, o, G5, 0, 0.5, 0.26); bell(c, o, C6, 0.15, 0.7, 0.24); },
  // exam clock
  warn: (c, o) => { bell(c, o, A5, 0, 0.55, 0.3); bell(c, o, E5, 0.24, 0.8, 0.3); },
  timeup: (c, o) => [A5, G5, E5].forEach((f, i) => note(c, o, { f, t: i * 0.2, d: i === 2 ? 0.45 : 0.16, type: 'triangle', g: 0.34 })),
  // small interactions
  magic: (c, o) => {
    note(c, o, { f: 1400, to: 2600, d: 0.16, g: 0.1 });
    bell(c, o, C7, 0.06, 0.35, 0.07);
  },
  save: (c, o) => { note(c, o, { f: 1200, d: 0.07, g: 0.2 }); note(c, o, { f: 1800, t: 0.05, d: 0.09, g: 0.14 }); },
  flip: (c, o) => noise(c, o, { d: 0.3, g: 0.75, filter: 'bandpass', f: 600, to: 2800, q: 0.7 }),
  flag: (c, o) => { note(c, o, { f: 1500, d: 0.05, g: 0.14 }); note(c, o, { f: 1000, t: 0.04, d: 0.06, g: 0.12 }); },
};

// ---------- playback ----------
const VOLUME = [0.35, 0.7, 1] as const;
const settings = { enabled: true, volume: 1 as 0 | 1 | 2 };
let ctx: AudioContext | null = null;
let master: GainNode | null = null;

function context(): AudioContext | null {
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    // iOS 17+: respect the silent switch and don't stop the user's music
    try {
      const session = (navigator as unknown as { audioSession?: { type: string } }).audioSession;
      if (session) session.type = 'ambient';
    } catch { /* not supported */ }
    ctx = new AC();
    master = ctx.createGain();
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -10;
    master.connect(limiter).connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

export function setSoundPrefs(enabled: boolean, volume: 0 | 1 | 2): void {
  settings.enabled = enabled;
  settings.volume = volume;
}

/** Plays a sound if sounds are on. Safe to call anywhere; never throws. */
export function playSound(name: SoundName): void {
  document.dispatchEvent(new CustomEvent('teoriprove:sound', { detail: name }));
  if (!settings.enabled) return;
  try {
    const c = context();
    if (!c || !master) return;
    master.gain.value = VOLUME[settings.volume] * 1.4;
    RECIPES[name](c, master);
  } catch {
    // audio is a nice-to-have
  }
}

// Browsers only allow audio after a user gesture: unlock the context on the first tap/key,
// so later sounds without a gesture (the exam clock) can play too.
const unlock = () => {
  if (settings.enabled) context();
  window.removeEventListener('pointerdown', unlock);
  window.removeEventListener('keydown', unlock);
};
window.addEventListener('pointerdown', unlock);
window.addEventListener('keydown', unlock);
