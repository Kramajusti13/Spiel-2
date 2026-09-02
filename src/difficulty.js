/**
 * difficulty.js — Schwierigkeitsstufen (Erweiterung, Abschnitt 4).
 *
 * Nur Rechnerei, kein Zustand: die Multiplikatoren stehen in config.js, die
 * hoechste je Level geschaffte Stufe haelt game.js und speichert save.js.
 *
 * Die wichtigste Regel steht in scaleEnemyDef(): angefasst werden HP, Schaden
 * und (auf Alptraum) das Tempo — die Ausholphase nie.
 */

import { DIFFICULTIES, DIFFICULTY_ORDER } from './config.js';

/** Werte einer Stufe. Unbekannte IDs fallen auf Normal zurueck. */
export function difficultyDef(id) {
  return DIFFICULTIES[id] ?? DIFFICULTIES[DIFFICULTY_ORDER[0]];
}

export function difficultyName(id) {
  return difficultyDef(id).name;
}

/** Position in der Reihenfolge; -1, wenn die ID nicht existiert. */
export function difficultyIndex(id) {
  return DIFFICULTY_ORDER.indexOf(id);
}

export function difficultyAt(index) {
  return DIFFICULTY_ORDER[index] ?? DIFFICULTY_ORDER[0];
}

/**
 * Welche Stufen fuer ein Level waehlbar sind.
 *
 * Freigeschaltet wird immer genau eine Stufe ueber der hoechsten dort
 * geschafften: Normal von Anfang an, Schwer nach Normal, Alptraum nach Schwer.
 *
 * @param {number} best Index der hoechsten dort geschafften Stufe, -1 = keine
 * @returns {string[]} IDs in Reihenfolge
 */
export function unlockedDifficulties(best) {
  const highest = Math.min(best + 1, DIFFICULTY_ORDER.length - 1);
  return DIFFICULTY_ORDER.slice(0, highest + 1);
}

export function isDifficultyUnlocked(id, best) {
  const i = difficultyIndex(id);
  return i >= 0 && i <= best + 1;
}

/** Zielgenauigkeits-Multiplikator der Gegner (schnelleres Nachdrehen im Windup). */
export function difficultyAim(id) {
  return difficultyDef(id).aim ?? 1;
}

/**
 * Verhaltens-Schalter fuer die KI (VERBESSERUNGEN_1 Abschnitt 5):
 * { surround, staggerAttacks, punishDodge } pro Stufe. Fehlt einer,
 * gilt false — damit bleibt Normal beim alten Verhalten.
 */
export function difficultyBehavior(id) {
  const d = difficultyDef(id);
  return {
    surround: !!d.surround,
    staggerAttacks: !!d.staggerAttacks,
    punishDodge: !!d.punishDodge,
  };
}

/** Gefuellte Sterne am Levelknoten: 0 = nie geschafft, 3 = Alptraum. */
export function starsFor(best) {
  return best < 0 ? 0 : difficultyDef(difficultyAt(best)).stars;
}

/**
 * Gegner-Bauplan fuer eine Schwierigkeitsstufe umrechnen.
 *
 * Gibt eine KOPIE zurueck; der Eintrag in config.js bleibt unberuehrt. Weil
 * jeder Gegner seinen eigenen `def` bekommt, wirken die neuen Werte ueberall,
 * wo der Code schon `this.def.speed` oder `this.def.damage` liest — die
 * Gegnerklassen mussten dafuer nicht angefasst werden.
 *
 * Bewusst NICHT angefasst:
 *   - windupTime, strikeTime, recoverTime — die Reaktionszeit bleibt gleich
 *   - projectileSpeed — ein schnellerer Pfeil ist auch nur weniger Reaktionszeit
 */
export function scaleEnemyDef(def, id) {
  const d = difficultyDef(id);
  const atkSpeed = d.attackSpeed ?? 1;
  if (d.hp === 1 && d.damage === 1 && d.speed === 1 && atkSpeed === 1) return def;

  const scaled = {
    ...def,
    maxHp: Math.round(def.maxHp * d.hp),
    damage: Math.round(def.damage * d.damage),
    speed: def.speed * d.speed,
    // Hoehere Stufen: kuerzere Ausholphase und Erholung -> schnellere Angriffe.
    windupTime: def.windupTime != null ? def.windupTime / atkSpeed : def.windupTime,
    recoverTime: def.recoverTime != null ? def.recoverTime / atkSpeed : def.recoverTime,
  };

  // Sonderangriffe des Bosses tragen ihren Schaden selbst.
  if (def.charge) {
    scaled.charge = {
      ...def.charge,
      damage: Math.round(def.charge.damage * d.damage),
      speed: def.charge.speed * d.speed,
    };
  }
  if (def.slam) {
    scaled.slam = { ...def.slam, damage: Math.round(def.slam.damage * d.damage) };
  }
  return scaled;
}
