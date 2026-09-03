/**
 * enemies.js — Bauplan-Tabelle aller Gegnertypen.
 *
 * Der Typ in der Level-JSON (spawns[].type) verweist auf einen Schluessel hier
 * und zugleich auf den passenden Eintrag in ENEMIES (config.js).
 */

import { ENEMIES, COLORS, LEVELS } from '../config.js';
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
import { Werwolf } from './werwolf.js';
import { Ritter } from './ritter.js';
import { Paladin } from './paladin.js';
import { Magier } from './magier.js';
import { Drache } from './drache.js';
import { Angel } from './angel.js';
import { Seraphim } from './seraphim.js';
import { Cherubim } from './cherubim.js';
import { Archangel } from './archangel.js';
import { Michael } from './michael.js';

// Farben
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
COLORS.angel = '#ffffff';
COLORS.seraphim = '#ffd700';
COLORS.cherubim = '#ff8c00';
COLORS.archangel = '#8b0000';
COLORS.michael = '#ffd700';
COLORS.heal = '#00ff00';
COLORS.castleFloor = '#8a8a8a';
COLORS.castleFloorDark = '#6a6a6a';
COLORS.castlePath = '#9a8a6a';
COLORS.castleWall = '#4a4a5a';
COLORS.castleWallTop = '#6a6a7a';

// Gegner-Configs
ENEMIES.werwolf = { name: 'Werwolf', maxHp: 1000, damage: 170, defense: 0, speed: 160, aggroRadius: 400, loseAggroRadius: 600, attackRange: 40, strikeRadius: 50, windupTime: 0.45, strikeTime: 0.15, recoverTime: 0.6, hitbox: { w: 26, h: 28 }, sprite: { w: 28, h: 30, offsetY: -2 }, knockbackResist: 0.3, gold: { min: 850, max: 950 }, xp: 2000 };
ENEMIES.ritter = { name: 'Ritter', maxHp: 500, damage: 80, defense: 5, speed: 70, aggroRadius: 320, loseAggroRadius: 500, attackRange: 44, strikeRadius: 58, windupTime: 0.6, strikeTime: 0.18, recoverTime: 0.9, strikeArc: 120, hitbox: { w: 26, h: 28 }, sprite: { w: 28, h: 30, offsetY: -2 }, knockbackResist: 0.5, gold: { min: 400, max: 450 }, xp: 1000, rangedDamageFactor: 0.3, rangedThreshold: 80 };
ENEMIES.paladin = { name: 'Paladin', maxHp: 800, damage: 100, defense: 3, speed: 90, aggroRadius: 350, loseAggroRadius: 550, attackRange: 44, strikeRadius: 58, windupTime: 0.5, strikeTime: 0.15, recoverTime: 0.7, strikeArc: 120, hitbox: { w: 28, h: 28 }, sprite: { w: 30, h: 32, offsetY: -2 }, knockbackResist: 0.4, gold: { min: 650, max: 750 }, xp: 1800, charge: { cooldown: 5.0, windupTime: 0.5, speed: 350, duration: 0.6, radius: 30, damage: 200, minRange: 100, maxRange: 400 }, heal: { cooldown: 8.0, amount: 100, windupTime: 0.8 } };
ENEMIES.magier = { name: 'Magier', maxHp: 400, damage: 120, defense: 0, speed: 60, range: 200, aggroRadius: 320, loseAggroRadius: 520, shootInterval: 2.5, windupTime: 0.5, strikeTime: 0.1, recoverTime: 0.5, projectileSpeed: 280, fireballMaxRange: 200, hitbox: { w: 22, h: 26 }, sprite: { w: 24, h: 28, offsetY: -2 }, knockbackResist: 0.1, gold: { min: 500, max: 550 }, xp: 1300 };
ENEMIES.drache = { name: 'Drache', maxHp: 4000, damage: 250, defense: 10, speed: 80, aggroRadius: 900, loseAggroRadius: 9999, windupTime: 0.6, strikeTime: 0.2, recoverTime: 1.0, hitbox: { w: 48, h: 40 }, sprite: { w: 52, h: 44, offsetY: -4 }, knockbackResist: 0.95, gold: { min: 1500, max: 1500 }, xp: 5000, isBoss: true, firebreath: { count: 5, spreadDeg: 60, speed: 300, maxRange: 350, damage: 250, windupTime: 0.8, strikeTime: 0.3, recoverTime: 1.5, cooldown: 3.0 }, meleeThreshold: 80 };
ENEMIES.angel = { name: 'Engel', maxHp: 1500, damage: 180, defense: 0, speed: 80, aggroRadius: 300, loseAggroRadius: 500, range: 400, attackCooldown: 2.0, windupTime: 0.5, strikeTime: 0.3, recoverTime: 1.0, hitbox: { w: 28, h: 32 }, sprite: { w: 30, h: 34, offsetY: -2 }, knockbackResist: 0.1, gold: { min: 800, max: 1000 }, xp: 3000, halo: { maxRadius: 60, damage: 180 } };
ENEMIES.seraphim = { name: 'Seraphim', maxHp: 2000, damage: 200, defense: 0, speed: 70, aggroRadius: 350, loseAggroRadius: 550, range: 500, attackCooldown: 2.5, windupTime: 0.6, strikeTime: 0.2, recoverTime: 1.2, projectileSpeed: 450, hitbox: { w: 30, h: 32 }, sprite: { w: 32, h: 36, offsetY: -2 }, knockbackResist: 0.15, gold: { min: 1100, max: 1300 }, xp: 3500 };
ENEMIES.cherubim = { name: 'Cherubim', maxHp: 2500, damage: 220, defense: 0, speed: 120, aggroRadius: 300, loseAggroRadius: 500, attackRange: 35, dashRange: 300, dashSpeed: 250, dashDuration: 0.4, dashWindupTime: 0.5, dashHitRadius: 40, dashCooldown: 4.0, windupTime: 0.5, strikeTime: 0.2, recoverTime: 0.8, hitbox: { w: 26, h: 28 }, sprite: { w: 28, h: 30, offsetY: -2 }, knockbackResist: 0.2, gold: { min: 1400, max: 1600 }, xp: 4000 };
ENEMIES.archangel = { name: 'Erzengel', maxHp: 3000, damage: 250, defense: 5, speed: 90, aggroRadius: 350, loseAggroRadius: 550, attackRange: 40, teleportDistance: 150, teleportWindupTime: 0.5, teleportCooldown: 5.0, healAmount: 300, healCooldown: 8.0, windupTime: 0.5, strikeTime: 0.2, recoverTime: 0.6, strikeArc: 140, hitbox: { w: 32, h: 34 }, sprite: { w: 34, h: 38, offsetY: -2 }, knockbackResist: 0.3, gold: { min: 1700, max: 1900 }, xp: 4500 };
ENEMIES.michael = { name: 'Erzengel Michael', maxHp: 7000, damage: 300, defense: 10, speed: 70, aggroRadius: 900, loseAggroRadius: 9999, attackRange: 50, range: 450, minRange: 100, swordSpeed: 350, swordReturnSpeed: 400, swordRange: 450, swordDamage: 300, swordWindupTime: 0.8, swordCooldown: 6.0, teleportTime: 0.3, pickupTime: 0.5, shockwaveRadius: 130, shockwaveDamage: 150, shockwaveDuration: 0.4, windupTime: 0.6, strikeTime: 0.2, recoverTime: 1.0, hitbox: { w: 40, h: 44 }, sprite: { w: 44, h: 48, offsetY: -4 }, knockbackResist: 0.8, gold: { min: 3000, max: 3000 }, xp: 10000, isBoss: true };

// Level registrieren
LEVELS.push(
  { name: 'Burgfried', url: './assets/levels/level11.json', built: true, description: 'Zwoelf Ritter patrouillieren den Burghof.' },
  { name: 'Thronsaal', url: './assets/levels/level12.json', built: true, description: 'Magier und Ritter verteidigen den Thronsaal.' },
  { name: 'Kapelle', url: './assets/levels/level13.json', built: true, description: 'Paladine, Ritter und Magier halten die Kapelle.' },
  { name: 'Verlies', url: './assets/levels/level14.json', built: true, description: 'Neun Werwoelfe lauern im dunklen Verlies.' },
  { name: 'Drachenhort', url: './assets/levels/level15.json', built: true, description: 'Der Drache wartet in seinem Hort. Nur Fernangriffe treffen!' },
  { name: 'Himmelstor', url: './assets/levels/level16.json', built: true, description: 'Sechs Engel bewachen den Eingang zum Himmel.' },
  { name: 'Himmelspforte', url: './assets/levels/level17.json', built: true, description: 'Zehn gemischte Engel und Seraphim am Tor.' },
  { name: 'Himmelstempel', url: './assets/levels/level18.json', built: true, description: 'Zwoelf gemischte Cherubim, Engel und Seraphim im Tempel.' },
  { name: 'Abgeschotteter Raum', url: './assets/levels/level19.json', built: true, description: 'Zehn Erzengel und vier Cherubim in dunkler Kammer.' },
  { name: 'Himmelsbosskammer', url: './assets/levels/level20.json', built: true, description: 'Erzengel Michael mit zwei Erzengeln als Bodyguards!' }
);

export const ENEMY_CLASSES = {
  slime: Slime, goblin: Goblin, archer: Archer, armoredOrc: ArmoredOrc, orcChieftain: OrcChieftain,
  gorilla: Gorilla, frog: Frog, giftpilz: Giftpilz, krokodil: Krokodil, titanoboa: Titanoboa,
  werwolf: Werwolf, ritter: Ritter, paladin: Paladin, magier: Magier, drache: Drache,
  angel: Angel, seraphim: Seraphim, cherubim: Cherubim, archangel: Archangel, michael: Michael,
};

export function createEnemy(type, x, y, difficulty = 'normal') {
  const Cls = ENEMY_CLASSES[type];
  if (!Cls) {
    console.warn('Gegnertyp \' + type + '\' ist nicht in ENEMY_CLASSES eingetragen.');
    return null;
  }
  const enemy = new Cls(x, y);
  enemy.applyDifficulty(difficulty);
  return enemy;
}
