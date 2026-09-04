/**
 * config.js — ALLE Zahlenwerte des Spiels.
 *
 * Balance-Aenderungen gehoeren ausschliesslich hierher; im uebrigen Code stehen
 * keine "magischen Zahlen". Werte, die noch nicht benutzt werden (Shop, Skills,
 * spaetere Monster), sind bereits aus GAME_DESIGN_1.md uebernommen, damit die
 * naechsten Schritte nichts mehr suchen muessen.
 */

/** Kantenlaenge einer Kachel in Pixeln. */
export const TILE = 32;

/** Sichtbares Fenster (30x20 Kacheln). */
export const VIEW = {
  width: 960,
  height: 640,
};


export const DEBUG = {
  /** Startzustand der Debug-Anzeige (Hitboxen, Kollisionskacheln, FPS). Umschalten mit F1. */
  enabled: false,
  showFps: true,
};

/** Weich nachziehende Kamera. */
export const CAMERA = {
  /** Hoeher = starrer am Spieler. Wird pro Sekunde aufgeloest, ist also framerate-unabhaengig. */
  smoothing: 8,
  /** Kamera bleibt innerhalb der Levelgrenzen. */
  clampToLevel: true,
};

/** Spieler-Grundwerte (Abschnitt 4). */
export const PLAYER = {
  maxHp: 100,
  attack: 10,
  defense: 0,
  speed: 120,          // px/s
  critChance: 0.05,    // 5 % — doppelter Schaden
  critMultiplier: 2,

  maxStamina: 100,         // ab Schritt 8
  rollCost: 30,
  staminaRegen: 20,        // pro Sekunde
  staminaRegenDelay: 1.0,  // Sekunden Pause vor der Regeneration

  /** Unverwundbarkeit nach einem Treffer (Abschnitt 6). */
  invulnTime: 0.6,
  blinkInterval: 0.08,

  /** Kollisions-Hitbox und Darstellungsgroesse (beides um die Figurmitte zentriert). */
  hitbox: { w: 20, h: 20 },
  sprite: { w: 22, h: 28, offsetY: -4 },

  /** Rueckstoss, wenn der Spieler getroffen wird. */
  knockback: 130,
  knockbackDecay: 9,
};

/**
 * Wie Angriffskraft und Waffenschaden zusammengerechnet werden.
 *
 * Abschnitt 4 sagt nur "wird mit Waffenschaden verrechnet" — beides ist denkbar:
 *   'add'   Schaden = Angriffskraft + Waffenschaden      (10 + 10 = 20)
 *   'scale' Schaden = Waffenschaden * (1 + Angriffskraft/100)   (10 * 1,1 = 11)
 *
 * Mit 'add' toetet der erste Hieb einen Slime (20 HP) sofort — Level 1 ist dann
 * reines Tutorial. Mit 'scale' braucht ein Slime zwei Hiebe, die Ausholphase der
 * Gegner kommt oefter zum Tragen und das Spiel wird spuerbar fordernder.
 */
export const COMBAT = {
  damageFormula: 'add',
};

/** Schwert: Stufen aus dem Shop (Abschnitt 5) + Kampfgefuehl. */
export const SWORD = {
  /** Cooldown zwischen zwei Hieben — 1 Hieb / 0,5 s. */
  cooldown: 0.5,
  /** Dauer der sichtbaren Schwungbewegung. */
  swingTime: 0.18,
  /** Reichweite ab Spielermitte (VERBESSERUNGEN_1 Abschnitt 2: 40 px = 1,25 Kacheln). */
  range: 40,
  /** Oeffnungswinkel des Treffer-Kegels in Grad (symmetrisch um die Blickrichtung). */
  arc: 100,
  /** Rueckstoss auf getroffene Gegner. */
  knockback: 180,
  /** Stufen: ein Kauf ersetzt die vorherige Stufe. */
  tiers: [
    { name: 'Rostiges Schwert', damage: 10, price: 0 },
    { name: 'Eisenschwert', damage: 18, price: 50 },
    { name: 'Stahlschwert', damage: 30, price: 150 },
    { name: 'Klinge der Daemmerung', damage: 50, price: 400 },
    { name: 'Schwert der Zerstoerung', damage: 70, price: 900 },
    { name: 'Katana', damage: 90, price: 1200 },
    { name: 'Feuerklinge', damage: 120, price: 2000 },
    { name: 'Lava Klinge', damage: 150, price: 4000 },
  ],
};

/**
 * Schild (Abschnitt 3 und 5) — Rechtsklick halten.
 *
 * Geblockt wird nur, was von vorne kommt: der Angreifer muss im Blickwinkel
 * liegen (blockArc, gesamt 120°). Von hinten trifft voller Schaden — dadurch
 * ist die Maus-Blickrichtung spielrelevant und nicht nur Deko.
 */
export const SHIELD = {
  /** Oeffnungswinkel des Blocks in Grad, symmetrisch um die Blickrichtung. */
  blockArc: 120,
  /** Bewegungstempo waehrend des Blockens: -40 %. */
  moveSpeedFactor: 0.6,
  /**
   * Obergrenze der GESAMTEN Schadensreduktion beim Blocken, Schild und Skill
   * "Blockmeister" zusammengerechnet (Erweiterung 2, Abschnitt 5: Deckel bei
   * 90 %). Vorher 0,95 — mit Max-Stufe 15 braeuchte der Blockmeister allein
   * schon 150 %, deshalb ist diese Zeile jetzt eine harte Grenze und keine
   * Vorsichtsmassnahme mehr.
   */
  maxBlock: 0.90,
  /** Rueckstoss eines geblockten Treffers im Vergleich zum ungeblockten. */
  blockedKnockbackFactor: 0.35,
  /**
   * Darf man mit erhobenem Schild zuschlagen?
   * false = Schild senken (Rechtsklick loslassen), dann erst hauen.
   * Steht im Dokument nicht — auf false fuehlt sich der Block wie eine
   * echte Entscheidung an statt wie ein Dauerbonus.
   */
  canAttackWhileBlocking: false,
  tiers: [
    { name: 'Kein Schild', block: 0, price: 0, speedPenalty: 0 },
    { name: 'Holzschild', block: 0.30, price: 40, speedPenalty: 0 },
    { name: 'Eisenschild', block: 0.50, price: 120, speedPenalty: 0 },
    { name: 'Turmschild', block: 0.70, price: 350, speedPenalty: 0.20 },
    { name: 'Stahlschild', block: 0.80, price: 500, speedPenalty: 0.25 },
    { name: 'Heilschield', block: 0.85, price: 3000, speedPenalty: 0.30, healRate: 2, healInterval: 2.0 },
  ],
};

/**
 * Ruestung — vierter Ausruestungsslot (Erweiterung 2, Abschnitt 7).
 *
 * Passive Verteidigung: sie wirkt immer, unabhaengig vom Schild und davon, aus
 * welcher Richtung der Treffer kommt. Damit ist sie das ruhige Gegenstueck zum
 * Schild, das nur nach vorne schuetzt und Tempo kostet.
 *
 * Stufe 0 heisst 'keine Ruestung' — genauso wie beim Schild, damit beide Slots
 * dieselbe Kauf-Logik benutzen koennen (das Dokument: 'kein neues System
 * noetig').
 */
export const ARMOR = {
  tiers: [
    { name: 'Keine Ruestung', defense: 0, price: 0 },
    { name: 'Lederruestung', defense: 3, price: 250 },
    { name: 'Kettenruestung', defense: 7, price: 700 },
    { name: 'Plattenruestung', defense: 12, price: 1800 },
    { name: 'Drachenschuppe', defense: 18, price: 3500 },
  ],
};

/**
 * Trankguertel — wie viele Heiltraenke gleichzeitig ins Gepaeck passen
 * (Erweiterung 2, Abschnitt 7).
 *
 * Der Startwert 3 ist der bisherige CONSUMABLES.potion.maxCarried; ab hier
 * ist die Obergrenze eine Kaufsache und steht deshalb hier statt dort.
 */
export const POTION_BELT = {
  tiers: [
    { name: 'Guertel', maxPotions: 3, price: 0 },
    { name: 'Verstaerkter Guertel', maxPotions: 4, price: 400 },
    { name: 'Grosser Guertel', maxPotions: 5, price: 900 },
    { name: 'Bandelier', maxPotions: 6, price: 1800 },
  ],
};

/**
 * Schmied — permanente Waffenschaerfung (Erweiterung 2, Abschnitt 7).
 *
 * Erhoeht den Schaden der GERADE GEFUEHRTEN Waffe dauerhaft, bis zu viermal
 * pro Waffe. Der Preis verdoppelt sich mit jedem Kauf: die ersten +5 sind
 * billig, die letzten kosten so viel wie eine ganze Waffe.
 *
 * Gezaehlt wird pro Waffe getrennt. Wer alle drei schaerfen will, zahlt
 * dreimal — und genau das ist der Sinn: Gold soll auch dann noch ein Ziel
 * haben, wenn alle Ausruestung gekauft ist.
 */
export const SMITH = {
  /** Schadenszuwachs pro Kauf. */
  damagePerUpgrade: 5,
  /** Hoechstens so oft pro Waffe. */
  maxPerWeapon: 4,
  /** Preis des 1., 2., 3. und 4. Kaufs. */
  prices: [500, 1000, 2000, 4000],
};

/**
 * Pfeil und Bogen (Abschnitt 3 und 5).
 * Pfeile sind unbegrenzt, aber mit Cooldown — keine Munitionsverwaltung.
 */
export const BOW = {
  /** 1 Schuss / 0,8 s. Der Kompositbogen halbiert das ueber fireRateFactor. */
  cooldown: 0.8,
  arrowSpeed: 420,
  /** Flugzeit in Sekunden — daraus ergibt sich die Reichweite (420 * 1,4 = 588 px). */
  arrowLife: 1.4,
  /**
   * Maximale Flugstrecke in Pixeln (VERBESSERUNGEN_1 Abschnitt 2: 480 = 15
   * Kacheln). Bogen reicht bewusst weiter als jedes Gegner-Geschoss — sonst
   * hat die Waffe keine Existenzberechtigung.
   */
  maxRange: 480,
  /** Startpunkt des Pfeils vor der Figur, damit er nicht in ihr steckt. */
  muzzleOffset: 12,
  knockback: 90,
  /** Halbe Trefferbox des Pfeils. */
  hitRadius: 3,
  sprite: { w: 14, h: 3 },
  /** Sichtbarer Rueckstoss des Bogens nach dem Schuss. */
  recoilTime: 0.14,
  tiers: [
    { name: 'Kurzbogen', damage: 8, price: 80, fireRateFactor: 1 },
    { name: 'Langbogen', damage: 15, price: 200, fireRateFactor: 1 },
    { name: 'Kompositbogen', damage: 25, price: 500, fireRateFactor: 2 },
    { name: 'Eisenbogen', damage: 40, price: 700, fireRateFactor: 2 },
    { name: 'Stahlbogen', damage: 70, price: 1200, fireRateFactor: 1 },
    { name: 'Selfbow', damage: 90, price: 1600, fireRateFactor: 2 },
    { name: 'Reiterbogen', damage: 120, price: 3000, fireRateFactor: 1 },
  ],
};

/**
 * Speer (Erweiterung 2, Abschnitt 3) — Nah- UND Fernkampfwaffe.
 *
 * Linksklick stoesst mit groesserer Reichweite als das Schwert, Taste F wirft
 * ihn ueber die volle Distanz. Das Dokument laesst 'Rechtsklick oder eigene
 * Taste' offen — Rechtsklick ist hier seit Schritt 7 das Schild, und ein
 * Speerkaempfer soll nicht auf den Block verzichten muessen. Also eine eigene
 * Taste.
 *
 * DAS ANGRIFFSTEMPO IST DER KERN DER BALANCE (Abschnitt 3):
 * Mit dem Takt des Schwerts (0,5 s) macht der Speer auf Hoechststufe
 * 90 / 0,5 = 180 Schaden pro Sekunde gegen 100 des Schwerts — bei GROESSERER
 * Reichweite und mit Wurf obendrauf. Niemand wuerde je wieder ein Schwert
 * anfassen. Mit 0,8 s sind es 112 gegen 100: nah genug beieinander, dass die
 * Wahl von der Situation abhaengt und nicht von der Tabelle.
 */
export const SPEAR = {
  /** 1 Stoss / 0,8 s — langsamer als das Schwert (0,5 s). Siehe oben. */
  cooldown: 0.8,
  /** Dauer der sichtbaren Stossbewegung. */
  thrustTime: 0.2,
  /**
   * Reichweite des Stosses ab Spielermitte (VERBESSERUNGEN_1 Abschnitt 2:
   * 60 px = ~2 Kacheln).
   */
  range: 60,
  /**
   * Oeffnungswinkel des Treffer-Kegels in Grad. Deutlich enger als der
   * Schwertschwung (100 Grad): ein Stoss geht geradeaus. Damit hat jede Waffe
   * ihre eigene Staerke — das Schwert raeumt Gruppen, der Speer trifft weit,
   * aber nur, was direkt vor einem steht.
   */
  arc: 40,
  /** Rueckstoss auf getroffene Gegner — schwerer als das Schwert. */
  knockback: 210,

  /** Wurf (Rechtsklick-Alternative: Taste F). */
  throwCooldown: 3.0,
  /** Wurfschaden = 100 % des Speerschadens (Abschnitt 3). */
  throwDamageFactor: 1.0,
  /** Sichtbar langsamer und schwerer als ein Pfeil (420 px/s). */
  throwSpeed: 380,
  /** Flugzeit; 380 x 1,6 = 608 px, also 'die volle Distanz'. */
  throwLife: 1.6,
  /**
   * Maximale Flugstrecke des Wurfs in Pixeln (VERBESSERUNGEN_1 Abschnitt 2:
   * 320 = 10 Kacheln). Bewusst deutlich kuerzer als der Bogen (480).
   */
  throwMaxRange: 320,
  /** Startpunkt vor der Figur, damit der Speer nicht in ihr steckt. */
  muzzleOffset: 16,
  throwKnockback: 160,
  /** Halbe Trefferbox des fliegenden Speers. */
  hitRadius: 5,
  /** Kurze Ausholbewegung, bevor der Speer die Hand verlaesst. */
  throwWindup: 0.12,
  sprite: { w: 26, h: 4 },

  /** Stufen: ein Kauf ersetzt die vorherige Stufe, wie bei Schwert und Bogen. */
  tiers: [
    { name: 'Holzspeer', damage: 20, price: 100 },
    { name: 'Rostiger Speer', damage: 40, price: 200 },
    { name: 'Stahl Speer', damage: 60, price: 400 },
    { name: 'Speer der Vernichtung', damage: 90, price: 700 },
    { name: 'Speer der Verdammnis', damage: 110, price: 1500 },
    { name: 'Gottsspeer', damage: 130, price: 3000 },
  ],
};