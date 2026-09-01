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

import { SWORD, SHIELD, BOW, CONSUMABLES } from './config.js';
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
    : `${next.damage} Schaden auf Distanz · Taste 2${rate}`;
  return { id: 'bow', slot: 'Bogen', current, name: next.name, detail, price: next.price, sold: false };
}

export function potionOffer(progress) {
  const p = CONSUMABLES.potion;
  const full = progress.potions >= p.maxCarried;
  return {
    id: 'potion',
    slot: 'Heiltrank',
    current: `×${progress.potions}`,
    name: p.name,
    detail: `heilt ${p.heal} HP · Taste R · hoechstens ${p.maxCarried} im Gepaeck`,
    price: p.price,
    sold: full,
    note: full ? 'Gepaeck voll' : '',
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
    nextBowOffer(progress),
    nextShieldOffer(progress),
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
    case 'sword':
      progress.swordTier += 1;
      break;
    case 'bow':
      progress.bowTier += 1;
      break;
    case 'shield':
      progress.shieldTier += 1;
      break;
    case 'potion':
      progress.potions += 1;
      break;
    default:
      return false;
  }
  wallet.gold -= offer.price;
  return true;
}
