/**
 * assets.js — welche Bild- und Tondateien geladen werden (Abschnitt 8).
 *
 * Sprites werden unter dem Schluessel registriert, den der Zeichencode benutzt:
 * 'player', 'slime', 'coin', 'arrow' und 'tile.<name aus der Level-Legende>'.
 * Fehlt eine Datei, laeuft das Spiel weiter — gfx.js zeichnet dann wie bisher
 * das farbige Platzhalter-Rechteck. Deshalb blockiert eine fehlende Grafik nie.
 *
 * EIGENE GRAFIKEN EINSETZEN:
 * Einfach die PNG unter assets/sprites/ durch eine gleichnamige 32x32-Datei
 * ersetzen (z. B. aus einem Kenney-Paket). Nichts am Code aendern.
 * Neue Kachelart? Zeile in TILE_SPRITES ergaenzen und die Datei dazulegen.
 */

import { loadSprite } from './gfx.js';
import { loadSound } from './audio.js';

const SPRITE_DIR = './assets/sprites';
const SOUND_DIR = './assets/sounds';

/** Figuren und Gegenstaende: Schluessel -> Dateiname (ohne .png). */
export const ENTITY_SPRITES = {
  player: 'player',
  slime: 'slime',
  goblin: 'goblin',
  archer: 'archer',
  armoredOrc: 'armoredOrc',
  orcChieftain: 'orcChieftain',
  // Urwald (Erweiterung 2, Abschnitt 1)
  gorilla: 'gorilla',
  frog: 'frog',
  giftpilz: 'giftpilz',
  krokodil: 'krokodil',
  titanoboa: 'titanoboa',
  coin: 'coin',
  arrow: 'arrow',
  /** Wurfstein des Gorillas — wie der Pfeil ein Flugkoerper mit eigenem Bild. */
  stone: 'stone',
};

/**
 * Kacheln: der Schluessel entsteht aus dem `name` in der Level-Legende
 * (legend["."].name = "grass" -> Schluessel "tile.grass").
 */
export const TILE_SPRITES = [
  'grass', 'grassDark', 'path', 'wall', 'tree',
  'caveFloor', 'caveFloorDark', 'caveWall', 'rock',
  'ruinFloor', 'ruinFloorDark', 'pillar',
  'dirt', 'dirtDark', 'palisade',
  'bossFloor', 'bossFloorDark',
  // Urwald, Teich, Wiese, Sumpf (Erweiterung 2, Abschnitt 2)
  'water', 'swampFloor', 'swampFloorDark', 'reed',
];

/** Toene: Schluessel -> Dateiname (ohne .wav). */
export const SOUNDS = [
  'swing', 'hit', 'hitCrit', 'enemyDeath', 'playerHit', 'block',
  'coin', 'bow', 'arrowHit', 'roll', 'potion',
  'levelClear', 'bossPhase', 'playerDeath', 'buy', 'skillPoint',
];

/**
 * Alles laden, was da ist. Fehlende Dateien werden nur gezaehlt, nicht als
 * Fehler behandelt — das Spiel startet auch ohne jede Datei.
 *
 * @param {(geladen: number, gesamt: number) => void} [onProgress]
 * @returns {Promise<{sprites: number, sounds: number, fehlend: string[]}>}
 */
export async function loadAssets(onProgress) {
  const jobs = [];
  const fehlend = [];
  let sprites = 0;
  let sounds = 0;

  for (const [key, file] of Object.entries(ENTITY_SPRITES)) {
    jobs.push(loadSprite(key, `${SPRITE_DIR}/${file}.png`)
      .then(() => { sprites += 1; })
      .catch(() => fehlend.push(`${file}.png`)));
  }
  for (const name of TILE_SPRITES) {
    jobs.push(loadSprite(`tile.${name}`, `${SPRITE_DIR}/tile_${name}.png`)
      .then(() => { sprites += 1; })
      .catch(() => fehlend.push(`tile_${name}.png`)));
  }
  for (const name of SOUNDS) {
    jobs.push(loadSound(name, `${SOUND_DIR}/${name}.wav`)
      .then(() => { sounds += 1; })
      .catch(() => fehlend.push(`${name}.wav`)));
  }

  let fertig = 0;
  await Promise.all(jobs.map((p) => p.then(() => {
    fertig += 1;
    onProgress?.(fertig, jobs.length);
  })));

  return { sprites, sounds, fehlend };
}
