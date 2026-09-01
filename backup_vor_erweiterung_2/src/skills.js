/**
 * skills.js — Skillpunkte vergeben, zuruecksetzen und beschreiben (Abschnitt 4).
 *
 * Punkte kommen ausschliesslich aus Stufenaufstiegen (Erweiterung, Abschnitt 1;
 * die alte Regel "1 Punkt pro 15 Kills" ist ersetzt) und
 * werden in `progress.skills` als Stufe pro Skill abgelegt. Die Wirkung lesen
 * Spieler und Waffen direkt aus dem Fortschritt — hier steht nur die Verwaltung.
 *
 * Gold kauft Ausruestung, Skillpunkte verbessern den Charakter: zwei getrennte
 * Straenge, die sich nicht ins Gehege kommen.
 */

import { SKILLS, CONSUMABLES } from './config.js';

/** Anzeigereihenfolge im Charakterfenster. */
export const SKILL_ORDER = ['vitality', 'strength', 'armor', 'speed', 'archery', 'blockMaster'];

/**
 * Wie die Wirkung eines Skills formuliert wird.
 * 'flat'    -> "+20 max. Leben"
 * 'percent' -> "+8 % Tempo"
 */
const EFFECT = {
  vitality: { unit: 'flat', text: 'max. Leben' },
  strength: { unit: 'flat', text: 'Angriffskraft' },
  armor: { unit: 'flat', text: 'Verteidigung' },
  speed: { unit: 'percent', text: 'Bewegungstempo' },
  archery: { unit: 'percent', text: 'Pfeilschaden' },
  blockMaster: { unit: 'percent', text: 'Schadensblock' },
};

export function skillDef(id) {
  return SKILLS.tree[id];
}

export function rank(progress, id) {
  return progress.skills?.[id] ?? 0;
}

export function isMaxed(progress, id) {
  return rank(progress, id) >= skillDef(id).maxRank;
}

/** Summe aller vergebenen Punkte. */
export function spentPoints(progress) {
  return SKILL_ORDER.reduce((sum, id) => sum + rank(progress, id), 0);
}

export function canSpend(progress, id) {
  return progress.skillPoints > 0 && !isMaxed(progress, id);
}

/**
 * Einen Punkt vergeben.
 * @returns {boolean} true, wenn es geklappt hat
 */
export function spendPoint(progress, id) {
  if (!canSpend(progress, id)) return false;
  progress.skills[id] = rank(progress, id) + 1;
  progress.skillPoints -= 1;
  return true;
}

/**
 * Respec: alle vergebenen Punkte zurueck in den Pool (Abschnitt 4).
 * Der Preis wird vom Aufrufer geprueft und abgebucht.
 * @returns {number} Anzahl zurueckgegebener Punkte
 */
export function respec(progress) {
  const back = spentPoints(progress);
  progress.skills = {};
  progress.skillPoints += back;
  return back;
}

export const respecPrice = CONSUMABLES.respec.price;

/** Wirkung einer bestimmten Stufe als Text, z. B. "+40 max. Leben". */
export function effectText(id, atRank) {
  const def = skillDef(id);
  const e = EFFECT[id];
  const value = def.perRank * atRank;
  return e.unit === 'percent'
    ? `+${Math.round(value * 100)} % ${e.text}`
    : `+${value} ${e.text}`;
}

/** Wirkung eines einzelnen Punktes, z. B. "+20 max. Leben pro Stufe". */
export function perRankText(id) {
  return `${effectText(id, 1)} pro Stufe`;
}

/** Wie viele Punkte man insgesamt schon verdient hat (nur zur Anzeige). */
export function earnedPoints(progress) {
  return progress.skillPoints + spentPoints(progress);
}
