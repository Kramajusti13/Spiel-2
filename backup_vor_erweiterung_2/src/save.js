/**
 * save.js — Spielstand im localStorage (Abschnitt 9, erweitert in Schritt 9).
 *
 * GESPEICHERT WIRD:
 *   gold             Kontostand
 *   unlockedLevel    hoechstes freigeschaltetes Level
 *   bestDifficulty   je Level die hoechste dort geschaffte Stufe (Abschnitt 4)
 *   stats            alle Zaehler, inkl. "Alptraum ohne Tod" je Level (Abschn. 3)
 *   claimedQuests    IDs der Quests, deren Belohnung abgeholt ist
 *   levelIndex       zuletzt gespieltes Level (traegt die Kurzfassung im Menue)
 *   progress         Ausruestung, Heiltraenke, Skills, Skillpunkte, Stufe, XP
 *
 * BEWUSST NICHT GESPEICHERT — alles, was nur fuer einen Durchgang gilt:
 *   die Lage im Level, Leben, tote Gegner, eingesammelte Muenzen,
 *   difficulty (Stufe des laufenden Durchgangs), runGold, levelCleared,
 *   deathsThisLevel und deathsThisRun.
 * Ein Spielstand ist der Stand *zwischen* den Leveln, nicht mitten im Kampf.
 *
 * ALTE STAENDE werden weitergelesen statt verworfen. Deshalb bleibt
 * SAVE.version bei 1: Hochzaehlen wuerde vorhandene Staende wegwerfen, obwohl
 * sie sich vollstaendig umrechnen lassen. Die drei Wege:
 *   - ohne stats, aber mit kills          -> wird zum Gesamt-Killzaehler
 *   - ohne bestDifficulty, mit completed  -> zaehlt als "auf Normal geschafft"
 *   - keins von beidem                    -> aus unlockedLevel zurueckgerechnet
 * Fehlende Felder bekommen ihren Startwert; niemand verliert Fortschritt.
 *
 * Alles hier ist gegen Fehler abgesichert: localStorage kann im privaten Modus
 * werfen, und ein von Hand veraenderter Spielstand darf das Spiel nicht
 * zerlegen. Im Zweifel wird wie bei einem neuen Spiel gestartet.
 */

import { SAVE, LEVELS, SWORD, SHIELD, BOW, CONSUMABLES, DIFFICULTY_ORDER, XP } from './config.js';
import { createProgress } from './entities/player.js';
import { sanitizeStats } from './stats.js';
import { sanitizeClaimed } from './quests.js';
import { SKILL_ORDER, skillDef } from './skills.js';
import { clamp } from './util.js';

/**
 * Fortschrittsfelder, die loadProgress() einzeln prueft und begrenzt.
 *
 * Waechst createProgress() um ein Feld, ohne dass es hier auftaucht, meldet
 * sich beim Laden die Konsole. Ohne diese Warnung wuerde so ein Feld zwar
 * gespeichert, beim Laden aber stillschweigend auf den Startwert zurueck-
 * fallen — ein Fehler, den man erst Wochen spaeter bemerkt.
 */
const PROGRESS_KEYS = [
  'swordTier', 'shieldTier', 'bowTier', 'weapon', 'potions',
  'skillPoints', 'skills', 'level', 'xp',
];

{
  const unbekannt = Object.keys(createProgress()).filter((k) => !PROGRESS_KEYS.includes(k));
  if (unbekannt.length) {
    console.warn(`save.js kennt diese Fortschrittsfelder nicht: ${unbekannt.join(', ')} — `
      + 'sie fallen beim Laden auf ihren Startwert zurueck. PROGRESS_KEYS und '
      + 'loadProgress() in save.js ergaenzen.');
  }
}

/**
 * Zaehler lesen. Ein Stand von vor Schritt 7 hat nur `kills` — daraus wird
 * der Gesamtzaehler, der Rest faengt bei null an.
 */
function readStats(data) {
  const stats = sanitizeStats(data.stats);
  if (!data.stats && Number.isFinite(data.kills)) {
    stats.killsTotal = Math.max(0, Math.floor(data.kills));
  }
  return stats;
}

/** Liest den Rohtext; gibt null zurueck, wenn nichts da oder nichts lesbar ist. */
function readRaw() {
  try {
    return window.localStorage.getItem(SAVE.key);
  } catch {
    return null;   // privater Modus o. Ae. — dann eben ohne Speichern spielen
  }
}

/**
 * Fortschritt lesen und begrenzen. Jeder Wert wird geprueft: ein von Hand
 * editierter Stand soll das Spiel hoechstens seltsam machen, nicht kaputt.
 */
function loadProgress(src) {
  const p = createProgress();
  p.swordTier = clamp(Math.floor(src.swordTier ?? 0), 0, SWORD.tiers.length - 1);
  p.shieldTier = clamp(Math.floor(src.shieldTier ?? 0), 0, SHIELD.tiers.length - 1);
  p.bowTier = clamp(Math.floor(src.bowTier ?? -1), -1, BOW.tiers.length - 1);
  p.weapon = src.weapon === 'bow' && p.bowTier >= 0 ? 'bow' : 'sword';
  p.potions = clamp(Math.floor(src.potions ?? 0), 0, CONSUMABLES.potion.maxCarried);
  p.skillPoints = Math.max(0, Math.floor(src.skillPoints ?? 0));
  // Stufe und XP (Erweiterung, Abschnitt 1). Ein alter Stand ohne diese
  // Felder faengt bei Stufe 1 an — die Punkte aus der alten Kill-Regel
  // bleiben ihm als Startgeschenk erhalten.
  p.level = clamp(Math.floor(src.level ?? 1), 1, XP.maxLevel);
  p.xp = Math.max(0, Math.floor(src.xp ?? 0));
  p.skills = {};
  for (const id of SKILL_ORDER) {
    const rank = Math.floor(src.skills?.[id] ?? 0);
    if (rank > 0) p.skills[id] = clamp(rank, 0, skillDef(id).maxRank);
  }
  return p;
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
 * @returns {null | { gold, unlockedLevel, bestDifficulty, stats, claimedQuests, levelIndex, progress }}
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

  const p = loadProgress(data.progress ?? {});

  // Pro Level die hoechste dort geschaffte Schwierigkeitsstufe als Index,
  // -1 = noch nie geschafft (Abschnitt 4).
  //
  // Zwei aeltere Formate werden mitgelesen: ein Stand mit `completed` (vor den
  // Schwierigkeitsstufen) zaehlt als "auf Normal geschafft", ein Stand ganz
  // ohne beides wird aus unlockedLevel zurueckgerechnet — wer Level 3 offen
  // hat, muss 1 und 2 geschafft haben.
  const unlocked = clamp(Math.floor(data.unlockedLevel ?? 0), 0, LEVELS.length - 1);
  const maxDiff = DIFFICULTY_ORDER.length - 1;
  const bestDifficulty = LEVELS.map((_, i) => {
    if (Array.isArray(data.bestDifficulty)) {
      return clamp(Math.floor(data.bestDifficulty[i] ?? -1), -1, maxDiff);
    }
    if (Array.isArray(data.completed)) return data.completed[i] ? 0 : -1;
    return i < unlocked ? 0 : -1;
  });

  return {
    gold: Math.max(0, Math.floor(data.gold ?? 0)),
    unlockedLevel: unlocked,
    bestDifficulty,
    // Alle Quest-Zaehler (Schritt 7). Ein aelterer Stand ohne dieses Feld
    // faengt bei null an — der Fortschritt der Level bleibt davon unberuehrt.
    stats: readStats(data),
    // Abgeholte Quests (Schritt 8). Der Fortschritt selbst steckt in den
    // Zaehlern und muss nicht extra gespeichert werden.
    claimedQuests: sanitizeClaimed(data.claimedQuests),
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
    unlockedLevel: game.unlockedLevel,
    bestDifficulty: game.bestDifficulty,
    stats: game.stats,
    claimedQuests: game.claimedQuests,
    levelIndex: game.levelIndex,
    // Vollstaendig kopieren statt Feld fuer Feld: ein neues Feld in
    // createProgress() ist damit automatisch mitgespeichert. Beim LADEN wird
    // trotzdem jedes Feld einzeln geprueft (loadProgress).
    progress: { ...game.progress },
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
  return `${LEVELS[s.levelIndex].name} · Stufe ${s.progress.level} · ${s.gold} Gold · ${s.stats.killsTotal} Monster`;
}
