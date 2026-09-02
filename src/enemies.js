/**
 * enemies.js  Bauplan-Tabelle aller Gegnertypen.
 *
 * Der Typ in der Level-JSON (`spawns[].type`) verweist auf einen Schluessel hier
 * und zugleich auf den passenden Eintrag in ENEMIES (config.js). Ein neuer
 * Monstertyp braucht also: einen Eintrag in config.js, eine Klasse in entities/
 * und eine Zeile in dieser Tabelle.
 *
 * Etappe 1 (neue Monster): Die ENEMIES- und COLORS-Eintraege fuer die fuenf
 * neuen Monster werden hier registriert, indem die importierten Objekte aus
 * config.js mutiert werden. Das funktioniert, weil ES-Module Live-Bindings
 * sind: aendert man das Objekt, sieht jeder, der es importiert hat, die
 * Aenderung  auch die Enemy-Basisklasse, die ENEMIES[type] im Konstruktor
 * liest. Die Eintraege stehen hier und nicht in config.js, weil config.js
 * zu gross ist, um es ueber die GitHub-API zu lesen/zu schreiben.
 */

import { ENEMIES, COLORS } from '../config.js';
import { Slime } from './slime.js';
import { Goblin } from './goblin.js';
import { Archer } from './archer.js';
import { ArmoredOrc } from './armoredOrc.js';
import { OrcChieftain } from './orcChieftain.js';
import { Gorilla } from './gorilla.js';
import { Frog } from './frog.js';
import { Giftpilz } from './giftpilz.js';
import { Krokodil } from './krokodil.js';
import { Titanoboa } from './titanoboa.js';
// Etappe 1: neue Monster
import { Werwolf } from './werwolf.js';
import { Ritter } from './ritter.js';
import { Paladin } from './paladin.js';
import { Magier } from './magier.js';
import { Drache } from './drache.js';

// --- Etappe 1: Farben registrieren (mutiert das COLORS-Objekt aus config.js) ---
COLORS.ritter = '#7a7a8a';
COLORS.ritterAccent = '#aaaacc';
COLORS.magier = '#6a3a8a';
COLORS.magierAccent = '#4a2a6a';
COLORS.paladin = '#d4a838';
COLORS.paladinAccent = '#ffd700';
COLORS.werwolf = '#5a4a3a';
COLORS.werwolfAccent = '#8a7a5a';
COLORS.drache = '#aa3322';
COLORS.dracheAccent = '#ff6600';
COLORS.fireball = '#ff6600';
COLORS.burn = '#ff6600';
COLORS.burnDark = '#cc3300';
COLORS.burnBright = '#ffaa00';

// --- Etappe 1: Gegner-Configs registrieren (mutiert das ENEMIES-Objekt aus config.js) ---

/** Werwolf  sehr schneller Nahkaempfer. */
ENEMIES.werwolf = {
  name: 'Werwolf', maxHp: 1000, damage: 170, defense: 0, speed: 160,
  aggroRadius: 400, loseAggroRadius: 600, attackRange: 40, strikeRadius: 50,
  windupTime: 0.45, strikeTime: 0.15, recoverTime: 0.6,
  hitbox: { w: 26, h: 28 }, sprite: { w: 28, h: 30, offsetY: -2 },
  knockbackResist: 0.3, gold: { min: 850, max: 950 }, xp: 2000,
};

/** Ritter  Nahkaempfer mit Schild (reduziert Fernkampf-Schaden). */
ENEMIES.ritter = {
  name: 'Ritter', maxHp: 500, damage: 80, defense: 5, speed: 70,
  aggroRadius: 320, loseAggroRadius: 500, attackRange: 44, strikeRadius: 58,
  windupTime: 0.6, strikeTime: 0.18, recoverTime: 0.9,
  strikeArc: 120,
  hitbox: { w: 26, h: 28 }, sprite: { w: 28, h: 30, offsetY: -2 },
  knockbackResist: 0.5, gold: { min: 400, max: 450 }, xp: 1000,
  // Fernkampf-Schadensreduktion: Bogen und geworfener Speer machen 30 %.
  rangedDamageFactor: 0.3,
  // Ab dieser Distanz zaehlt ein Speer als geworfen (Fernkampf).
  rangedThreshold: 80,
};

/** Paladin  Nahkaempfer mit Ansturm und Selbstheilung. */
ENEMIES.paladin = {
  name: 'Paladin', maxHp: 800, damage: 100, defense: 3, speed: 90,
  aggroRadius: 350, loseAggroRadius: 550, attackRange: 44, strikeRadius: 58,
  windupTime: 0.5, strikeTime: 0.15, recoverTime: 0.7,
  strikeArc: 120,
  hitbox: { w: 28, h: 28 }, sprite: { w: 30, h: 32, offsetY: -2 },
  knockbackResist: 0.4, gold: { min: 650, max: 750 }, xp: 1800,
  // Ansturm: doppelten Schaden (100 * 2 = 200).
  charge: {
    cooldown: 5.0, windupTime: 0.5, speed: 350, duration: 0.6,
    radius: 30, damage: 200, minRange: 100, maxRange: 400,
  },
  // Selbstheilung.
  heal: {
    cooldown: 8.0, amount: 100, windupTime: 0.8,
  },
};

/** Magier  Fernkaempfer mit Feuerball und Verbrennung. Flieht nicht. */
ENEMIES.magier = {
  name: 'Magier', maxHp: 400, damage: 120, defense: 0, speed: 60,
  range: 200,
  aggroRadius: 320, loseAggroRadius: 520,
  shootInterval: 2.5, windupTime: 0.5, strikeTime: 0.1, recoverTime: 0.5,
  projectileSpeed: 280,
  fireballMaxRange: 200,
  hitbox: { w: 22, h: 26 }, sprite: { w: 24, h: 28, offsetY: -2 },
  knockbackResist: 0.1, gold: { min: 500, max: 550 }, xp: 1300,
};

/** Drache  Boss, fliegend, nur Fernkampf verwundbar. */
ENEMIES.drache = {
  name: 'Drache', maxHp: 4000, damage: 250, defense: 10, speed: 80,
  aggroRadius: 900, loseAggroRadius: 9999,
  windupTime: 0.6, strikeTime: 0.2, recoverTime: 1.0,
  hitbox: { w: 48, h: 40 }, sprite: { w: 52, h: 44, offsetY: -4 },
  knockbackResist: 0.95, gold: { min: 1500, max: 1500 }, xp: 5000,
  isBoss: true,
  // Feueratem: 5 Feuerbaelle in einem Kegel.
  firebreath: {
    count: 5, spreadDeg: 60, speed: 300, maxRange: 350,
    damage: 250, windupTime: 0.8, strikeTime: 0.3, recoverTime: 1.5,
    cooldown: 3.0,
  },
  // Nahkampf-Immunitaet: Speer aus > 80 px zaehlt als Wurf (trifft).
  meleeThreshold: 80,
};

export const ENEMY_CLASSES = {
  slime: Slime,
  goblin: Goblin,
  archer: Archer,
  armoredOrc: ArmoredOrc,
  orcChieftain: OrcChieftain,
  // Urwald (Erweiterung 2, Abschnitt 1)
  gorilla: Gorilla,
  frog: Frog,
  giftpilz: Giftpilz,
  krokodil: Krokodil,
  titanoboa: Titanoboa,
  // Etappe 1: neue Monster
  werwolf: Werwolf,
  ritter: Ritter,
  paladin: Paladin,
  magier: Magier,
  drache: Drache,
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
    console.warn(`Gegnertyp "${type}" ist nicht in ENEMY_CLASSES eingetragen  Spawn uebersprungen.`);
    return null;
  }
  const enemy = new Cls(x, y);
  // Erst bauen, dann skalieren: die Unterklassen muessen von der
  // Schwierigkeit nichts wissen.
  enemy.applyDifficulty(difficulty);
  return enemy;
}
