/**
 * save.js — Spielstand im localStorage (Abschnitt 9).
 *
 * Gespeichert wird genau das, was das Dokument nennt: Gold, Ausruestungsstufen,
 * Skillpunkte (vergeben + Pool), hoechstes freigeschaltetes Level, Anzahl
 * getoeteter Monster und Heiltraenke. Bewusst NICHT gespeichert: die Lage im
 * Level, Leben oder tote Gegner — ein Spielstand ist der Stand *zwischen* den
 * Leveln, nicht mitten im Kampf.
 *
 * Alles hier ist gegen Fehler abgesichert: localStorage kann im privaten Modus
 * werfen, und ein von Hand veraenderter Spielstand darf das Spiel nicht
 * zerlegen. Im Zweifel wird wie bei einem neuen Spiel gestartet.
 */

import { SAVE, LEVELS, SWORD, SHIELD, BOW, CONSUMABLES } from './config.js';
import { createProgress } from './entities/player.js';
import { SKILL_ORDER, skillDef } from './skills.js';
import { clamp } from './util.js';

/** Liest den Rohtext; gibt null zurueck, wenn nichts da oder nichts lesbar ist. */
function readRaw() {
  try {
    return window.localStorage.getItem(SAVE.key);
  } catch {
    return null;   // privater Modus o. Ae. — dann eben ohne Speichern spielen
  }
}

/**
 * Gibt es einen Stand, der sich auch wirklich laden laesst?
 * Bewusst nicht nur "Schluessel vorhanden": sonst boete das Hauptmenue
 * "Weiterspielen" an und startete beim Klick doch ein neues Spiel.
 */
export function hasSave() {
  return loadGame() !== null;
}

/**
 * Spielstand lesen und auf gueltige Werte begrenzen.
 * @returns {null | { gold, kills, unlockedLevel, levelIndex, progress }}
 */
export function loadGame() {
  const raw = readRaw();
  if (!raw) return null;

  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    console.warn('Spielstand ist beschaedigt und wird ignoriert.');
    return null;
  }
  if (!data || typeof data !== 'object') return null;
  if (data.version !== SAVE.version) {
    console.warn(`Spielstand hat Version ${data.version}, erwartet ${SAVE.version} — wird ignoriert.`);
    return null;
  }

  // Jeder Wert wird begrenzt: ein von Hand editierter Stand soll das Spiel
  // hoechstens seltsam machen, nicht kaputt.
  const p = createProgress();
  const src = data.progress ?? {};
  p.swordTier = clamp(Math.floor(src.swordTier ?? 0), 0, SWORD.tiers.length - 1);
  p.shieldTier = clamp(Math.floor(src.shieldTier ?? 0), 0, SHIELD.tiers.length - 1);
  p.bowTier = clamp(Math.floor(src.bowTier ?? -1), -1, BOW.tiers.length - 1);
  p.weapon = src.weapon === 'bow' && p.bowTier >= 0 ? 'bow' : 'sword';
  p.potions = clamp(Math.floor(src.potions ?? 0), 0, CONSUMABLES.potion.maxCarried);
  p.skillPoints = Math.max(0, Math.floor(src.skillPoints ?? 0));
  p.skills = {};
  for (const id of SKILL_ORDER) {
    const rank = Math.floor(src.skills?.[id] ?? 0);
    if (rank > 0) p.skills[id] = clamp(rank, 0, skillDef(id).maxRank);
  }

  return {
    gold: Math.max(0, Math.floor(data.gold ?? 0)),
    kills: Math.max(0, Math.floor(data.kills ?? 0)),
    unlockedLevel: clamp(Math.floor(data.unlockedLevel ?? 0), 0, LEVELS.length - 1),
    levelIndex: clamp(Math.floor(data.levelIndex ?? 0), 0, LEVELS.length - 1),
    progress: p,
  };
}

/**
 * Speichern. Wird nach jedem abgeschlossenen Level und nach jedem Kauf
 * aufgerufen (Abschnitt 9).
 * @returns {boolean} true, wenn es geklappt hat
 */
export function saveGame(game) {
  if (!SAVE.enabled) return false;
  const data = {
    version: SAVE.version,
    gespeichert: new Date().toISOString(),
    gold: game.gold,
    kills: game.kills,
    unlockedLevel: game.unlockedLevel,
    levelIndex: game.levelIndex,
    progress: {
      swordTier: game.progress.swordTier,
      shieldTier: game.progress.shieldTier,
      bowTier: game.progress.bowTier,
      weapon: game.progress.weapon,
      potions: game.progress.potions,
      skillPoints: game.progress.skillPoints,
      skills: game.progress.skills,
    },
  };
  try {
    window.localStorage.setItem(SAVE.key, JSON.stringify(data));
    return true;
  } catch (err) {
    console.warn('Spielstand konnte nicht gespeichert werden:', err.message);
    return false;
  }
}

export function clearSave() {
  try {
    window.localStorage.removeItem(SAVE.key);
    return true;
  } catch {
    return false;
  }
}

/** Kurzfassung fuer das Hauptmenue, z. B. "Ruinen · 340 Gold · 62 Monster". */
export function saveSummary() {
  const s = loadGame();
  if (!s) return null;
  return `${LEVELS[s.levelIndex].name} · ${s.gold} Gold · ${s.kills} Monster besiegt`;
}
