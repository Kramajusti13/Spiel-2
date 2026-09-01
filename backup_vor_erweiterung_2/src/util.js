/** Kleine Mathe- und Hilfsfunktionen, die mehrere Module brauchen. */

export const TAU = Math.PI * 2;

export function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v;
}

/** Framerate-unabhaengiges Nachziehen: rate ist "wie schnell pro Sekunde". */
export function damp(current, target, rate, dt) {
  return current + (target - current) * (1 - Math.exp(-rate * dt));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function dist(ax, ay, bx, by) {
  return Math.hypot(bx - ax, by - ay);
}

export function dist2(ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  return dx * dx + dy * dy;
}

/** Kleinste Differenz zweier Winkel, Ergebnis in [-PI, PI]. */
export function angleDiff(a, b) {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}

export function degToRad(deg) {
  return (deg * Math.PI) / 180;
}

export function randRange(min, max) {
  return min + Math.random() * (max - min);
}

/** Ganzzahl inklusive min und max. */
export function randInt(min, max) {
  return Math.floor(min + Math.random() * (max - min + 1));
}

/** Ueberlappen sich zwei mittig platzierte Rechtecke? */
export function aabbOverlap(ax, ay, ahw, ahh, bx, by, bhw, bhh) {
  return Math.abs(ax - bx) < ahw + bhw && Math.abs(ay - by) < ahh + bhh;
}
