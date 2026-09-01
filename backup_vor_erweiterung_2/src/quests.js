/**
 * quests.js — das Quest-System (Erweiterung, Abschnitt 3, Schritt 8).
 *
 * Hier steht ausdruecklich KEIN Code pro Quest. Eine Quest ist ein Eintrag in
 * QUESTS (config.js), der einen Zaehler und einen Zielwert nennt; diese Datei
 * loest den Zaehler auf, rechnet den Fortschritt aus und zahlt die Belohnung.
 * Eine neue Quest ist damit eine Zeile in config.js, kein Programmierauftrag.
 *
 * Regeln aus Abschnitt 3:
 *   - Immer genau drei Quests aktiv; ist eine abgeholt, rueckt die naechste nach.
 *   - Der Fortschritt laeuft automatisch mit — nichts muss angenommen werden.
 *   - Nur die Belohnung wird per Klick abgeholt.
 */

import { CONSUMABLES, QUESTS, QUEST_SLOTS } from './config.js';
import { clearsAtLeast, nightmareNoDeathCount } from './stats.js';

/**
 * Den Zaehler einer Quest ablesen.
 *
 * Die Praefixe sind der ganze "Wortschatz" der Questliste — wer eine Quest
 * eines schon bekannten Typs hinzufuegt, kommt hier nie vorbei.
 *
 * @param {string} counter Zaehlerangabe aus dem Questeintrag
 * @param {import('./game.js').Game} game
 * @returns {number}
 */
export function counterValue(counter, game) {
  const stats = game.stats;
  const [kind, arg] = String(counter).split(':');

  switch (kind) {
    case 'kills':
      return stats.killsByType[arg] ?? 0;
    case 'weapon':
      return stats.killsByWeapon[arg] ?? 0;
    case 'level':
      return stats.clearsByLevel[Number(arg)] ?? 0;
    case 'difficulty':
      return clearsAtLeast(stats, arg);
    case 'stat':
      return Number(stats[arg]) || 0;
    case 'heroLevel':
      return game.heroLevel;
    case 'nightmareNoDeath':
      return nightmareNoDeathCount(stats);
    default:
      console.warn(`Unbekannter Quest-Zaehler "${counter}" (siehe QUESTS in config.js).`);
      return 0;
  }
}

export function questById(id) {
  return QUESTS.find((q) => q.id === id) ?? null;
}

/**
 * Fortschritt einer Quest.
 * @returns {{ quest, value: number, target: number, ratio: number, done: boolean }}
 */
export function questProgress(quest, game) {
  const target = Math.max(1, quest.target);
  // Nach oben begrenzen: "24/20 Goblins" saehe nach einem Fehler aus.
  const value = Math.min(counterValue(quest.counter, game), target);
  return { quest, value, target, ratio: value / target, done: value >= target };
}

/**
 * Die aktiven Quests: die ersten drei aus der Liste, deren Belohnung noch
 * nicht abgeholt ist. Dadurch rueckt beim Abholen automatisch die naechste
 * nach — ohne eigene Verwaltung, wer wann freigeschaltet wurde.
 *
 * @param {number[]} claimed Bereits abgeholte Quest-IDs
 */
export function activeQuests(claimed) {
  return QUESTS.filter((q) => !claimed.includes(q.id)).slice(0, QUEST_SLOTS);
}

/** Alle Quests erledigt? Dann ist die Liste leer und das Feld meldet das. */
export function allQuestsDone(claimed) {
  return activeQuests(claimed).length === 0;
}

/**
 * Belohnung auszahlen. Prueft selbst, ob die Quest aktiv und fertig ist.
 * @returns {null | { quest, parts: string[] }} was gutgeschrieben wurde
 */
export function claimQuest(id, game) {
  if (game.claimedQuests.includes(id)) return null;
  const quest = questById(id);
  if (!quest) return null;
  // Nur was gerade aktiv ist, laesst sich abholen — sonst koennte eine spaete
  // Quest an den drei Feldern vorbei kassiert werden.
  if (!activeQuests(game.claimedQuests).some((q) => q.id === id)) return null;
  if (!questProgress(quest, game).done) return null;

  const r = quest.reward ?? {};
  const parts = [];

  if (r.gold) {
    game.gold += r.gold;
    parts.push(`${r.gold} Gold`);
  }
  if (r.xp) {
    game.gainXp(r.xp);
    parts.push(`${r.xp} XP`);
  }
  if (r.potions) {
    const before = game.progress.potions;
    game.progress.potions = Math.min(before + r.potions, CONSUMABLES.potion.maxCarried);
    const got = game.progress.potions - before;
    // Volles Gepaeck: ehrlich sagen, dass der Trank nicht gepasst hat.
    parts.push(got > 0
      ? `${got} Heiltrank`
      : `Heiltrank (Gepaeck voll, ${CONSUMABLES.potion.maxCarried} dabei)`);
  }
  if (r.skillPoints) {
    game.progress.skillPoints += r.skillPoints;
    parts.push(`${r.skillPoints} Skillpunkte`);
  }

  game.claimedQuests.push(id);
  return { quest, parts };
}

/** Belohnung als Text fuer die Anzeige, z. B. "50 G + 50 XP". */
export function rewardText(quest) {
  const r = quest.reward ?? {};
  const parts = [];
  if (r.gold) parts.push(`${r.gold} G`);
  if (r.xp) parts.push(`${r.xp} XP`);
  if (r.potions) parts.push(`${r.potions} Heiltrank`);
  if (r.skillPoints) parts.push(`${r.skillPoints} Skillpunkte`);
  return parts.join(' + ');
}

/** Gelesene Quest-IDs aus dem Spielstand auf gueltige Werte begrenzen. */
export function sanitizeClaimed(raw) {
  if (!Array.isArray(raw)) return [];
  const known = new Set(QUESTS.map((q) => q.id));
  return [...new Set(raw.map(Number).filter((id) => known.has(id)))];
}
