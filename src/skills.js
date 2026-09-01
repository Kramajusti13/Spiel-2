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

import { SKILLS, SHIELD, CONSUMABLES } from './config.js';

/**
 * Anzeigereihenfolge im Charakterfenster. Der Speermeister steht bei den
 * anderen beiden Waffenskills (Erweiterung 2, Abschnitt 5).
 */
export const SKILL_ORDER = [
  'vitality', 'strength', 'armor', 'speed', 'archery', 'spearMaster', 'blockMaster',
];

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
  spearMaster: { unit: 'percent', text: 'Speerschaden' },
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

/**
 * Wirkung einer bestimmten Stufe als Text, z. B. "+40 max. Leben".
 *
 * Bei den beiden gedeckelten Skills (Abschnitt 5) steht die tatsaechliche
 * Wirkung da, nicht die rechnerische: wer Geschwindigkeit auf 15 hat, liest
 * "+80 % Bewegungstempo (Maximum)" und nicht die irrefuehrenden +120 %.
 */
export function effectText(id, atRank) {
  const def = skillDef(id);
  const e = EFFECT[id];
  const raw = def.perRank * atRank;
  const value = cappedEffect(id, raw);
  const capped = value < raw ? ' (Maximum)' : '';
  return e.unit === 'percent'
    ? `+${Math.round(value * 100)} % ${e.text}${capped}`
    : `+${value} ${e.text}${capped}`;
}

/**
 * Den Rohwert eines Skills auf seine Obergrenze stutzen (Abschnitt 5).
 * Nur die Anzeige — gerechnet wird in player.js an derselben Grenze.
 */
function cappedEffect(id, raw) {
  if (id === 'speed') return Math.min(SKILLS.caps.speedBonus, raw);
  // Der Blockmeister teilt sich die Obergrenze mit dem Schild. Ohne Schild
  // waere das hier der ganze Deckel, mit Schild bleibt weniger uebrig —
  // deshalb steht die genaue Zahl im Charakterfenster beim Schild.
  if (id === 'blockMaster') return Math.min(SHIELD.maxBlock, raw);
  return raw;
}

/** Wirkung eines einzelnen Punktes, z. B. "+20 max. Leben pro Stufe". */
export function perRankText(id) {
  return `${effectText(id, 1)} pro Stufe`;
}

/** Wie viele Punkte man insgesamt schon verdient hat (nur zur Anzeige). */
export function earnedPoints(progress) {
  return progress.skillPoints + spentPoints(progress);
}
