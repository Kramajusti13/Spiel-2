/**
 * stats.js — zentrale Zaehler (Erweiterung, Schritt 7).
 *
 * Grundlage fuer das Quest-System: alle Quest-Typen aus Abschnitt 3 lassen
 * sich mit einfachen Zaehlern erfuellen, damit spaeter neue Quests ohne
 * Codeaenderung moeglich sind — es braucht dann nur einen Eintrag in der
 * Questliste in config.js.
 *
 *   Typ              Beispiel                            Zaehler
 *   Toeten           "Besiege 20 Goblins"                killsByType
 *   Sammeln          "Sammle 500 Gold"                   goldEarned
 *   Abschluss        "Schaffe die Ruinen"                clearsByLevel
 *   Herausforderung  "Schaffe ein Level ohne zu sterben" cleanRuns
 *   Herausforderung  "Besiege 10 Gegner mit dem Bogen"   killsByWeapon
 *   Herausforderung  "Blocke 15 Angriffe"                blocks
 *   Fortschritt      "Erreiche Stufe 5"                  (Heldenstufe, nicht hier)
 *
 * Alle Zaehler laufen spieluebergreifend weiter und werden nie kleiner —
 * auch nicht bei einem Tod. Sonst waere ein Questfortschritt nichts wert.
 */

import { DIFFICULTY_ORDER, ENEMIES, LEVELS } from './config.js';

/**
 * Waffen, nach denen Kills getrennt gezaehlt werden. 'spear' kommt mit
 * Erweiterung 2 (Abschnitt 3) dazu und traegt spaeter die Quest
 * "Besiege 20 Gegner mit dem Speer".
 */
export const WEAPONS = ['sword', 'bow', 'spear'];

export function createStats() {
  return {
    // --- Kills ---
    killsTotal: 0,
    /** Monstertyp -> Anzahl, z. B. killsByType.goblin */
    killsByType: Object.fromEntries(Object.keys(ENEMIES).map((k) => [k, 0])),
    /** Waffe -> Anzahl. Zaehlt der letzte Treffer, der den Gegner faellt. */
    killsByWeapon: Object.fromEntries(WEAPONS.map((k) => [k, 0])),

    // --- Gold ---
    /**
     * Insgesamt eingesammeltes Gold. Waechst nur — Kaeufe und
     * Wiederbelebungen ziehen hier nichts ab, sonst waere "Sammle 500 Gold"
     * eine Quest ueber den Kontostand statt ueber die Leistung.
     */
    goldEarned: 0,
    goldSpent: 0,

    // --- Kampf ---
    /** Erfolgreich geblockte Angriffe. */
    blocks: 0,
    deaths: 0,
    revives: 0,
    potionsUsed: 0,

    // --- Level ---
    /** Gestartete Durchgaenge. */
    levelRuns: 0,
    /** Abgeschlossene Durchgaenge insgesamt. */
    levelsCleared: 0,
    /** Abgeschlossene Durchgaenge ohne einen einzigen Tod. */
    cleanRuns: 0,
    /**
     * Abgeschlossene Durchgaenge ohne eine einzige Vergiftung
     * (Erweiterung 2, Abschnitt 8 — traegt Quest 6).
     */
    poisonFreeRuns: 0,
    /** Ist das Spiel einmal durchgespielt? (Erweiterung 2, Abschnitt 2) */
    gameCompleted: false,
    /** Je Level: wie oft abgeschlossen. */
    clearsByLevel: LEVELS.map(() => 0),
    /**
     * Je Schwierigkeitsstufe: wie viele Level-Abschluesse darauf.
     * Traegt die Quest "Schaffe ein Level auf Schwer".
     */
    clearsByDifficulty: DIFFICULTY_ORDER.map(() => 0),
    /** Je Level: Tode insgesamt. */
    deathsByLevel: LEVELS.map(() => 0),
    /**
     * Je Level: auf Alptraum ohne einen einzigen Tod geschafft (Quest 11).
     *
     * Einmal true bleibt true — ein spaeterer Fehlversuch nimmt es nicht
     * zurueck ("Kein Zuruecksetzen", Abschnitt 3).
     */
    nightmareNoDeath: LEVELS.map(() => false),
  };
}

/**
 * Einen Kill verbuchen.
 * @param {object} stats
 * @param {string} type   Monstertyp
 * @param {string|null} weapon  Waffe des toedlichen Treffers
 */
export function recordKill(stats, type, weapon) {
  stats.killsTotal += 1;
  if (type in stats.killsByType) stats.killsByType[type] += 1;
  if (weapon && weapon in stats.killsByWeapon) stats.killsByWeapon[weapon] += 1;
}

/**
 * Abschluesse auf dieser Stufe ODER hoeher. "Schaffe ein Level auf Schwer"
 * soll auch ein Alptraum-Durchgang erfuellen — schwerer ist nicht weniger.
 */
export function clearsAtLeast(stats, difficultyId) {
  const from = DIFFICULTY_ORDER.indexOf(difficultyId);
  if (from < 0) return 0;
  return stats.clearsByDifficulty.slice(from).reduce((a, b) => a + b, 0);
}

/** Wie viele Level auf Alptraum ohne Tod geschafft sind (Quest 11: x/5). */
export function nightmareNoDeathCount(stats) {
  return stats.nightmareNoDeath.filter(Boolean).length;
}

/**
 * Gelesenen Spielstand auf gueltige Werte begrenzen.
 * Ein von Hand veraenderter Stand darf das Spiel nicht zerlegen; fehlende
 * Felder (aelterer Stand) kommen mit ihrem Startwert dazu.
 */
export function sanitizeStats(raw) {
  const stats = createStats();
  if (!raw || typeof raw !== 'object') return stats;

  const num = (v) => (Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);

  for (const key of ['killsTotal', 'goldEarned', 'goldSpent', 'blocks', 'deaths',
    'revives', 'potionsUsed', 'levelRuns', 'levelsCleared', 'cleanRuns',
    'poisonFreeRuns']) {
    stats[key] = num(raw[key]);
  }
  stats.gameCompleted = raw.gameCompleted === true;
  for (const key of Object.keys(stats.killsByType)) {
    stats.killsByType[key] = num(raw.killsByType?.[key]);
  }
  for (const key of Object.keys(stats.killsByWeapon)) {
    stats.killsByWeapon[key] = num(raw.killsByWeapon?.[key]);
  }
  // Nur echte Listen uebernehmen: aus einem von Hand eingetragenen String
  // wuerde sonst zeichenweise ein Fortschritt entstehen.
  const list = (v) => (Array.isArray(v) ? v : []);
  const clears = list(raw.clearsByLevel);
  const deaths = list(raw.deathsByLevel);
  const clean = list(raw.nightmareNoDeath);
  const byDiff = list(raw.clearsByDifficulty);
  DIFFICULTY_ORDER.forEach((_, i) => { stats.clearsByDifficulty[i] = num(byDiff[i]); });
  LEVELS.forEach((_, i) => {
    stats.clearsByLevel[i] = num(clears[i]);
    stats.deathsByLevel[i] = num(deaths[i]);
    stats.nightmareNoDeath[i] = clean[i] === true;
  });
  return stats;
}
