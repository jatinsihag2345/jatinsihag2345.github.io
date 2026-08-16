/**
 * Focus sounds (feature 37) — brown / white / rain-ish noise straight out of
 * WebAudio. No audio assets: each flavour is a 2-second looped buffer of
 * generated noise (rain = white noise pushed through a biquad band-pass), so
 * the PWA's precache grows by zero bytes and offline never matters.
 *
 * The engine is a module-level singleton on purpose: FocusTimer re-renders
 * twice a second while running, and component-owned AudioContexts would stack
 * a new hiss on every remount. One context, created lazily on first play and
 * then suspended/resumed — browsers cap live contexts, and suspend is the
 * documented way to hold one without burning the audio thread.
 *
 * The preference ('focus-sound', in APP_KEY) is just {kind, volume}. Playback
 * state is NOT persisted — sound is strictly slaved to the running timer, and
 * an autoplaying page after reload would violate both autoplay policy and
 * common decency.
 *
 * Lands at: src/utils/focusSound.ts
 */
import { readJson, writeJson } from './persistence';

export type SoundKind = 'off' | 'brown' | 'white' | 'rain';
export const SOUND_KINDS: readonly SoundKind[] = ['off', 'brown', 'white', 'rain'];

export interface FocusSoundPref {
  kind: SoundKind;
  /** 0..1 slider position; mapped through a square curve before the gain node. */
  volume: number;
}

const KEY = 'focus-sound';
const DEFAULT_PREF: FocusSoundPref = { kind: 'off', volume: 0.5 };

export const readFocusSoundPref = (): FocusSoundPref =>
  readJson<FocusSoundPref>(KEY, DEFAULT_PREF, (v): v is FocusSoundPref => {
    if (!v || typeof v !== 'object') return false;
    const p = v as FocusSoundPref;
    return (
      (SOUND_KINDS as readonly string[]).includes(p.kind) &&
      typeof p.volume === 'number' &&
      p.volume >= 0 &&
      p.volume <= 1
    );
  });

export const writeFocusSoundPref = (p: FocusSoundPref) => writeJson(KEY, p);

// Safari shipped AudioContext prefixed for years; everything else is standard.
type AudioContextCtor = typeof AudioContext;
const ctxCtor = (): AudioContextCtor | null => {
  if (typeof window === 'undefined') return null;
  return (
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext ??
    null
  );
};

/** Honest feature gate for the UI: no constructor, no picker — just a sentence. */
export const soundSupported = (): boolean => ctxCtor() !== null;

let ctx: AudioContext | null = null;
let gain: GainNode | null = null;
let source: AudioBufferSourceNode | null = null;
let filter: BiquadFilterNode | null = null;
let playingKind: Exclude<SoundKind, 'off'> | null = null;

// Two seconds of random samples loops without an audible seam — noise has no
// phrase to notice repeating, unlike any real recording would.
const NOISE_SECONDS = 2;

const buildBuffer = (ac: AudioContext, kind: Exclude<SoundKind, 'off'>): AudioBuffer => {
  const len = ac.sampleRate * NOISE_SECONDS;
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const data = buf.getChannelData(0);
  if (kind === 'brown') {
    // Brown = leaky-integrated white: each sample leans on the previous one,
    // which tilts the energy toward the low end — the deep rumble people mean
    // by "brown noise". The 3.5 gain rebalances the integration's quietness so
    // all three flavours sit at a comparable loudness on the same slider.
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    }
  } else {
    // Plain white for both 'white' and 'rain' — rain is this same buffer heard
    // through the band-pass biquad wired up in startSound, not different data.
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * 0.6;
  }
  return buf;
};

// Square the slider position: ear response is roughly logarithmic, and a linear
// gain map leaves the whole bottom half of the slider sounding identical. The
// 0.5 ceiling keeps "max" at ambience level — this is a room, not a concert.
const sliderToGain = (volume: number) => Math.max(0, Math.min(1, volume)) ** 2 * 0.5;

/**
 * (Re)start the loop for `kind`. Always called downstream of a user gesture
 * (starting/resuming the timer, picking a sound), which is what autoplay policy
 * requires for the resume() to stick. Returns false when WebAudio is missing or
 * the context refuses — callers already show the unsupported sentence.
 */
export const startSound = (kind: Exclude<SoundKind, 'off'>, volume: number): boolean => {
  const Ctor = ctxCtor();
  if (!Ctor) return false;
  try {
    stopSound(); // never two sources at once
    if (!ctx) ctx = new Ctor();
    void ctx.resume(); // wakes the suspended singleton; a no-op when fresh
    gain = ctx.createGain();
    gain.gain.value = sliderToGain(volume);
    source = ctx.createBufferSource();
    source.buffer = buildBuffer(ctx, kind);
    source.loop = true;
    if (kind === 'rain') {
      filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1100; // rain's hiss lives in the low kHz
      filter.Q.value = 0.7; // wide skirt — narrow Q whistles instead of rains
      source.connect(filter);
      filter.connect(gain);
    } else {
      source.connect(gain);
    }
    gain.connect(ctx.destination);
    source.start();
    playingKind = kind;
    return true;
  } catch {
    playingKind = null;
    return false;
  }
};

/** Live volume while playing — a ramp, not a jump, so dragging doesn't crackle. */
export const setSoundVolume = (volume: number) => {
  if (gain && ctx) gain.gain.setTargetAtTime(sliderToGain(volume), ctx.currentTime, 0.05);
};

/** Full stop: tear down the source graph and suspend the context. Suspend, not
 *  close — a fresh context per 25-minute block leaks them on some browsers,
 *  while one suspended context costs nothing. */
export const stopSound = () => {
  try {
    source?.stop();
  } catch {
    // Stopping a node that never started throws; nothing to do about it.
  }
  source?.disconnect();
  filter?.disconnect();
  gain?.disconnect();
  source = null;
  filter = null;
  gain = null;
  playingKind = null;
  void ctx?.suspend();
};

/** Tab went hidden: park the audio thread but keep the graph, so coming back
 *  resumes the same loop instead of rebuilding it. */
export const suspendSound = () => {
  void ctx?.suspend();
};

/** Only meaningful when something was playing before the suspend. */
export const resumeSound = () => {
  if (playingKind) void ctx?.resume();
};
