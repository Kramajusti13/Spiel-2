/**
 * xp.js — Erfahrungspunkte und Stufen (Erweiterung, Abschnitt 1).
 *
 * Nur Rechnerei, kein Zustand: die Zahlen stehen in config.js (XP), der
 * Fortschritt (level, xp) liegt im progress-Objekt des Spielers. Die Vergabe
 * selbst macht game.gainXp().
 *
 * Grundregel aus dem Dokument: Stufe 2 kostet 100 XP, jede weitere das
 * 1,4-fache der vorigen.
 */

import { XP } from './config.js';

/**
 * Wie viel XP der Aufstieg AUF Stufe `level` kostet.
 * Entspricht der Formel im Dokument: Math.round(100 * Math.pow(1.4, n - 2)).
 * @param {number} level Zielstufe (>= 2)
 */
export function xpForLevel(level) {
  if (level <= 1) return 0;
  return Math.round(XP.baseCost * Math.pow(XP.growth, level - 2));
}

/**
 * Wie viel XP von der aktuellen Stufe bis zur naechsten fehlt — die Zahl, die
 * in der Leiste steht ("196 / 274").
 */
export function xpToNext(level) {
  return xpForLevel(level + 1);
}

/** Ist die Obergrenze erreicht? Dann sammelt sich keine XP mehr an. */
export function isMaxLevel(level) {
  return level >= XP.maxLevel;
}

/** Fuellstand der Leiste, 0…1. Auf Maximalstufe immer voll. */
export function xpRatio(level, xp) {
  if (isMaxLevel(level)) return 1;
  const need = xpToNext(level);
  return need > 0 ? Math.min(1, xp / need) : 0;
}

/** Gesamte XP von Stufe 1 bis `level` — nur fuer Anzeigen und Tests. */
export function totalXpForLevel(level) {
  let sum = 0;
  for (let n = 2; n <= level; n++) sum += xpForLevel(n);
  return sum;
}
