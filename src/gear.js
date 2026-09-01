/**
 * gear.js — die drei neuen Gold-Ausgaben aus Erweiterung 2, Abschnitt 7:
 * Ruestung, Trankguertel und Schmied.
 *
 * Alle drei sind reine Ableitungen aus dem Fortschritt: aus `armorTier` wird
 * Verteidigung, aus `potionBeltTier` eine Obergrenze, aus `smith` ein
 * Schadensbonus. Sie stehen zusammen in einer Datei, weil sie dieselbe Frage
 * beantworten — "was hat der Spieler sich erkauft?" — und weil sonst jede der
 * drei Zahlen an vier Stellen einzeln aus dem Fortschritt gepult wuerde
 * (Spieler, Shop, Charakterfenster, Spielstand).
 *
 * Warum es diese Posten ueberhaupt gibt: ein Durchlauf der Level 6–10 bringt
 * rund 5.200 Gold, alle Waffen und Schilde zusammen kosten 3.290. Ohne neue
 * Ausgaben waere Gold nach einem einzigen Durchgang wertlos. Zusammen sind es
 * rund 16.850 Gold — genug fuer ein Sparziel bis zum Ende des Alptraum-Modus.
 *
 * Zahlen stehen wie immer ausschliesslich in config.js.
 */

import { ARMOR, POTION_BELT, SMITH, CONSUMABLES } from './config.js';
import { clamp } from './util.js';

// --- Ruestung (vierter Ausruestungsslot) ----------------------------------

/** Stufenindex der Ruestung; 0 = keine. */
export function armorTier(progress) {
  const tier = Math.floor(progress?.armorTier ?? 0);
  return Number.isFinite(tier) ? clamp(tier, 0, ARMOR.tiers.length - 1) : 0;
}

export function armorDef(progress) {
  return ARMOR.tiers[armorTier(progress)];
}

/** Verteidigung aus der Ruestung. Wirkt immer, unabhaengig vom Schild. */
export function armorDefense(progress) {
  return armorDef(progress).defense;
}

export function hasArmor(progress) {
  return armorTier(progress) > 0;
}

// --- Trankguertel ---------------------------------------------------------

/** Ausbaustufe des Guertels; 0 = Startguertel. */
export function beltTier(progress) {
  const tier = Math.floor(progress?.potionBeltTier ?? 0);
  return Number.isFinite(tier) ? clamp(tier, 0, POTION_BELT.tiers.length - 1) : 0;
}

/**
 * Wie viele Heiltraenke ins Gepaeck passen.
 *
 * DIE Stelle fuer diese Frage: CONSUMABLES.potion.maxCarried ist seit
 * Abschnitt 7 nur noch der Startwert des untersten Guertels.
 */
export function maxPotions(progress) {
  return POTION_BELT.tiers[beltTier(progress)]?.maxPotions ?? CONSUMABLES.potion.maxCarried;
}

// --- Schmied (permanente Waffenschaerfung) --------------------------------

/**
 * Wie oft diese Waffe schon geschaerft wurde, 0…SMITH.maxPerWeapon.
 *
 * Gelesen wird ueber Object.hasOwn: ein von Hand eingetragenes
 * "constructor" im Spielstand soll keinen Treffer aus dem Prototyp liefern.
 */
export function smithLevel(progress, weapon) {
  const smith = progress?.smith;
  if (!smith || typeof smith !== 'object' || !Object.hasOwn(smith, weapon)) return 0;
  const value = Math.floor(smith[weapon]);
  return Number.isFinite(value) ? clamp(value, 0, SMITH.maxPerWeapon) : 0;
}

/** Dauerhafter Schadenszuwachs dieser Waffe aus der Schmiede. */
export function smithBonus(progress, weapon) {
  return smithLevel(progress, weapon) * SMITH.damagePerUpgrade;
}

/** Ist bei dieser Waffe nichts mehr zu holen? */
export function smithMaxed(progress, weapon) {
  return smithLevel(progress, weapon) >= SMITH.maxPerWeapon;
}

/**
 * Was das naechste Schaerfen dieser Waffe kostet.
 * @returns {number} Preis, oder 0 wenn die Waffe ausgereizt ist
 */
export function smithPrice(progress, weapon) {
  const stufe = smithLevel(progress, weapon);
  return stufe >= SMITH.maxPerWeapon ? 0 : SMITH.prices[stufe];
}

/**
 * Eine Waffe schaerfen. Prueft nur die Obergrenze — Gold zieht der Aufrufer ab.
 * @returns {boolean} true, wenn geschaerft wurde
 */
export function sharpen(progress, weapon) {
  if (smithMaxed(progress, weapon)) return false;
  // Ein frisches Objekt ohne Prototyp waere hier uebertrieben; der Schluessel
  // kommt immer aus der festen Waffenliste, nie aus einer Eingabe.
  if (!progress.smith || typeof progress.smith !== 'object') progress.smith = {};
  progress.smith[weapon] = smithLevel(progress, weapon) + 1;
  return true;
}
