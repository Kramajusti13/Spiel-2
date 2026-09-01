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
 * VERSIONEN (Erweiterung 2, Abschnitt 6). Zwei Faelle, die man nicht
 * verwechseln darf:
 *
 *   Gleiche Version, aelteres Format -> wird weitergelesen. Fehlende Felder
 *   bekommen ihren Startwert, niemand verliert Fortschritt. Die drei Wege:
 *     - ohne stats, aber mit kills          -> wird zum Gesamt-Killzaehler
 *     - ohne bestDifficulty, mit completed  -> zaehlt als "auf Normal geschafft"
 *     - keins von beidem                    -> aus unlockedLevel zurueckgerechnet
 *
 *   Andere Version -> der Stand wird einmalig geloescht und der Spieler
 *   bekommt beim naechsten Start einen Hinweis (takeResetNotice). Das ist
 *   noetig, wenn sich nicht das Format, sondern die BEDEUTUNG der Werte
 *   aendert: mit der neuen XP-Kurve (x1,25 statt x1,4) steht dieselbe
 *   gespeicherte Stufe fuer eine voellig andere Spielzeit. Geloescht wird
 *   sofort und nicht erst beim naechsten Speichern — sonst laege im
 *   localStorage ein Stand, den das Hauptmenue nicht anbietet, die
 *   Sicherheitsabfrage von "Neues Spiel" aber trotzdem beklagen wuerde.
 *
 * Alles hier ist gegen Fehler abgesichert: localStorage kann im privaten Modus
 * werfen, und ein von Hand veraenderter Spielstand darf das Spiel nicht
 * zerlegen. Im Zweifel wird wie bei einem neuen Spiel gestartet.
 */

import { SAVE, LEVELS, SWORD, SHIELD, BOW, SPEAR, ARMOR, POTION_BELT, CONSUMABLES, DIFFICULTY_ORDER, XP } from './config.js';
import { createProgress } from './entities/player.js';
import { sanitizeStats } from './stats.js';
import { sanitizeClaimed } from './quests.js';
import { SKILL_ORDER, skillDef } from './skills.js';
import { WEAPON_ORDER, initialLoadout, loadout } from './weapons.js';
import { maxPotions, smithLevel } from './gear.js';
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
  'swordTier', 'shieldTier', 'bowTier', 'spearTier', 'weapon', 'loadout',
  'armorTier', 'potionBeltTier', 'smith',
  'potions', 'skillPoints', 'skills', 'level', 'xp',
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
  p.spearTier = clamp(Math.floor(src.spearTier ?? -1), -1, SPEAR.tiers.length - 1);
  // Ausruestungswahl (Erweiterung 2, Abschnitt 4). Geprueft wird sie nicht
  // hier, sondern in weapons.js: loadout() stutzt jede Liste auf besessene,
  // doppelfreie, hoechstens LOADOUT.slots Eintraege zurecht und fuellt leere
  // Plaetze auf. Diese eine Stelle sorgt nur dafuer, dass ueberhaupt eine
  // Liste ankommt — ein von Hand eingetragener String wuerde sonst
  // zeichenweise durchlaufen.
  // Fehlt das Feld ganz, stammt der Stand aus der Zeit vor der
  // Ausruestungswahl: dann kommt mit, was er hat. Steht eine Liste drin, gilt
  // sie genau so — auch wenn der Spieler nur eine Waffe mitnehmen wollte.
  p.loadout = Array.isArray(src.loadout)
    ? loadout({ ...p, loadout: src.loadout })
    : initialLoadout(p);

  // Gefuehrt wird nur, was auch mitgenommen wurde.
  p.weapon = p.loadout.includes(src.weapon) ? src.weapon : p.loadout[0];
  // Neue Gold-Ausgaben (Erweiterung 2, Abschnitt 7). Ein aelterer Stand hat
  // die Felder nicht — dann greifen die Startwerte aus createProgress().
  p.armorTier = clamp(Math.floor(src.armorTier ?? 0), 0, ARMOR.tiers.length - 1);
  p.potionBeltTier = clamp(Math.floor(src.potionBeltTier ?? 0), 0, POTION_BELT.tiers.length - 1);
  // Nur die drei bekannten Waffen uebernehmen: ein Spielstand darf keine
  // eigenen Schluessel in den Schmiede-Zaehler schmuggeln.
  p.smith = {};
  for (const id of WEAPON_ORDER) {
    const stufe = smithLevel({ smith: src.smith }, id);
    if (stufe > 0) p.smith[id] = stufe;
  }
  // Das Gepaeck fasst so viel, wie der geladene Trankguertel hergibt.
  p.potions = clamp(Math.floor(src.potions ?? 0), 0, maxPotions(p));
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
 * Passt die gespeicherte Questliste zur aktuellen? (Erweiterung 2, Abschnitt 8)
 *
 * `claimedQuests` haelt nur IDs fest. Nach dem Austausch der Liste bedeutet
 * dieselbe ID etwas voellig anderes — ein alter Stand haette sonst drei neue
 * Quests als "schon abgeholt" gefuehrt und dem Spieler drei Haken geschenkt
 * statt drei Zielen. Passt die Nummer nicht, werden NUR die abgeholten Quests
 * vergessen; alles andere am Spielstand bleibt erhalten.
 */
function questsPassen(data) {
  if (data.questListVersion === SAVE.questListVersion) return true;
  // Ein Stand ohne abgeholte Quests braucht keinen Hinweis.
  if (Array.isArray(data.claimedQuests) && data.claimedQuests.length > 0) {
    console.warn('Questliste wurde ersetzt — abgeholte Quests werden zurueckgesetzt.');
    questResetPending = true;
  }
  return false;
}

/** Wurden die abgeholten Quests wegen der neuen Liste vergessen? */
let questResetPending = false;

/**
 * Den Quest-Hinweis abholen — danach ist er weg.
 * @returns {null | {text: string, reason: string}} Hinweis, oder null
 */
export function takeQuestResetNotice() {
  if (!questResetPending) return null;
  questResetPending = false;
  return { text: SAVE.questResetNotice, reason: SAVE.questResetReason };
}

/**
 * Wurde in dieser Sitzung ein Stand wegen der Versionsnummer verworfen?
 * Wird von loadGame() gesetzt und vom Hauptmenue einmal abgeholt.
 */
let resetNoticePending = false;

/**
 * Den Hinweis abholen — danach ist er weg (er soll einmal erscheinen, nicht
 * bei jeder Rueckkehr ins Hauptmenue).
 * @returns {null | {text: string, reason: string}} Hinweis, oder null
 */
export function takeResetNotice() {
  if (!resetNoticePending) return null;
  resetNoticePending = false;
  return { text: SAVE.resetNotice, reason: SAVE.resetReason };
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
    console.warn(`Spielstand hat Version ${data.version}, erwartet ${SAVE.version} — `
      + 'wird zurueckgesetzt.');
    clearSave();
    resetNoticePending = true;
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
    claimedQuests: questsPassen(data) ? sanitizeClaimed(data.claimedQuests) : [],
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
    questListVersion: SAVE.questListVersion,
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
