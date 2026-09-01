/**
 * enemies.js — Bauplan-Tabelle aller Gegnertypen.
 *
 * Der Typ in der Level-JSON (`spawns[].type`) verweist auf einen Schluessel hier
 * und zugleich auf den passenden Eintrag in ENEMIES (config.js). Ein neuer
 * Monstertyp braucht also: einen Eintrag in config.js, eine Klasse in entities/
 * und eine Zeile in dieser Tabelle.
 */

import { Slime } from './slime.js';
import { Goblin } from './goblin.js';
import { Archer } from './archer.js';
import { ArmoredOrc } from './armoredOrc.js';
import { OrcChieftain } from './orcChieftain.js';

export const ENEMY_CLASSES = {
  slime: Slime,
  goblin: Goblin,
  archer: Archer,
  armoredOrc: ArmoredOrc,
  orcChieftain: OrcChieftain,
};

/**
 * @param {string} type
 * @param {number} x
 * @param {number} y
 * @param {string} [difficulty] Stufe des Durchgangs (Erweiterung, Abschnitt 4)
 */
export function createEnemy(type, x, y, difficulty = 'normal') {
  const Cls = ENEMY_CLASSES[type];
  if (!Cls) {
    console.warn(`Gegnertyp "${type}" ist nicht in ENEMY_CLASSES eingetragen — Spawn uebersprungen.`);
    return null;
  }
  const enemy = new Cls(x, y);
  // Erst bauen, dann skalieren: die Unterklassen muessen von der
  // Schwierigkeit nichts wissen.
  enemy.applyDifficulty(difficulty);
  return enemy;
}
