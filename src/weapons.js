/**
 * weapons.js — was die drei Waffen sind und welche davon mit ins Level darf
 * (Erweiterung 2, Abschnitt 4).
 *
 * Bis hierher war "die Waffe" ein Sonderfall pro Stelle: der Shop kannte
 * Schwert und Bogen, der HUD kannte sie noch einmal, der Spieler ein drittes
 * Mal. Mit der dritten Waffe und der Regel "nur 2 von 3" waeren daraus vier
 * Stellen geworden, die man beim naechsten Zusatz alle wieder anfassen muss.
 * Deshalb hier EINE Beschreibung, aus der sich alle bedienen.
 *
 * Zahlen stehen weiterhin ausschliesslich in config.js — dieses Modul rechnet
 * nur zusammen und formuliert.
 */

import { SWORD, BOW, SPEAR, LOADOUT, TILE } from './config.js';
import { smithBonus, smithLevel } from './gear.js';

/** Anzeigereihenfolge im Fenster: erst Nahkampf, dann Fernkampf. */
export const WEAPON_ORDER = ['sword', 'spear', 'bow'];

/**
 * Die unveraenderlichen Eigenschaften je Waffe. `tiers` zeigt auf die
 * Stufenliste in config.js, `firstTier` sagt, ab welchem Index sie als
 * gekauft gilt: das Schwert hat man von Anfang an (Stufe 0 ist schon eine
 * echte Waffe), Bogen und Speer beginnen bei -1 = "noch nicht gekauft".
 */
const WEAPONS = {
  sword: { name: 'Schwert', tiers: SWORD.tiers, firstTier: 0, slot: 'Schwert' },
  spear: { name: 'Speer', tiers: SPEAR.tiers, firstTier: -1, slot: 'Speer' },
  bow: { name: 'Bogen', tiers: BOW.tiers, firstTier: -1, slot: 'Bogen' },
};

/** Name des Fortschrittsfeldes, in dem die Stufe dieser Waffe steht. */
const TIER_KEY = { sword: 'swordTier', spear: 'spearTier', bow: 'bowTier' };

/** Stufenindex der Waffe im Fortschritt; -1 = nicht gekauft. */
export function tierOf(progress, id) {
  const value = progress[TIER_KEY[id]];
  return Number.isFinite(value) ? value : WEAPONS[id].firstTier;
}

/** Besitzt der Spieler diese Waffe? */
export function owns(progress, id) {
  return tierOf(progress, id) >= 0;
}

/** Alle Waffen, die der Spieler besitzt — in Anzeigereihenfolge. */
export function ownedWeapons(progress) {
  return WEAPON_ORDER.filter((id) => owns(progress, id));
}

/**
 * Gibt es ueberhaupt etwas zu waehlen? Das Fenster erscheint erst ab zwei
 * besessenen Waffen (Abschnitt 4).
 */
export function loadoutAvailable(progress) {
  return ownedWeapons(progress).length >= LOADOUT.minWeapons;
}

/**
 * Die Waffen, die mit ins Level gehen — geprueft und zurechtgestutzt.
 *
 * Es wird bewusst NICHT der rohe gespeicherte Wert benutzt: er kann eine
 * verkaufte Waffe nennen, dieselbe zweimal, zu viele oder gar keine. Diese
 * Funktion ist die einzige Wahrheit darueber, was der Spieler dabei hat.
 */
export function loadout(progress) {
  const roh = Array.isArray(progress.loadout) ? progress.loadout : [];
  const gewaehlt = [];
  for (const id of roh) {
    if (!WEAPON_ORDER.includes(id)) continue;   // Unfug aus einem Spielstand
    if (!owns(progress, id)) continue;          // verkauft/nie gekauft
    if (gewaehlt.includes(id)) continue;        // doppelt
    if (gewaehlt.length >= LOADOUT.slots) break;
    gewaehlt.push(id);
  }
  // Leere Haende gibt es nicht — aber auch kein stilles Auffuellen: wer den
  // Bogen abwaehlt, soll nicht ungefragt das Schwert zurueckbekommen. Ein
  // freier Platz bleibt frei, bis der Spieler ihn besetzt. Nur wenn gar
  // nichts uebrig bleibt, springt die erste besessene Waffe ein.
  if (gewaehlt.length === 0) return [ownedWeapons(progress)[0] ?? 'sword'];
  return gewaehlt;
}

/**
 * Womit ein Held startet, der noch nie gewaehlt hat — die ersten
 * LOADOUT.slots Waffen, die er besitzt.
 *
 * Gebraucht fuer Spielstaende aus der Zeit vor der Ausruestungswahl: dort
 * fehlt das Feld ganz, und der Spieler soll nicht ploetzlich mit einer Waffe
 * weniger dastehen, nur weil er vor dem Update gespeichert hat.
 */
export function initialLoadout(progress) {
  return ownedWeapons(progress).slice(0, LOADOUT.slots);
}

/** Nimmt der Spieler diese Waffe mit? */
export function carries(progress, id) {
  return loadout(progress).includes(id);
}

/**
 * Eine Waffe an- oder abwaehlen.
 *
 * Sind schon beide Plaetze belegt, faellt die AELTERE Wahl heraus — so wird
 * ein Klick nie abgewiesen. Der Spieler muss nicht erst etwas abwaehlen, um
 * etwas anderes zu waehlen; das waeren zwei Klicks fuer eine Entscheidung.
 *
 * @returns {boolean} true, wenn sich etwas geaendert hat
 */
export function toggleWeapon(progress, id) {
  if (!owns(progress, id)) return false;
  const jetzt = loadout(progress);

  if (jetzt.includes(id)) {
    // Die letzte Waffe darf nicht abgewaehlt werden — ohne Waffe kein Level.
    if (jetzt.length <= 1) return false;
    progress.loadout = jetzt.filter((w) => w !== id);
    return true;
  }

  const neu = jetzt.length >= LOADOUT.slots ? [...jetzt.slice(1), id] : [...jetzt, id];
  progress.loadout = neu;
  return true;
}

/** Startwert fuer einen neuen Helden: nur das Schwert. */
export function defaultLoadout() {
  return ['sword'];
}

// --- Beschreibung fuer das Fenster ----------------------------------------

/** Reichweite in Kacheln, z. B. "1,4 Kacheln". */
function kacheln(px) {
  return `${(px / TILE).toLocaleString('de-DE', { maximumFractionDigits: 1 })} Kacheln`;
}

/** Sekunden mit Komma, z. B. "0,8 s". */
function sekunden(value) {
  return `${value.toLocaleString('de-DE', { maximumFractionDigits: 2 })} s`;
}

/**
 * Alles, was das Ausruestungsfenster ueber eine Waffe anzeigt (Abschnitt 4):
 * Symbol, Stufe, Schaden, Angriffstempo, Reichweite — und ob sie gekauft,
 * mitgenommen oder nur zu bewundern ist.
 *
 * Angegeben sind die reinen Waffenwerte ohne Angriffskraft und Skills, genau
 * wie im Shop. Das Fenster soll die drei Waffen VERGLEICHBAR machen; was der
 * Held daraus macht, steht im Charakterfenster.
 */
export function weaponInfo(progress, id) {
  const def = WEAPONS[id];
  const tier = tierOf(progress, id);
  const besitzt = tier >= 0;
  const aktuell = besitzt ? def.tiers[tier] : null;
  const naechste = def.tiers[tier + 1] ?? null;

  const info = {
    id,
    name: def.name,
    slot: def.slot,
    symbol: LOADOUT.symbols[id],
    owned: besitzt,
    carried: besitzt && carries(progress, id),
    tier,
    tierText: besitzt ? `Stufe ${tier + 1} von ${def.tiers.length}` : 'nicht gekauft',
    tierName: besitzt ? aktuell.name : naechste.name,
    // Preis der naechsten Stufe — bei einer nicht gekauften Waffe also ihr
    // Kaufpreis, den das Dokument neben der ausgegrauten Zeile verlangt.
    nextPrice: naechste ? naechste.price : 0,
    // Schmiede-Bonus zaehlt mit (Erweiterung 2, Abschnitt 7) — sonst stuende
    // im Ausruestungsfenster ein anderer Schaden als der, der wirklich
    // ankommt. Eine nicht gekaufte Waffe war nie beim Schmied.
    damage: (besitzt ? aktuell.damage : naechste.damage)
      + (besitzt ? smithBonus(progress, id) : 0),
    smithLevel: besitzt ? smithLevel(progress, id) : 0,
  };

  if (id === 'bow') {
    // Der Kompositbogen halbiert die Schussrate — das steckt in fireRateFactor.
    const stufe = besitzt ? aktuell : naechste;
    const takt = BOW.cooldown / stufe.fireRateFactor;
    info.cooldown = takt;
    info.speedText = `1 Schuss / ${sekunden(takt)}`;
    info.rangeText = kacheln(BOW.arrowSpeed * BOW.arrowLife);
    info.note = 'gefahrlos aus der Distanz, wenig Schaden';
  } else if (id === 'spear') {
    info.cooldown = SPEAR.cooldown;
    info.speedText = `1 Stoss / ${sekunden(SPEAR.cooldown)}`;
    info.rangeText = kacheln(SPEAR.range);
    info.note = `dazu Wurf alle ${sekunden(SPEAR.throwCooldown)} (Taste F)`;
  } else {
    info.cooldown = SWORD.cooldown;
    info.speedText = `1 Hieb / ${sekunden(SWORD.cooldown)}`;
    info.rangeText = kacheln(SWORD.range);
    info.note = 'breiter Schwung — trifft mehrere nebeneinander';
  }

  // Geschaerfte Waffen sagen das auch — sonst wundert man sich ueber den
  // Schaden, der nicht zur Stufe passt.
  if (info.smithLevel > 0) {
    info.tierText += ` · ${info.smithLevel}× geschaerft`;
  }

  // Schaden pro Sekunde als Vergleichszahl. Sie steht nicht in der Zeile,
  // sondern im Tooltip: fuenf Zahlen nebeneinander liest niemand mehr.
  info.dps = Math.round(info.damage / info.cooldown);
  return info;
}

/** Alle drei Waffen beschrieben, in Anzeigereihenfolge. */
export function allWeaponInfos(progress) {
  return WEAPON_ORDER.map((id) => weaponInfo(progress, id));
}
