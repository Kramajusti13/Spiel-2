/**
 * shop.js — was im Shop angeboten wird und was ein Kauf bewirkt.
 *
 * Bewusst getrennt von der Anzeige (ui/shopTile.js): hier steht nur, welche
 * Waren es gibt, was sie kosten und wie sie den Fortschritt veraendern. Genau
 * deshalb konnte der Shop in Schritt 3 der Erweiterung ohne Aenderung an der
 * Kauf-Logik vom Canvas in die Dashboard-Kachel umziehen.
 *
 * Waffen sind Upgrades (Abschnitt 5): ein Kauf ersetzt die bisherige Stufe,
 * es gibt kein Inventar. Ist die hoechste Stufe erreicht, faellt der Eintrag weg.
 *
 */

import { SWORD, SHIELD, BOW, SPEAR, ARMOR, POTION_BELT, SMITH, CONSUMABLES } from './config.js';
import { armorTier, beltTier, maxPotions, sharpen, smithLevel, smithMaxed, smithPrice } from './gear.js';
import { loadout } from './weapons.js';
import { spentPoints } from './skills.js';

/**
 * Ein Angebot im Shop.
 * @typedef {object} Offer
 * @property {string} id
 * @property {string} slot     Ausruestungsslot, z. B. "Schwert"
 * @property {string} current  was der Spieler dort gerade hat
 * @property {string} name
 * @property {string} detail   kurze Wirkungsbeschreibung
 * @property {number} price
 * @property {string} [note]   Hinweis, wenn der Kauf gerade nicht geht
 * @property {boolean} sold    true = ausverkauft/Maximum erreicht
 */

/** Nächste Schwertstufe, oder null wenn schon die beste. */
export function nextSwordOffer(progress) {
  const tier = progress.swordTier + 1;
  const now = SWORD.tiers[progress.swordTier];
  const current = `Stufe ${progress.swordTier + 1}`;
  if (tier >= SWORD.tiers.length) {
    return {
      id: 'sword', slot: 'Schwert', current,
      name: now.name, detail: `${now.damage} Schaden — beste Stufe`, price: 0, sold: true,
    };
  }
  const next = SWORD.tiers[tier];
  return {
    id: 'sword',
    slot: 'Schwert',
    current,
    name: next.name,
    detail: `${now.damage} → ${next.damage} Schaden`,
    price: next.price,
    sold: false,
  };
}

/** Nächste Schildstufe, oder null wenn schon die beste. */
export function nextShieldOffer(progress) {
  const tier = progress.shieldTier + 1;
  const now = SHIELD.tiers[progress.shieldTier];
  // Stufe 0 heisst "kein Schild" — das ist keine Stufe, sondern ein leerer Slot.
  const current = progress.shieldTier > 0 ? `Stufe ${progress.shieldTier}` : '—';
  if (tier >= SHIELD.tiers.length) {
    return {
      id: 'shield',
      slot: 'Schild',
      current,
      name: now.name,
      detail: `${Math.round(now.block * 100)} % Block — beste Stufe`,
      price: 0,
      sold: true,
    };
  }
  const next = SHIELD.tiers[tier];
  const penalty = next.speedPenalty > 0 ? `, -${Math.round(next.speedPenalty * 100)} % Tempo` : '';
  return {
    id: 'shield',
    slot: 'Schild',
    current,
    name: next.name,
    detail: `${Math.round(now.block * 100)} → ${Math.round(next.block * 100)} % Schadensblock${penalty}`,
    price: next.price,
    sold: false,
  };
}

/**
 * Naechste Bogenstufe. Vor dem ersten Kauf ist bowTier -1, das erste Angebot
 * ist also der Kurzbogen.
 */
export function nextBowOffer(progress) {
  const tier = progress.bowTier + 1;
  // Vor dem ersten Kauf ist bowTier -1: der Slot ist leer.
  const now = progress.bowTier >= 0 ? BOW.tiers[progress.bowTier] : null;
  const current = now ? `Stufe ${progress.bowTier + 1}` : '—';
  if (tier >= BOW.tiers.length) {
    return {
      id: 'bow', slot: 'Bogen', current,
      name: now.name, detail: `${now.damage} Schaden — beste Stufe`, price: 0, sold: true,
    };
  }
  const next = BOW.tiers[tier];
  const rate = next.fireRateFactor > 1 ? ', doppelte Schussrate' : '';
  const detail = now
    ? `${now.damage} → ${next.damage} Schaden${rate}`
    : `${next.damage} Schaden auf Distanz${rate}`;
  return { id: 'bow', slot: 'Bogen', current, name: next.name, detail, price: next.price, sold: false };
}

/**
 * Naechste Speerstufe (Erweiterung 2, Abschnitt 3). Wie beim Bogen ist
 * spearTier vor dem ersten Kauf -1, das erste Angebot ist also der Holzspeer.
 */
export function nextSpearOffer(progress) {
  const tier = progress.spearTier + 1;
  const now = progress.spearTier >= 0 ? SPEAR.tiers[progress.spearTier] : null;
  const current = now ? `Stufe ${progress.spearTier + 1}` : '—';
  if (tier >= SPEAR.tiers.length) {
    return {
      id: 'spear', slot: 'Speer', current,
      name: now.name, detail: `${now.damage} Schaden — beste Stufe`, price: 0, sold: true,
    };
  }
  const next = SPEAR.tiers[tier];
  const detail = now
    ? `${now.damage} → ${next.damage} Schaden`
    // Keine feste Taste mehr nennen: welche Waffe auf 1 und 2 liegt, entscheidet
    // seit Erweiterung 2 die Ausruestungswahl (Abschnitt 4).
    : `${next.damage} Schaden, grosse Reichweite · Wurf mit F`;
  return { id: 'spear', slot: 'Speer', current, name: next.name, detail, price: next.price, sold: false };
}

export function potionOffer(progress) {
  const p = CONSUMABLES.potion;
  // Wie viele hineinpassen, entscheidet seit Abschnitt 7 der Trankguertel.
  const max = maxPotions(progress);
  const full = progress.potions >= max;
  return {
    id: 'potion',
    slot: 'Heiltrank',
    current: `×${progress.potions} von ${max}`,
    name: p.name,
    detail: `heilt ${p.heal} HP · Taste R · hoechstens ${max} im Gepaeck`,
    price: p.price,
    sold: full,
    note: full ? 'Gepaeck voll' : '',
  };
}

/**
 * Naechste Ruestungsstufe (Erweiterung 2, Abschnitt 7). Gleiche Logik wie
 * beim Schild: Stufe 0 ist ein leerer Slot, kein Kauf.
 */
export function nextArmorOffer(progress) {
  const tier = armorTier(progress);
  const now = ARMOR.tiers[tier];
  const next = ARMOR.tiers[tier + 1];
  const current = tier > 0 ? `Stufe ${tier}` : '—';
  if (!next) {
    return {
      id: 'armor', slot: 'Ruestung', current, name: now.name,
      detail: `+${now.defense} Verteidigung — beste Stufe`, price: 0, sold: true,
    };
  }
  return {
    id: 'armor',
    slot: 'Ruestung',
    current,
    name: next.name,
    detail: tier > 0
      ? `+${now.defense} → +${next.defense} Verteidigung`
      : `+${next.defense} Verteidigung — wirkt immer, auch ohne Schild`,
    price: next.price,
    sold: false,
  };
}

/** Naechster Ausbau des Trankguertels (Abschnitt 7). */
export function nextBeltOffer(progress) {
  const tier = beltTier(progress);
  const now = POTION_BELT.tiers[tier];
  const next = POTION_BELT.tiers[tier + 1];
  const current = `${now.maxPotions} Traenke`;
  if (!next) {
    return {
      id: 'belt', slot: 'Trankguertel', current, name: now.name,
      detail: `${now.maxPotions} Traenke — beste Stufe`, price: 0, sold: true,
    };
  }
  return {
    id: 'belt',
    slot: 'Trankguertel',
    current,
    name: next.name,
    detail: `${now.maxPotions} → ${next.maxPotions} Heiltraenke im Gepaeck`,
    price: next.price,
    sold: false,
  };
}

/**
 * Schmied: schaerft die GERADE GEFUEHRTE Waffe dauerhaft (Abschnitt 7).
 *
 * Welche Waffe das ist, steht im Fortschritt — der Shop liegt auf dem
 * Dashboard, dort ist kein Level geladen. Deshalb wird dieselbe Regel benutzt
 * wie im Level: gefuehrt wird, was mitgenommen wurde.
 */
export function smithOffer(progress) {
  const dabei = loadout(progress);
  const weapon = dabei.includes(progress.weapon) ? progress.weapon : dabei[0];
  const name = { sword: 'Schwert', spear: 'Speer', bow: 'Bogen' }[weapon] ?? 'Waffe';
  const stufe = smithLevel(progress, weapon);
  const fertig = smithMaxed(progress, weapon);
  return {
    id: 'smith',
    slot: 'Schmied',
    current: `${name}: ${stufe}/${SMITH.maxPerWeapon}`,
    name: `${name} schaerfen`,
    detail: fertig
      ? `${name} ist ausgereizt (+${stufe * SMITH.damagePerUpgrade} Schaden)`
      : `+${SMITH.damagePerUpgrade} Schaden dauerhaft · gilt nur fuer das ${name}`,
    price: smithPrice(progress, weapon),
    sold: fertig,
    note: fertig ? 'nichts mehr zu schaerfen' : '',
  };
}

/**
 * Skill-Reset (Abschnitt 4): alle vergebenen Punkte zurueck in den Pool.
 * Ohne vergebene Punkte gibt es nichts zurueckzusetzen.
 */
export function respecOffer(progress) {
  const spent = spentPoints(progress);
  return {
    id: 'respec',
    slot: 'Skill-Reset',
    current: spent > 0 ? `${spent} vergeben` : '—',
    name: CONSUMABLES.respec.name,
    detail: spent > 0
      ? `${spent} vergebene Skillpunkte zurueck in den Pool`
      : 'alle Skillpunkte zurueck in den Pool',
    price: CONSUMABLES.respec.price,
    sold: spent === 0,
    note: spent === 0 ? 'keine Punkte vergeben' : '',
  };
}

/** Alle aktuell angebotenen Waren in Anzeigereihenfolge. */
export function offers(progress) {
  return [
    nextSwordOffer(progress),
    nextSpearOffer(progress),
    nextBowOffer(progress),
    nextShieldOffer(progress),
    // Die drei neuen Ausgabeposten aus Abschnitt 7.
    nextArmorOffer(progress),
    smithOffer(progress),
    nextBeltOffer(progress),
    potionOffer(progress),
    respecOffer(progress),
  ];
}

/**
 * Kauf ausfuehren. Prueft Gold und Grenzen selbst.
 * @returns {boolean} true, wenn tatsaechlich gekauft wurde
 */
export function buy(id, progress, wallet) {
  const offer = offers(progress).find((o) => o.id === id);
  if (!offer || offer.sold || wallet.gold < offer.price) return false;

  switch (id) {
    // 'respec' wird in game.js behandelt (es kostet Gold, aendert aber Skills).
    case 'armor':
      progress.armorTier = armorTier(progress) + 1;
      break;
    case 'belt':
      progress.potionBeltTier = beltTier(progress) + 1;
      break;
    case 'smith': {
      // Geschaerft wird die gefuehrte Waffe — dieselbe Regel wie im Angebot,
      // sonst koennte der Kauf eine andere Waffe treffen als die angezeigte.
      const dabei = loadout(progress);
      const weapon = dabei.includes(progress.weapon) ? progress.weapon : dabei[0];
      if (!sharpen(progress, weapon)) return false;
      break;
    }
    case 'sword':
      progress.swordTier += 1;
      break;
    case 'bow':
      progress.bowTier += 1;
      break;
    case 'spear':
      progress.spearTier += 1;
      break;
    case 'shield':
      progress.shieldTier += 1;
      break;
    case 'potion':
      if (progress.potions >= maxPotions(progress)) return false;
      progress.potions += 1;
      break;
    default:
      return false;
  }
  wallet.gold -= offer.price;
  return true;
}
