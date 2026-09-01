/**
 * audio.js — Toene laden und abspielen (Abschnitt 8).
 *
 * Web Audio statt <audio>-Elementen: derselbe Ton kann sich mehrfach
 * ueberlagern (drei Slimes sterben gleichzeitig) und laesst sich in Tonhoehe
 * leicht variieren, damit Wiederholungen nicht mechanisch klingen.
 *
 * Browser starten Audio erst nach einer Nutzeraktion. Deshalb wird der
 * AudioContext beim ersten Klick oder Tastendruck aufgeweckt (unlockAudio).
 *
 * Fehlt eine Datei, bleibt es einfach still — nie ein Fehler.
 */

import { AUDIO } from './config.js';

/** name -> AudioBuffer */
const buffers = new Map();

let ctx = null;
let masterGain = null;
let muted = false;
/** Verhindert, dass derselbe Ton im selben Frame 20-mal uebereinanderliegt. */
const lastPlayed = new Map();

function ensureContext() {
  if (ctx) return ctx;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null;
  ctx = new Ctor();
  masterGain = ctx.createGain();
  masterGain.gain.value = AUDIO.masterVolume;
  masterGain.connect(ctx.destination);
  return ctx;
}

/** Nach der ersten Nutzeraktion aufrufen — vorher blockt der Browser Ton. */
export function unlockAudio() {
  const c = ensureContext();
  if (c && c.state === 'suspended') c.resume();
}

/** WAV (oder jedes vom Browser lesbare Format) laden und dekodieren. */
export async function loadSound(name, url) {
  const c = ensureContext();
  if (!c) throw new Error('Kein AudioContext verfuegbar');
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Ton "${url}" nicht ladbar (HTTP ${res.status})`);
  const data = await res.arrayBuffer();
  const buffer = await c.decodeAudioData(data);
  buffers.set(name, buffer);
}

export function hasSound(name) {
  return buffers.has(name);
}

/**
 * Ton abspielen.
 * @param {string} name
 * @param {object} [opt]
 * @param {number} [opt.volume=1]   relativ zur Grundlautstaerke
 * @param {number} [opt.pitch]      fester Tonhoehenfaktor (1 = original)
 * @param {number} [opt.spread]     zufaellige Tonhoehen-Streuung, z. B. 0.1
 */
export function playSound(name, opt = {}) {
  if (muted || !AUDIO.enabled) return;
  const buffer = buffers.get(name);
  if (!buffer || !ctx) return;
  if (ctx.state === 'suspended') return;   // noch nicht freigeschaltet

  // Gleicher Ton kurz hintereinander: nur einmal, sonst uebersteuert es.
  const now = ctx.currentTime;
  const last = lastPlayed.get(name) ?? -1;
  if (now - last < AUDIO.retriggerDelay) return;
  lastPlayed.set(name, now);

  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const spread = opt.spread ?? AUDIO.pitchSpread;
  src.playbackRate.value = opt.pitch ?? (1 + (Math.random() * 2 - 1) * spread);

  const gain = ctx.createGain();
  gain.gain.value = (opt.volume ?? 1) * AUDIO.sfxVolume;
  src.connect(gain);
  gain.connect(masterGain);
  src.start();
}

export function setMuted(value) {
  muted = value;
  if (masterGain) masterGain.gain.value = muted ? 0 : AUDIO.masterVolume;
  return muted;
}

export function toggleMuted() {
  return setMuted(!muted);
}

export function isMuted() {
  return muted;
}
