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

import { LEVELS, QUESTS, QUEST_SLOTS, QUESTS_UNLOCK_LEVEL } from './config.js';
import { maxPotions } from './gear.js';
import { clearsAtLeast, killsAtLeast, nightmareNoDeathCount } from './stats.js';

/**
 * Reihenfolge der Klassen fuer die Nachrueck-Logik (VERBESSERUNGEN_1
 * Abschnitt 8): pro Klasse ist immer genau eine Quest aktiv.
 */
export const QUEST_TIERS = ['leicht', 'mittel', 'schwer'];

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
  const parts = String(counter).split(':');
  const kind = parts[0];
  const arg = parts[1];
  const arg2 = parts[2];

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
    case 'killDiff':
      // "Besiege den Ork-Haeuptling auf Schwer" (Abschnitt 8):
      // killDiff:<typ>:<mindiff> — Kills auf mindiff oder hoeher.
      return killsAtLeast(stats, arg, arg2);
    case 'replay1to5': {
      // "Spiele einen der Abschnitte 1-5 noch einmal durch": jeder Clear
      // ueber den ersten hinaus zaehlt, addiert ueber die ersten 5 Level.
      let sum = 0;
      for (let i = 0; i < 5; i++) sum += Math.max(0, (stats.clearsByLevel[i] ?? 0) - 1);
      return sum;
    }
    default:
      console.warn(`Unbekannter Quest-Zaehler "${counter}" (siehe QUESTS in config.js).`);
      return 0;
  }
}

/**
 * Ist das Questmenue freigeschaltet? (Erweiterung 2, Abschnitt 8)
 *
 * Erst nach Abschluss des Urwalds — vorher waeren die Aufgaben nicht einmal
 * angehbar ("Besiege 15 Gorillas" gibt es vor dem Urwald nicht).
 */
export function questsUnlocked(game) {
  const i = QUESTS_UNLOCK_LEVEL;
  if (i >= LEVELS.length) return true;
  return (game.bestDifficulty?.[i] ?? -1) >= 0;
}

/** Text fuer die gesperrte Kachel. */
export function questLockText() {
  return `Wird im ${LEVELS[QUESTS_UNLOCK_LEVEL]?.name ?? 'Urwald'} freigeschaltet`;
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
 * Die aktiven Quests: pro Klasse (leicht/mittel/schwer) die naechste noch
 * nicht abgeholte Quest. Ergebnis hat immer drei Eintraege — ist eine Klasse
 * leer (alles geschafft), steht dort null (VERBESSERUNGEN_1 Abschnitt 8).
 *
 * @param {number[]} claimed Bereits abgeholte Quest-IDs
 * @returns {Array<object|null>} in Reihenfolge leicht, mittel, schwer
 */
export function activeQuests(claimed) {
  const claimedSet = new Set(claimed);
  return QUEST_TIERS.map(
    (tier) => QUESTS.find((q) => q.tier === tier && !claimedSet.has(q.id)) ?? null,
  );
}

/** Alle Quests erledigt? Alle Klassen haben keinen offenen Eintrag mehr. */
export function allQuestsDone(claimed) {
  return activeQuests(claimed).every((q) => q === null);
}

/**
 * Belohnung auszahlen. Prueft selbst, ob die Quest aktiv und fertig ist.
 * @returns {null | { quest, parts: string[] }} was gutgeschrieben wurde
 */
export function claimQuest(id, game) {
  if (!questsUnlocked(game)) return null;
  if (game.claimedQuests.includes(id)) return null;
  const quest = questById(id);
  if (!quest) return null;
  // Nur was gerade aktiv ist, laesst sich abholen — sonst koennte eine spaete
  // Quest an den drei Feldern vorbei kassiert werden.
  if (!activeQuests(game.claimedQuests).some((q) => q && q.id === id)) return null;
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
    game.progress.potions = Math.min(before + r.potions, maxPotions(game.progress));
    const got = game.progress.potions - before;
    // Volles Gepaeck: ehrlich sagen, dass der Trank nicht gepasst hat.
    parts.push(got > 0
      ? `${got} Heiltrank`
      : `Heiltrank (Gepaeck voll, ${maxPotions(game.progress)} dabei)`);
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
