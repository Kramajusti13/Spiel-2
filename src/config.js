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
    // Turmschild: -20 % Tempo, auch wenn das Schild nicht erhoben ist (es ist schwer).
    { name: 'Turmschild', block: 0.70, price: 350, speedPenalty: 0.20 },
  ],
};

/**
 * Ruestung — vierter Ausruestungsslot (Erweiterung 2, Abschnitt 7).
 *
 * Passive Verteidigung: sie wirkt immer, unabhaengig vom Schild und davon, aus
 * welcher Richtung der Treffer kommt. Damit ist sie das ruhige Gegenstueck zum
 * Schild, das nur nach vorne schuetzt und Tempo kostet.
 *
 * Stufe 0 heisst "keine Ruestung" — genauso wie beim Schild, damit beide Slots
 * dieselbe Kauf-Logik benutzen koennen (das Dokument: "kein neues System
 * noetig").
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
  ],
};

/**
 * Speer (Erweiterung 2, Abschnitt 3) — Nah- UND Fernkampfwaffe.
 *
 * Linksklick stoesst mit groesserer Reichweite als das Schwert, Taste F wirft
 * ihn ueber die volle Distanz. Das Dokument laesst "Rechtsklick oder eigene
 * Taste" offen — Rechtsklick ist hier seit Schritt 7 das Schild, und ein
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
  /** Flugzeit; 380 x 1,6 = 608 px, also "die volle Distanz". */
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
    { name: 'Stahlspeer', damage: 60, price: 400 },
    { name: 'Speer der Vernichtung', damage: 90, price: 700 },
  ],
};

/**
 * Giftwolke und Vergiftung (Erweiterung 2, Abschnitt 1).
 *
 * Die Wolke ist kein Flugkoerper, sondern eine Flaeche, die liegen bleibt —
 * der einzige Angriff im Spiel, der den Angreifer ueberdauert. Wer sie
 * beruehrt, ist danach vergiftet.
 *
 * Die Vergiftung STAPELT NICHT: eine zweite Beruehrung setzt die Dauer auf
 * 2 s zurueck, statt eine zweite Vergiftung obendrauf zu legen. Sonst waere
 * eine Gruppe Giftpilze kein Ausdauer-Problem, sondern ein sofortiger Tod.
 */
export const POISON = {
  /** "Wolkenradius 80 px, bleibt 3 s liegen". */
  cloudRadius: 80,
  cloudLife: 3.0,
  /** Wie lange die Wolke ein- und ausblendet (Teil von cloudLife). */
  cloudFadeIn: 0.25,
  cloudFadeOut: 0.6,
  /** "Wer sie beruehrt, ist 2 s vergiftet: 8 Schaden pro Sekunde". */
  duration: 2.0,
  damagePerSecond: 8,
  /**
   * Wie oft der Giftschaden verrechnet wird. Vier Ticks pro Sekunde: haeufig
   * genug, dass die Leiste sichtbar sinkt, selten genug, dass nicht bei jedem
   * Bild eine Schadenszahl aufsteigt.
   */
  tickInterval: 0.25,
  /** "Der Spieler blinkt gruen, solange er vergiftet ist." */
  blinkInterval: 0.12,
};

/**
 * Stein des Gorillas (Erweiterung 2, Abschnitt 1).
 *
 * Eigener Block statt Mitbenutzung von BOW: der Stein soll ausdruecklich
 * anders fliegen als ein Pfeil — langsamer, dicker, sichtbar trudelnd. Genau
 * das ist seine Daseinsberechtigung als Angriff, dem man ausweichen kann.
 */
export const STONE = {
  /** Flugzeit; 250 x 2,2 = 550 px, gut ueber den Wunschabstand von 200 hinaus. */
  life: 2.2,
  /** Halbe Trefferbox. */
  hitRadius: 7,
  /** Sichtbarer Radius des Steins. */
  radius: 7,
  /** Umdrehungen pro Sekunde — das Trudeln macht ihn im Flug lesbar. */
  spin: 2.5,
  /** Wie lange die Bruchstuecke nach dem Aufschlag liegen bleiben. */
  debrisTime: 0.35,
};

/**
 * Ausruestungswahl (Erweiterung 2, Abschnitt 4).
 *
 * Der Spieler besitzt bis zu drei Waffen, nimmt aber nur zwei mit ins Level.
 * Gewechselt wird ausschliesslich auf dem Dashboard — im Level liegen die
 * beiden mitgenommenen Waffen auf den Tasten 1 und 2 wie eh und je, die
 * Steuerung aendert sich also nicht.
 *
 * Der Sinn ist die Entscheidung VOR dem Level: Speer und Bogen fuer die
 * Krokodile (Abstand halten), Schwert und Speer fuer Giftpilz-Gruppen im
 * Nahkampf. Duerfte man alles mitnehmen, gaebe es nichts zu entscheiden.
 */
export const LOADOUT = {
  /** Wie viele der drei Waffen mit ins Level duerfen. */
  slots: 2,
  /**
   * Ab wie vielen besessenen Waffen das Fenster ueberhaupt erscheint. Mit nur
   * einer Waffe gaebe es nichts zu waehlen — dann waere der Knopf eine
   * Enttaeuschung (Abschnitt 4: "erscheint erst, sobald der Spieler
   * mindestens zwei Waffen besitzt").
   */
  minWeapons: 2,
  /** Anzeigereihenfolge und Symbol im Fenster. */
  symbols: {
    sword: '⚔',
    spear: '➤',
    bow: '➹',
  },
};

/**
 * Ausweichrolle (Abschnitt 3 und 4) — Leertaste.
 *
 * Kostet Ausdauer (PLAYER.rollCost) und macht kurz unverwundbar. Gerollt wird
 * in Laufrichtung; steht man still, in Blickrichtung.
 */
export const ROLL = {
  distance: 94,       // px pro Rolle (eine halbe Kachel kuerzer als die urspruenglichen 110)
  duration: 0.28,     // s — daraus ergibt sich das Tempo
  invulnTime: 0.24,   // s unverwundbar, etwas kuerzer als die Rolle selbst
  /** Nachbilder waehrend der Rolle (nur Platzhaltergrafik). */
  trailInterval: 0.045,
  trailLife: 0.22,
};

/** Verbrauchsgueter — ab Schritt 9. */
export const CONSUMABLES = {
  /**
   * `maxCarried` ist nur noch der STARTWERT; die tatsaechliche Obergrenze
   * liefert der Trankguertel (POTION_BELT). Wer sie braucht, fragt
   * maxPotions() in shop.js — nicht diesen Wert.
   */
  potion: { name: 'Heiltrank', price: 25, heal: 40, maxCarried: 3 },
  respec: { name: 'Skill-Reset', price: 100 },
};

/**
 * XP und Stufenaufstieg (Erweiterung, Abschnitt 1).
 *
 * Zwei Waehrungen, sonst nichts: Gold kauft Ausruestung, XP macht Stufen.
 * Skillpunkte kommen ausschliesslich aus Stufenaufstiegen — die alte Regel
 * "1 Punkt pro 15 Kills" ist damit ersetzt.
 */
export const XP = {
  /** Stufe 2 kostet 100 XP. */
  baseCost: 100,
  /**
   * Jede weitere Stufe kostet das 1,25-fache der vorigen
   * (Erweiterung 2, Abschnitt 6 — ersetzt die fruehere 1,4).
   *
   * Der Grund ist rein rechnerisch: mit 7 Skills a 15 Stufen gibt es 105
   * Slots. Bei x1,4 waere Stufe 20 rund 90.000 XP entfernt und die neuen
   * Skillstufen blosse Dekoration. Mit x1,25 kostet Stufe 20 noch 5.551 XP,
   * gesamt 27.354 — ein Durchlauf aller 10 Level auf Normal bringt rund
   * 5.500 XP (etwa Stufe 13), Alptraum (x3 XP) noch einmal rund 16.400 dazu.
   */
  growth: 1.25,
  /**
   * Das Dokument nennt keine Obergrenze. Diese hier verhindert nur, dass die
   * Zahlen bei extremem Farmen ins Absurde laufen; erreichbar ist sie kaum.
   */
  maxLevel: 50,

  // --- Belohnung pro Stufenaufstieg ---
  skillPointsPerLevel: 1,
  hpPerLevel: 5,
  /** Volle Heilung — macht einen Aufstieg mitten im Kampf zum Moment. */
  fullHealOnLevelUp: true,

  // --- Darstellung ---
  /**
   * Wie schnell die gezeichnete Leiste dem echten Wert nachlaeuft (Anteil der
   * Leiste pro Sekunde). Sie fuellt sich dadurch sichtbar statt zu springen.
   */
  barFillSpeed: 1.8,
  /** Wie lange "Stufe 5 erreicht!" auf dem Bildschirm steht. */
  levelUpNoticeTime: 2.2,
};

/**
 * Skillbaum (Erweiterung 2, Abschnitt 5 — ersetzt die Tabelle mit Max-Stufe 5).
 *
 * Max-Stufe ueberall 15, dazu der Speermeister als siebter Skill. Das sind
 * 7 x 15 = 105 Slots; ein durchgespieltes Spiel bringt gut ein Fuenftel davon.
 * Genau das ist der Zweck: man kann nicht alles haben, sondern entscheidet
 * sich fuer eine Bauweise — Panzer, Bogenschuetze oder Speerkaempfer.
 */
export const SKILLS = {
  tree: {
    vitality: { name: 'Vitalitaet', maxRank: 15, perRank: 20 },
    strength: { name: 'Staerke', maxRank: 15, perRank: 3 },
    armor: { name: 'Ruestung', maxRank: 15, perRank: 2 },
    speed: { name: 'Geschwindigkeit', maxRank: 15, perRank: 0.08 },
    archery: { name: 'Bogenschuetze', maxRank: 15, perRank: 0.15 },
    blockMaster: { name: 'Blockmeister', maxRank: 15, perRank: 0.10 },
    spearMaster: { name: 'Speermeister', maxRank: 15, perRank: 0.10 },
  },

  /**
   * Zwei Deckelungen (Erweiterung 2, Abschnitt 5). Ohne sie bricht das Spiel
   * bei voll ausgebautem Skill — beides ist Pflicht, nicht Feinschliff:
   *
   *   Geschwindigkeit  15 x 8 %  = +120 % Tempo. Der Spieler rennt schneller,
   *                    als die Kamera folgen kann, und laeuft an Gegnern
   *                    vorbei, bevor deren Ausholphase ueberhaupt anlaeuft.
   *   Blockmeister     15 x 10 % = 150 % Schadensreduktion. Ueber 100 % waere
   *                    ein geblockter Treffer eine Heilung.
   *
   * Der Block-Deckel gilt fuer die GESAMTE Reduktion inklusive Schild und
   * steht deshalb weiter unter SHIELD.maxBlock — es gibt nur eine Obergrenze,
   * nicht zwei, die sich widersprechen koennen.
   */
  caps: {
    /** Hoechster Tempo-Zuschlag aus dem Skill "Geschwindigkeit": +80 %. */
    speedBonus: 0.80,
  },
};

/**
 * Gemeinsames Verhalten aller Gegner beim Laufen.
 * Kein Pathfinding — der Gegner tastet nur, ob der Weg frei ist, und weicht
 * sonst um einen der Winkel aus. Reicht fuer offene Level und ist billig.
 */
export const AI = {
  /** Wie weit vorausgetastet wird (px). */
  probeDistance: 22,
  /** Ausweichwinkel in Grad, der Reihe nach probiert. */
  avoidAngles: [40, 75, 110, 145],

  /**
   * Verhalten auf Schwer/Alptraum (VERBESSERUNGEN_1 Abschnitt 5).
   * surround: Gegner laufen zunaechst auf einen Ringplatz um den Spieler zu,
   * bevor sie zuschlagen — sie kommen aus verschiedenen Richtungen statt als
   * Traube von vorn. Ring-Radius ist relativ zur Angriffsreichweite, damit
   * kleine Gegner naeher am Spieler warten als grosse.
   */
  hardBehavior: {
    /** Radius des Anlaufrings, addiert zur eigenen attackRange. */
    ringPadding: 24,
    /** Ab dieser Naehe zum Ring wird direkt der Spieler angelaufen. */
    ringSnap: 10,
    /** Max. Gegner gleichzeitig in der Ausholphase (staggerAttacks). */
    maxConcurrentWindups: 2,
    /** Wartezeit fuer die Ueberzaehligen, zufaellig zwischen min und max (s). */
    staggerDelayMin: 0.5,
    staggerDelayMax: 1.0,
    /**
     * Wenn der Spieler blockt, weichen Gegner um mindestens diesen Winkel
     * (Grad) vom Blockzentrum ab — sie kommen bevorzugt von der Seite/hinten.
     * Muss > SHIELD.blockArc / 2 sein (60°), sonst laufen sie in den Block.
     */
    shieldSidestepDeg: 80,
    /**
     * Alptraum-Verhalten (punishDodge, VERBESSERUNGEN_1 Abschnitt 5):
     * Ausweichrolle abwarten und 0,3 s nach dem Rollen-Ende zuschlagen —
     * genau der Moment, in dem der Spieler noch nicht wieder blocken kann.
     */
    dodgePunishDelay: 0.3,
  },
};

/**
 * Gegner (Abschnitt 6).
 * Jeder Angriff hat eine sichtbare Ausholphase von mind. 0,4 s — Fairness-Regel.
 */
export const ENEMIES = {
  slime: {
    name: 'Slime',
    maxHp: 20,
    damage: 5,
    defense: 0,
    speed: 45,             // px/s — "laeuft langsam direkt auf den Spieler zu"
    aggroRadius: 260,      // ab hier verfolgt er
    loseAggroRadius: 420,  // ab hier verliert er den Spieler wieder
    attackRange: 30,       // Distanz, ab der er ausholt
    strikeRadius: 40,      // Trefferradius im Moment des Zuschlagens
    windupTime: 0.45,      // >= 0,4 s sichtbare Ausholphase
    strikeTime: 0.12,      // Dauer des Zuschlagens
    recoverTime: 0.9,      // Pause danach
    hitbox: { w: 24, h: 20 },
    sprite: { w: 26, h: 22, offsetY: 0 },
    knockbackResist: 0.0,  // 0 = voller Rueckstoss, 1 = unbeweglich
    gold: { min: 3, max: 6 },
    xp: 10,
  },

  /** Schnell, schlaegt zu und weicht danach zurueck (Level 2). */
  goblin: {
    name: 'Goblin', maxHp: 35, damage: 10, defense: 0, speed: 95,
    aggroRadius: 300, loseAggroRadius: 460, attackRange: 34, strikeRadius: 44,
    windupTime: 0.4, strikeTime: 0.12, recoverTime: 0.7,
    /** Nach dem Schlag zurueckweichen — das macht ihn schwer zu treffen. */
    retreatDistance: 90, retreatTime: 0.5, retreatSpeedFactor: 1.15,
    hitbox: { w: 20, h: 24 }, sprite: { w: 22, h: 26, offsetY: -2 },
    knockbackResist: 0.1, gold: { min: 8, max: 15 }, xp: 20,
  },

  /** Haelt Abstand und schiesst (Level 3). Braucht freie Sicht zum Spieler. */
  archer: {
    name: 'Bogenschuetze', maxHp: 25, damage: 12, defense: 0, speed: 70,
    /**
     * Angriffsreichweite (VERBESSERUNGEN_1 Abschnitt 2: 352 px = 11 Kacheln).
     * Wahrnehmung = 1,3 x Angriffsreichweite ~ 458 px; darunter beginnt er zu
     * zielen, darueber nicht. loseAggroRadius bleibt darueber, damit er nicht
     * am Rand oszilliert.
     */
    range: 352,
    aggroRadius: 458, loseAggroRadius: 560,
    /** Wunschabstand; darunter weicht er zurueck, darueber rueckt er nach. */
    keepDistance: 200, distanceTolerance: 40,
    /** Seitliches Ausweichen, damit er kein stehendes Ziel ist. */
    strafeSpeedFactor: 0.55, strafeChangeTime: 1.4,
    shootInterval: 2.0, windupTime: 0.5, strikeTime: 0.1, recoverTime: 0.4,
    projectileSpeed: 300, arrowKnockback: 60,
    /** Endliche Flugstrecke des Gegner-Pfeils = Angriffsreichweite. */
    arrowMaxRange: 352,
    hitbox: { w: 20, h: 24 }, sprite: { w: 22, h: 26, offsetY: -2 },
    knockbackResist: 0.1, gold: { min: 12, max: 20 }, xp: 25,
  },

  /** Langsam, gepanzert, weiter Schwung (Level 4). */
  armoredOrc: {
    name: 'Panzer-Ork', maxHp: 90, damage: 18, defense: 5, speed: 40,
    aggroRadius: 280, loseAggroRadius: 460, attackRange: 44, strikeRadius: 62,
    windupTime: 0.8, strikeTime: 0.2, recoverTime: 1.2,
    /** "Weiter Schwung": trifft einen Kegel statt eines Punktes. */
    strikeArc: 150,
    hitbox: { w: 28, h: 28 }, sprite: { w: 30, h: 32, offsetY: -2 },
    knockbackResist: 0.6, gold: { min: 30, max: 50 }, xp: 50,
  },

  /**
   * Gorilla — Werfer (Erweiterung 2, Abschnitt 1). Erster Gegner des Urwalds.
   *
   * Funktioniert wie der Bogenschuetze: Abstand halten, aus der Distanz
   * werfen. Zwei Unterschiede machen ihn zu einem eigenen Gegner statt zu
   * einem Bogenschuetzen mit mehr Leben:
   *
   *   1. Der Stein ist mit 250 px/s deutlich langsamer als ein Pfeil (300).
   *      Man KANN ihm ausweichen, wenn man ihn kommen sieht — deshalb muss er
   *      sichtbar und langsam sein, nicht nur ein Schadensereignis.
   *   2. Ein Nahkampftreffer draengt ihn ein Stueck zurueck, statt ihn stehen
   *      zu lassen. Wer ihn stellt, wird nicht sofort belohnt: er weicht aus
   *      und wirft weiter.
   *
   * Werte gelten fuer Normal; die Schwierigkeitsstufen multiplizieren wie
   * gehabt (100 HP, 30 Schaden, 55 XP, 60–80 Gold).
   */
  gorilla: {
    name: 'Gorilla', maxHp: 100, damage: 30, defense: 0, speed: 60,
    /**
     * Wurfreichweite (VERBESSERUNGEN_1 Abschnitt 2: 288 px = 9 Kacheln).
     * Wahrnehmung = 1,3 x Angriffsreichweite ~ 374 px.
     */
    range: 288,
    aggroRadius: 374, loseAggroRadius: 520,
    /** Wunschabstand aus dem Dokument: "Haelt 200 px Abstand". */
    keepDistance: 200, distanceTolerance: 40,
    /** Seitliches Ausweichen, damit er kein stehendes Ziel ist. */
    strafeSpeedFactor: 0.5, strafeChangeTime: 1.6,
    /** "wirft alle 2 s einen Stein". */
    throwInterval: 2.0,
    /** >= 0,4 s sichtbare Ausholphase — Fairness-Regel, auf allen Stufen gleich. */
    windupTime: 0.5, strikeTime: 0.1, recoverTime: 0.4,
    /** "ca. 250 px/s" — langsam genug zum Ausweichen. */
    projectileSpeed: 250,
    stoneKnockback: 90,
    /** Endliche Flugstrecke des Steins = Wurfreichweite. */
    stoneMaxRange: 288,
    /**
     * Nahkampftreffer innerhalb dieser Distanz draengen ihn zurueck.
     * Gemessen wird der Abstand zum Spieler, nicht die Waffe: ein geworfener
     * Speer aus 400 px ist kein Nahkampf, ein Speerstoss aus 70 px schon.
     */
    retreatTriggerRange: 90,
    retreatDistance: 120, retreatTime: 0.45, retreatSpeedFactor: 1.3,
    hitbox: { w: 28, h: 28 }, sprite: { w: 30, h: 32, offsetY: -2 },
    knockbackResist: 0.5, gold: { min: 60, max: 80 }, xp: 55,
  },

  /**
   * Frosch — Sprung-Angreifer (Erweiterung 2, Abschnitt 1).
   *
   * "Laeuft mittelschnell auf den Spieler zu. In Reichweite springt er hoch
   * und landet mit einem Flaechenschaden."
   *
   * Er ist der erste Gegner, dessen Angriff eine FLAECHE trifft statt eines
   * Punktes — ausweichen heisst hier weglaufen, nicht danebenstehen. Damit das
   * fair bleibt, liegt waehrend des ganzen Fluges ein Zielkreis auf dem Boden:
   * er zeigt genau den Fleck, der gleich Schaden nimmt. Der Kreis ist die
   * Ausholphase, und mit 1,2 s ist sie die laengste im Spiel — die Flaeche ist
   * gross, also braucht man Zeit, sie zu verlassen.
   *
   * Waehrend des Sprungs ist er nicht angreifbar (Abschnitt 1). Das ist der
   * Preis dafuer, dass man ihm ausweichen kann: wer nur zuschlaegt, trifft
   * Luft; wer laeuft, ueberlebt und schlaegt danach zu.
   */
  frog: {
    name: 'Frosch', maxHp: 120, damage: 35, defense: 0, speed: 85,
    aggroRadius: 300, loseAggroRadius: 460,
    /** Ab dieser Distanz springt er. Weiter weg laeuft er erst naeher heran. */
    jumpRange: 220,
    /** Kurzes sichtbares Ducken vor dem Absprung. */
    crouchTime: 0.2,
    /**
     * Flugdauer = Standzeit des Zielkreises: "Vor der Landung erscheint 1,2 s
     * lang ein Zielkreis auf dem Boden".
     */
    airTime: 1.2,
    /** Scheitelhoehe des Sprungs in Pixeln — reine Darstellung. */
    jumpHeight: 46,
    /** "Einschlagsradius: 96 px (3 Kacheln)". */
    impactRadius: 96,
    /** Nach der Landung steht er offen da — das ist das Zeitfenster zum Zuschlagen. */
    recoverTime: 0.8,
    /** Mindestpause zwischen zwei Spruengen. */
    jumpCooldown: 2.2,
    /**
     * Der Angriffszyklus der Basisklasse wird nicht benutzt (er springt statt
     * zuzuschlagen); windupTime steht hier nur, damit windupProgress und die
     * Fairness-Pruefung einen Wert finden.
     */
    windupTime: 0.2, strikeTime: 0.1,
    hitbox: { w: 24, h: 22 }, sprite: { w: 26, h: 24, offsetY: -2 },
    knockbackResist: 0.2, gold: { min: 85, max: 100 }, xp: 75,
  },

  /**
   * Giftpilz — Debuff-Gegner (Erweiterung 2, Abschnitt 1).
   *
   * "Rennt auf den Spieler zu und versprueht in Reichweite eine Giftwolke."
   *
   * Viel Leben, wenig direkter Schaden: er ist ein AUSDAUER-Gegner, kein
   * Bedrohungs-Gegner. Einer allein ist kaum gefaehrlich — mehrere zusammen
   * verwandeln den Boden in Flaechen, die man nicht betreten darf, und genau
   * deshalb funktioniert er in Gruppen.
   *
   * Der Unterschied zu allen bisherigen Gegnern: seine Wolke bleibt liegen,
   * nachdem er selbst schon weitergelaufen (oder tot) ist. Der Angriff endet
   * nicht mit dem Angreifer.
   */
  giftpilz: {
    name: 'Giftpilz', maxHp: 140, damage: 20, defense: 0, speed: 70,
    aggroRadius: 320, loseAggroRadius: 480,
    /** Ab dieser Distanz verspruecht er — knapp ausserhalb des Wolkenradius. */
    attackRange: 110,
    /** >= 0,4 s sichtbare Ausholphase (Fairness-Regel, auf allen Stufen gleich). */
    windupTime: 0.55, strikeTime: 0.15, recoverTime: 1.0,
    /** Mindestpause zwischen zwei Wolken. */
    sprayCooldown: 3.5,
    hitbox: { w: 24, h: 26 }, sprite: { w: 26, h: 28, offsetY: -2 },
    knockbackResist: 0.3, gold: { min: 110, max: 135 }, xp: 95,
  },

  /**
   * Krokodil — Hinterhalt (Erweiterung 2, Abschnitt 1).
   *
   * Der interessanteste neue Gegner und der, bei dem am meisten schiefgehen
   * kann. Sein Kreislauf hat drei Teile:
   *
   *   1. 3 s abgetaucht. Nicht angreifbar, dafuer schnell (180 px/s).
   *   2. Herausspringen und beissen — 0,5 s Ausholphase, dann 45 Schaden.
   *   3. 4 s an der Oberflaeche. NUR hier kann es Schaden nehmen.
   *
   * ZWEI DINGE SIND PFLICHT, KEIN DETAIL (so steht es im Dokument):
   *
   *   Der Schatten. Waehrend es abgetaucht ist, zeigt ein sichtbarer Schatten
   *   die ganze Zeit, wo es gerade ist. Ohne ihn waere das Krokodil ein
   *   unfairer Zufallsgenerator — 45 Schaden aus dem Nichts, ohne Chance.
   *
   *   Das 4-Sekunden-Fenster. Ohne es waere es unbesiegbar: abgetaucht nimmt
   *   es keinen Schaden, und wenn es nie lange genug oben bliebe, koennte man
   *   es nie toeten.
   */
  krokodil: {
    name: 'Krokodil', maxHp: 160, damage: 45, defense: 0,
    /** Grundtempo an der Oberflaeche — dort ist es traege und verwundbar. */
    speed: 55,
    /** "bewegt sich schneller (180 px/s)" — abgetaucht. */
    submergedSpeed: 180,
    aggroRadius: 340, loseAggroRadius: 620,
    /** "Taucht 3 s im Boden ab." */
    submergeTime: 3.0,
    /** "0,5 s Ausholphase (Schatten haelt an und wird groesser)". */
    windupTime: 0.5, strikeTime: 0.12,
    /** "Bleibt 4 s an der Oberflaeche. Nur in diesem Fenster kann es Schaden nehmen." */
    surfaceTime: 4.0,
    /** Ab dieser Distanz bricht es den Tauchgang ab und holt aus. */
    attackRange: 46,
    /** Trefferradius im Moment des Zubeissens. */
    strikeRadius: 58,
    /** Schatten am Boden: Grundgroesse und wie weit er beim Ausholen waechst. */
    shadowRadius: 15, shadowGrowth: 1.9,
    hitbox: { w: 30, h: 24 }, sprite: { w: 34, h: 26, offsetY: -2 },
    knockbackResist: 0.4, gold: { min: 150, max: 180 }, xp: 115,
  },

  /**
   * Boss (Level 5) mit drei Phasen (Abschnitt 6).
   * Die Phase haengt am Leben: ueber 66 % Phase 1, ueber 33 % Phase 2, darunter 3.
   */
  orcChieftain: {
    name: 'Ork-Haeuptling', maxHp: 600, damage: 35, defense: 5, speed: 55,
    aggroRadius: 900, loseAggroRadius: 9999,
    /** Nahkampf (Axtschlag): "unter 80 px" laut Spec. */
    attackRange: 80, strikeRadius: 100,
    windupTime: 0.6, strikeTime: 0.2, recoverTime: 1.0, strikeArc: 160,
    phases: 3,
    /** Ab diesem Lebensanteil beginnt die naechste Phase. */
    phaseThresholds: [0.66, 0.33],
    /**
     * Ansturm — 1,2 s rote Linie, dann geradeaus (VERBESSERUNGEN_1 Abschnitt 7).
     * Wirksam ab 150-400 px Abstand.
     */
    charge: {
      windupTime: 1.2, speed: 340, duration: 0.55, cooldown: 4.0,
      damage: 50, radius: 34, minRange: 150, maxRange: 400,
    },
    /**
     * Kriegsruf ab Phase 2 (VERBESSERUNGEN_1 Abschnitt 7): "ueber 400 px ruft
     * er 2 Goblins, max. 4 gleichzeitig, alle 12 s".
     */
    kriegsruf: {
      windupTime: 0.7, recoverTime: 0.8, cooldown: 12.0,
      distanceThreshold: 400,
      goblinCount: 2, maxAlive: 4, spawnRadius: 80,
    },
    /**
     * Wutmodus ab Phase 3 (VERBESSERUNGEN_1 Abschnitt 7): 1 s sichtbares
     * Bruellen als Vorwarnung, danach +30 % Tempo und Doppelschlag im
     * Nahkampf (2x 35 Schaden). Kein Kriegsruf mehr.
     */
    wutmodus: {
      introTime: 1.0,
      speedFactor: 1.3,
      /** Kuerzeres Ausholen fuer den Folgeschlag im Doppelschlag. */
      doppelschlagWindup: 0.35,
    },
    hitbox: { w: 40, h: 40 }, sprite: { w: 44, h: 46, offsetY: -4 },
    knockbackResist: 0.9, gold: { min: 350, max: 350 }, xp: 450,
    isBoss: true,
  },

  /**
   * Titanoboa — Endboss des Urwalds, zwei Phasen (Erweiterung 2, Abschnitt 1).
   *
   * PHASE 1 (100 % - 50 % HP): abgetaucht, versucht den Helden zu verschlingen.
   *   Ein Schatten wandert sichtbar ueber den Boden auf den Spieler zu. 1,5 s
   *   bevor sie hochschiesst, bleibt der Schatten stehen und pulsiert. Wer
   *   dann noch darauf steht, wird verschlungen: 100 Schaden. Danach bleibt
   *   sie 3 s ueber der Erde und ist angreifbar.
   *
   * PHASE 2 (unter 50 % HP): sie haeutet sich — kurze Pause, in der sie
   *   verwundbar ist und der Spieler frei Schaden macht. Danach taucht sie
   *   nicht mehr ab, kaempft offen, macht +20 Schaden auf alle Angriffe,
   *   ist 30 % schneller und groesser.
   *
   * DIE 1,5 SEKUNDEN VORWARNUNG SIND KEINE VERHANDLUNGSSACHE.
   * 100 Schaden sind bei 200-400 HP ein Viertel bis die Haelfte des Lebens in
   * einem einzigen Treffer. Ein Angriff dieser Groesse, dem man nicht sicher
   * entkommen kann, macht aus dem Endkampf ein Gluecksspiel. Deshalb steht der
   * Schatten die letzten 1,5 s still und pulsiert: weglaufen muss IMMER
   * moeglich sein.
   */
  titanoboa: {
    // Grundwerte laut VERBESSERUNGEN_1 Abschnitt 6.
    // damage ist der Grundschaden des Bisses (60); Feger 70, Spucke 40
    // stehen bei den Angriffen unten; Verschlingen 100 bleibt unveraendert.
    name: 'Titanoboa', maxHp: 750, damage: 60, defense: 0, speed: 70,
    aggroRadius: 900, loseAggroRadius: 9999,
    isBoss: true,
    phases: 2,
    /**
     * Unter diesem Lebensanteil beginnt Phase 2. Als Liste wie beim
     * Ork-Haeuptling — der Lebensbalken des Bosses zeichnet daraus die Marken,
     * an denen die naechste Phase beginnt.
     */
    phaseThresholds: [0.5],

    // --- Phase 1: abtauchen und verschlingen ---
    /** Tempo unter der Erde — sie holt auf, ohne angreifbar zu sein. */
    submergedSpeed: 150,
    /** Wie lange der Schatten wandert, bevor er sich festsetzt. */
    stalkTime: 2.2,
    /** "1,5 s bevor sie hochschiesst, bleibt der Schatten stehen und pulsiert". */
    lungeWarning: 1.5,
    /** Radius, in dem das Verschlingen trifft — die Flaeche des Schattens. */
    swallowRadius: 62,
    /** Schaden des Verschlingens in Phase 1; Phase 2 rechnet phase2DamageBonus dazu. */
    swallowDamage: 100,
    /** "Danach bleibt sie 3 s ueber der Erde und ist angreifbar." */
    surfaceTime: 3.0,
    /** Schatten am Boden: Grundgroesse und Puls waehrend der Vorwarnung. */
    shadowRadius: 30,

    // --- Phase 2: offener Kampf ---
    /**
     * Die Haeutung (VERBESSERUNGEN_1 Abschnitt 6): 3 Sekunden IMMUN,
     * Bildschirm wackelt leicht, alte Haut platzt sichtbar ab.
     */
    sheddingTime: 3.0,
    /** "+20 Schaden auf alle Angriffe (Feger 90, Biss 80, Spucke 60)". */
    phase2DamageBonus: 20,
    /** "30 % schneller in Bewegung und Angriffsfolge". */
    phase2SpeedFactor: 1.3,
    /** "Groesser" — auch leichter zu treffen, das ist Absicht. */
    phase2SizeFactor: 1.35,

    // --- Angriffe nach Abstand (Abschnitt 6) ---
    /** Schwanzfeger: unter 100 px, 360°-Radius 128 px, 70 Schaden. */
    tailSweep: {
      range: 100, radius: 128, damage: 70,
      windupTime: 0.55, strikeTime: 0.2,
    },
    /** Biss: 100-350 px, kurzer Vorstoss, 60 Schaden (Grundschaden). */
    bite: {
      minRange: 100, maxRange: 350, radius: 78,
      windupTime: 0.55, strikeTime: 0.15,
    },
    /** Giftspucke: ueber 350 px, 3 Geschosse, Reichweite 400, 40 pro Treffer. */
    spit: {
      minRange: 350, count: 3, spreadDeg: 22, speed: 280, maxRange: 400,
      damage: 40, windupTime: 0.7, strikeTime: 0.2,
    },
    /**
     * Pausen zwischen Angriffen: P1 2,0 s, P2 1,4 s (Abschnitt 6).
     * Ersetzt das alte recoverTime — recoverTime bleibt fuer Ansteuerung
     * bestehender Angriffe erhalten, laeuft aber im neuen Zyklus nicht mehr.
     */
    attackPauseP1: 2.0,
    attackPauseP2: 1.4,
    windupTime: 0.6, strikeTime: 0.15, recoverTime: 0.9,
    /** Der alte Biss-Bereich fuer Rueckwaertskompatibilitaet der Zeichnung. */
    biteRange: 78, biteRadius: 78,

    hitbox: { w: 44, h: 40 }, sprite: { w: 48, h: 44, offsetY: -4 },
    knockbackResist: 0.95, gold: { min: 500, max: 500 }, xp: 800,
  },
};

/**
 * Questliste (Erweiterung, Abschnitt 3).
 *
 * Absichtlich reine Daten: es gibt keinen Code pro Quest. Jeder Eintrag nennt
 * nur einen Zaehler und einen Zielwert — neue Quests brauchen deshalb nichts
 * als eine weitere Zeile hier, kein Programmieren.
 *
 * `counter` verweist auf die Zaehler aus stats.js (Schritt 7):
 *   kills:<typ>          Kills nach Monstertyp        z. B. kills:goblin
 *   weapon:<waffe>       Kills nach benutzter Waffe   z. B. weapon:bow
 *   level:<index>        wie oft dieses Level geschafft (0 = Waldlichtung)
 *   difficulty:<stufe>   Level-Abschluesse auf dieser Stufe oder hoeher
 *   stat:<feld>          jedes Zahlenfeld aus stats.js
 *   heroLevel            die Stufe des Helden
 *   nightmareNoDeath     Level, die auf Alptraum ohne Tod geschafft sind
 *
 *   stat:poisonFreeRuns   Level ohne eine einzige Vergiftung abgeschlossen
 *
 * `reward` kennt gold, xp, potions und skillPoints. Skillpunkte vergibt
 * ausschliesslich Quest 13 — sie ist die Kroenung des Spiels.
 *
 * Die Reihenfolge ist die Nachrueck-Reihenfolge: es sind immer die ersten drei
 * noch nicht abgeholten Quests aktiv.
 */
export const QUESTS = [
  // -------------------------------------------------------------------
  // Leichte Quests (VERBESSERUNGEN_1 Abschnitt 8) — grosse Menge,
  // schnell zu schaffen, kleine Belohnung.
  // -------------------------------------------------------------------
  { id: 101, text: 'Besiege 20 Schleims', counter: 'kills:slime', target: 20,
    tier: 'leicht', reward: { gold: 60, xp: 100 } },
  { id: 102, text: 'Besiege 15 Goblins', counter: 'kills:goblin', target: 15,
    tier: 'leicht', reward: { gold: 80, xp: 120 } },
  { id: 103, text: 'Sammle 300 Gold', counter: 'stat:goldEarned', target: 300,
    tier: 'leicht', reward: { gold: 80, xp: 100 } },
  { id: 104, text: 'Blocke 15 Angriffe', counter: 'stat:blocks', target: 15,
    tier: 'leicht', reward: { gold: 70, xp: 120 } },
  { id: 105, text: 'Besiege 10 Gegner mit dem Bogen', counter: 'weapon:bow', target: 10,
    tier: 'leicht', reward: { gold: 90, xp: 150 } },
  { id: 106, text: 'Spiele einen der Abschnitte 1-5 noch einmal durch',
    shortText: 'Abschnitt 1-5 wiederholen', counter: 'replay1to5', target: 1,
    tier: 'leicht', reward: { gold: 100, xp: 150 } },
  { id: 107, text: 'Kaufe ein beliebiges Upgrade', counter: 'stat:purchases', target: 1,
    tier: 'leicht', reward: { gold: 50, xp: 100 } },

  // -------------------------------------------------------------------
  // Mittlere Quests — ein bis zwei Level Arbeit.
  // -------------------------------------------------------------------
  { id: 201, text: 'Besiege 15 Gorillas', counter: 'kills:gorilla', target: 15,
    tier: 'mittel', reward: { gold: 300, xp: 500 } },
  { id: 202, text: 'Schaffe den Teich', counter: 'level:6', target: 1,
    tier: 'mittel', reward: { gold: 350, xp: 600 } },
  { id: 203, text: 'Besiege 20 Froesche', counter: 'kills:frog', target: 20,
    tier: 'mittel', reward: { gold: 400, xp: 700 } },
  { id: 204, text: 'Sammle 2.000 Gold', counter: 'stat:goldEarned', target: 2000,
    tier: 'mittel', reward: { gold: 500, xp: 400 } },
  { id: 205, text: 'Besiege 25 Giftpilze', counter: 'kills:giftpilz', target: 25,
    tier: 'mittel', reward: { gold: 500, xp: 800 } },
  { id: 206, text: 'Schaffe ein Level, ohne vergiftet zu werden',
    shortText: 'Level ohne Vergiftung', counter: 'stat:poisonFreeRuns', target: 1,
    tier: 'mittel', reward: { gold: 600, xp: 900 } },
  { id: 207, text: 'Besiege 20 Gegner mit dem Speer', counter: 'weapon:spear', target: 20,
    tier: 'mittel', reward: { gold: 600, xp: 800 } },
  { id: 208, text: 'Erreiche Stufe 12', counter: 'heroLevel', target: 12,
    tier: 'mittel', reward: { gold: 700, potions: 1 } },

  // -------------------------------------------------------------------
  // Schwere Quests — Ziele fuer mehrere Sitzungen.
  // -------------------------------------------------------------------
  { id: 301, text: 'Besiege 15 Krokodile', counter: 'kills:krokodil', target: 15,
    tier: 'schwer', reward: { gold: 1500, xp: 2000 } },
  { id: 302, text: 'Schaffe ein Level auf Alptraum', counter: 'difficulty:nightmare',
    target: 1, tier: 'schwer', reward: { gold: 1800, xp: 2500 } },
  { id: 303, text: 'Besiege den Ork-Haeuptling auf Schwer',
    counter: 'killDiff:orcChieftain:hard', target: 1,
    tier: 'schwer', reward: { gold: 2000, xp: 3000 } },
  { id: 304, text: 'Besiege die Titanoboa', counter: 'kills:titanoboa', target: 1,
    tier: 'schwer', reward: { gold: 2500, xp: 3500 } },
  { id: 305, text: 'Besiege die Titanoboa auf Alptraum',
    counter: 'killDiff:titanoboa:nightmare', target: 1,
    tier: 'schwer', reward: { gold: 3000, xp: 4000 } },
  {
    id: 306,
    text: 'Schaffe alle Level auf Alptraum, jedes ohne zu sterben',
    shortText: 'Alptraum ohne Tod',
    counter: 'nightmareNoDeath',
    // Jeder Tod zaehlt (auch Wiederbelebung gegen Gold), Fortschritt wird
    // pro Level einzeln gespeichert; ein durchgehender Lauf ist nicht noetig.
    target: 10,
    tier: 'schwer', reward: { gold: 3000, xp: 5000, skillPoints: 5 },
  },
];

/**
 * Ab wann das Questmenue ueberhaupt erscheint (Erweiterung 2, Abschnitt 8):
 * erst nach Abschluss des Urwalds (Level 6, Index 5).
 *
 * Vorher ist die Kachel sichtbar, aber grau — der Spieler soll sehen, dass da
 * noch etwas kommt. Frueher freigeschaltet waere die Liste sinnlos: "Besiege
 * 15 Gorillas" kann man vor dem Urwald gar nicht angehen.
 */
export const QUESTS_UNLOCK_LEVEL = 5;

/** Wie viele Quests gleichzeitig aktiv sind (Abschnitt 3). */
export const QUEST_SLOTS = 3;

/**
 * Schwierigkeitsstufen bei Level-Wiederholung (Erweiterung, Abschnitt 4).
 *
 * Erhoeht werden ausschliesslich HP, Schaden und — nur auf Alptraum — das
 * Bewegungstempo der Gegner. Die Ausholphase vor einem Angriff bleibt auf
 * ALLEN Stufen gleich lang: schneller reagieren zu muessen ist kein
 * Schwierigkeitsgrad, sondern fuehlt sich nur unfair an. Deshalb stehen
 * windupTime, strikeTime und recoverTime hier bewusst nicht drin.
 *
 * `stars` ist die Zahl gefuellter Sterne am Levelknoten der Route.
 */
export const DIFFICULTIES = {
  normal: {
    name: 'Normal', short: 'N',
    hp: 1.0, damage: 1.0, speed: 1.0, gold: 1.0, xp: 1.0,
    attackSpeed: 1.0, aim: 1.0,
    // KI-Verhaltensschalter (VERBESSERUNGEN_1 Abschnitt 5).
    surround: false, staggerAttacks: false, punishDodge: false,
    stars: 1,
    unlockNote: 'von Anfang an',
  },
  hard: {
    name: 'Schwer', short: 'S',
    hp: 1.5, damage: 1.3, speed: 1.0, gold: 1.8, xp: 1.8,
    attackSpeed: 1.25, aim: 1.5,
    // Umzingeln + versetzt angreifen + Schild umgehen.
    surround: true, staggerAttacks: true, punishDodge: false,
    stars: 2,
    unlockNote: 'Level auf Normal geschafft',
  },
  nightmare: {
    name: 'Alptraum', short: 'A',
    hp: 2.2, damage: 1.7, speed: 1.15, gold: 3.0, xp: 3.0,
    attackSpeed: 1.55, aim: 2.2,
    // Zusaetzlich: Ausweichrolle abwarten (Schritt 2, kommt separat).
    surround: true, staggerAttacks: true, punishDodge: true,
    stars: 3,
    unlockNote: 'Level auf Schwer geschafft',
  },
};

/**
 * Reihenfolge der Stufen. Der Index ist zugleich der gespeicherte Wert
 * ("hoechste geschaffte Stufe"), -1 heisst "noch nie geschafft".
 */
export const DIFFICULTY_ORDER = ['normal', 'hard', 'nightmare'];

/** Gold-Muenzen, die Gegner fallen lassen. */
export const LOOT = {
  /** Ab dieser Distanz wird die Muenze eingesammelt (Abschnitt 6: ca. 40 px). */
  pickupRadius: 40,
  /** Ab hier fliegt die Muenze dem Spieler entgegen. */
  magnetRadius: 78,
  magnetSpeed: 260,
  /** Anfangsschwung beim Drop. */
  scatterSpeed: 70,
  friction: 6,
  /** Muenze ist erst nach dieser Zeit einsammelbar. */
  armTime: 0.15,
  bobAmplitude: 2.5,
  bobSpeed: 5,
  sprite: { w: 10, h: 10 },
};

/**
 * Tod & Wiederbelebung (Abschnitt 9).
 *
 * Kosten: 50 G beim ersten Tod pro Level, danach je 25 G mehr
 * (50 -> 75 -> 100 -> 125 …). Der Zaehler wird zurueckgesetzt, sobald das
 * Level abgeschlossen ist.
 */
export const DEATH = {
  reviveBaseCost: 50,
  /** Aufschlag pro weiterem Tod im selben Level. */
  reviveCostIncrement: 25,
  /** Gnadenfrist nach dem Aufstehen, damit man nicht sofort wieder stirbt. */
  reviveInvulnTime: 1.6,
  /** Kurze Sperre, bevor der Todesbildschirm Eingaben annimmt (Fehlklicks). */
  screenInputDelay: 0.35,
  /** Wie lange der Bildschirm einblendet. */
  fadeInTime: 0.5,
};

/**
 * Ton (Abschnitt 8). Alle Lautstaerken 0…1.
 * Stummschalten im Spiel mit M.
 */
export const AUDIO = {
  enabled: true,
  masterVolume: 0.7,
  sfxVolume: 0.8,
  /** Zufaellige Tonhoehen-Streuung, damit Wiederholungen nicht mechanisch klingen. */
  pitchSpread: 0.08,
  /** Mindestabstand zwischen zwei gleichen Toenen in Sekunden. */
  retriggerDelay: 0.04,
};

/**
 * Sprites (Abschnitt 8): alle Assets sind 32x32.
 * Solange kein Bild geladen ist, zeichnet gfx.js Platzhalter in der Groesse
 * `sprite.w` x `sprite.h`. Mit Bild wird quadratisch in `spriteScale * 32`
 * gezeichnet — so passen Kenney-Kacheln ohne Verzerrung.
 */
export const SPRITES = {
  /** Kantenlaenge einer Sprite-Quelldatei. */
  size: 32,
  /** Vergroesserung je Figur (1 = 32 px). */
  scale: {
    player: 1,
    slime: 1,
    goblin: 1,
    archer: 1,
    armoredOrc: 1.15,
    orcChieftain: 1.75,
    gorilla: 1.3,
    frog: 1,
    giftpilz: 1.1,
    krokodil: 1.25,
    titanoboa: 2.0,
    coin: 0.5,
  },
};

/** HP-Balken ueber Gegnern und HUD-Layout. */
export const UI = {
  enemyHpBar: { width: 30, height: 4, offsetY: 10, hideWhenFull: true },
  hud: {
    margin: 14,
    hpBar: { width: 220, height: 18 },
    staminaBar: { width: 220, height: 8 },
    /** Ausdauerleiste ausblenden, wenn sie voll ist? */
    hideStaminaWhenFull: false,
    /**
     * XP-Leiste am unteren Bildschirmrand (Erweiterung, Abschnitt 1).
     * Sie ist dauerhaft sichtbar, daneben steht die aktuelle Stufe.
     */
    xpBar: { width: 420, height: 9, bottomMargin: 12 },
    font: '14px "Segoe UI", system-ui, sans-serif',
    fontSmall: '11px "Segoe UI", system-ui, sans-serif',
  },
  /** Aufsteigende Schadenszahlen. */
  damageNumbers: { rise: 26, duration: 0.7 },
  /** Menue-Bildschirme (Tod, spaeter Shop und Pause). */
  menu: {
    buttonWidth: 380,
    buttonHeight: 56,
    gap: 12,
    panelPadding: 26,
    font: '16px "Segoe UI", system-ui, sans-serif',
    titleFont: '42px "Segoe UI", system-ui, sans-serif',
  },
};

/**
 * Farbpalette — duester-mittelalterlich (Abschnitt 8).
 * Solange keine Sprites geladen sind, zeichnet gfx.js farbige Rechtecke in diesen Farben.
 */
export const COLORS = {
  background: '#14131a',
  // Level 1 — Waldlichtung
  grass: '#33402f',
  grassDark: '#2b3628',
  path: '#463f33',
  wall: '#3b3a44',
  wallTop: '#4a4955',
  tree: '#243021',
  treeTop: '#2e3d29',
  // Level 2 und 5 — Hoehle
  caveFloor: '#2e2b31',
  caveFloorDark: '#26242a',
  caveWall: '#3a3640',
  caveWallTop: '#494452',
  rock: '#2b2932',
  rockTop: '#3a3742',
  // Level 3 — Ruinen
  ruinFloor: '#3a3a3d',
  ruinFloorDark: '#323235',
  // Level 4 — Orklager
  dirt: '#463c30',
  dirtDark: '#3d352b',
  palisade: '#4a3a28',
  palisadeTop: '#5c4a33',
  // Level 5 — Bosskammer
  bossFloor: '#312a2c',
  bossFloorDark: '#292325',
  // Level 6-9 — Urwald, Teich, Wiese, Sumpf (Erweiterung 2, Abschnitt 2)
  water: '#25404a',
  waterTop: '#315866',
  swampFloor: '#3a3f2e',
  swampFloorDark: '#31362a',
  reed: '#4a5730',
  reedTop: '#61713f',

  player: '#8fa2b8',
  playerAccent: '#d8d3c4',
  playerHit: '#e8e2d4',
  shield: '#7d838f',
  shieldRim: '#b9bec9',
  shieldBlock: '#e9e4d6',
  bow: '#8a6f47',
  arrow: '#d6cdb4',
  arrowTip: '#b9bec9',
  // Speer (Erweiterung 2, Abschnitt 3): Holzschaft, helle Metallspitze.
  spear: '#9a7a4e',
  spearTip: '#c9cedb',

  // Urwald (Erweiterung 2): Gorilla und sein Stein, Frosch, Giftpilz, Krokodil.
  titanoboa: '#4d6b4a',
  titanoboaAccent: '#8fb36a',
  /** Der wandernde Schatten der Titanoboa und sein Puls in der Vorwarnung. */
  boaShadow: 'rgba(10,18,12,0.60)',
  boaShadowWarn: 'rgba(217,86,63,0.75)',
  krokodil: '#3f5540',
  krokodilAccent: '#5d7a52',
  /** Schatten des abgetauchten Krokodils — die Vorwarnung schlechthin. */
  lurkShadow: 'rgba(12,20,14,0.55)',
  lurkShadowEdge: 'rgba(180,220,150,0.45)',
  giftpilz: '#6b4a6b',
  giftpilzAccent: '#9a6f9a',
  /** Giftwolke und der gruene Schimmer des vergifteten Spielers. */
  poison: '#7fbf4a',
  poisonDark: '#4a7a2f',
  frog: '#4a6b3a',
  frogAccent: '#6d9450',
  /** Zielkreis des Froschsprungs — dieselbe Warnfarbe wie jede Ausholphase. */
  impactRing: '#d9563f',
  gorilla: '#4a4038',
  gorillaAccent: '#6b5c4d',
  stone: '#6e6a63',
  stoneDark: '#4b4842',

  slime: '#5c7a4a',
  slimeAccent: '#7d9c63',
  goblin: '#6b7a3a',
  goblinAccent: '#98a75c',
  archer: '#6a5f7d',
  archerAccent: '#9b8fb0',
  orc: '#7a5a3c',
  orcArmor: '#5b5f66',
  boss: '#8c3f2f',
  bossAccent: '#d9a04a',
  enemyWindup: '#d9563f',
  enemyHit: '#f0e6d8',

  gold: '#d9b04a',
  goldDark: '#8a6c22',
  blood: '#8c2f2f',

  hpFill: '#a33c3c',
  hpBack: '#1c1a20',
  hpBorder: '#0a090c',
  staminaFill: '#3c7a5a',
  staminaLow: '#7a6a3c',    // zu wenig Ausdauer fuer eine Rolle
  staminaEmpty: '#8c4a2f',  // Rollversuch ohne Ausdauer
  rollTrail: '#8fa2b8',

  text: '#d8d3c4',
  textDim: '#8b8577',
  swing: '#e8e2d4',
  debug: '#39d0ff',

  // XP und Stufe (Erweiterung, Abschnitt 1) — bewusst kein Gold-Ton,
  // damit man die beiden Waehrungen nie verwechselt.
  xpFill: '#5a7fb0',
  xpFillBright: '#8fbdea',
  xpBack: '#1c1a20',

  exitClosed: '#413a33',
  exitOpen: '#cbb87a',
  exitGlow: 'rgba(203,184,122,0.22)',
  potion: '#a8455c',

  // Menue-Bildschirme
  menuOverlay: 'rgba(9,8,11,0.78)',
  menuPanel: '#191720',
  menuBorder: '#3a3646',
  menuButton: '#221f2b',
  menuButtonHover: '#2e2a3a',
  menuButtonDisabled: '#1a1820',
  menuTextDisabled: '#565062',
  menuAccent: '#cbb87a',
};

/**
 * Level-Reihenfolge (Abschnitt 7).
 * Alle Level sind gebaut; `built: false` wuerde eines im Shop sperren.
 */
export const LEVELS = [
  {
    name: 'Waldlichtung',
    url: './assets/levels/level1.json',
    built: true,
    // Kurztext fuer das Auswahlfenster der Route (Erweiterung, Abschnitt 2).
    description: 'Ein paar Slimes zwischen den Baeumen. Der ruhige Anfang.',
  },
  {
    name: 'Hoehleneingang',
    url: './assets/levels/level2.json',
    built: true,
    description: 'Goblins im Halbdunkel — sie schlagen zu und weichen sofort zurueck.',
  },
  {
    name: 'Ruinen',
    url: './assets/levels/level3.json',
    built: true,
    description: 'Bogenschuetzen auf offenem Grund. Deckung suchen oder schnell sein.',
  },
  {
    name: 'Orklager',
    url: './assets/levels/level4.json',
    built: true,
    description: 'Panzer-Orks hinter der Palisade. Langsam, aber jeder Treffer sitzt.',
  },
  {
    name: 'Bosskammer',
    url: './assets/levels/level5.json',
    built: true,
    description: 'Der Ork-Haeuptling in drei Phasen. Das Ende der alten Route.',
  },
  // --- Das Urwald-Kapitel (Erweiterung 2, Abschnitt 2) ---
  {
    name: 'Urwald',
    url: './assets/levels/level6.json',
    built: true,
    description: 'Gorillas zwischen den Baeumen. Sie halten Abstand und werfen Steine.',
  },
  {
    name: 'Teich',
    url: './assets/levels/level7.json',
    built: true,
    description: 'Froesche am Wasser, Gorillas am Ufer. Achte auf die Zielkreise.',
  },
  {
    name: 'Wiese',
    url: './assets/levels/level8.json',
    built: true,
    description: 'Offenes Feld voller Giftpilze. Hier hilft nur Laufen.',
  },
  {
    name: 'Sumpf',
    url: './assets/levels/level9.json',
    built: true,
    description: 'Krokodile im Schlamm. Der Schatten zeigt, wo sie sind.',
  },
  {
    name: 'Bosskammer',
    url: './assets/levels/level10.json',
    built: true,
    description: 'Die Titanoboa in zwei Phasen. Das Ende des Spiels.',
  },
];

/** Level-Ausgang (Abschnitt 7). */
export const LEVEL = {
  /** Abstand zur Ausgangsmitte, in dem E funktioniert. */
  exitRadius: 44,
  /** Kantenlaenge der Ausgangsmarke. */
  exitSize: 30,
  /** Pfeil am Bildschirmrand, wenn der offene Ausgang ausserhalb liegt. */
  showExitArrow: true,
  arrowMargin: 34,
};

/**
 * Spielstand (Abschnitt 9).
 * Gespeichert wird automatisch nach jedem abgeschlossenen Level und nach
 * jedem Shop-Kauf.
 */
export const SAVE = {
  enabled: true,
  /** Schluessel im localStorage. Aendern = alte Staende werden ignoriert. */
  key: 'lootAndBlade.save.v1',
  /**
   * Hochzaehlen, wenn sich das Format ODER die Bedeutung gespeicherter Werte
   * aendert — alte Staende werden dann verworfen.
   *
   * 1 -> 2 (Erweiterung 2, Abschnitt 6): die XP-Kurve ist von x1,4 auf x1,25
   * umgestellt. Ein gespeichertes `level` bedeutet damit etwas anderes als
   * vorher — wer mit Stufe 8 gespeichert hat, haette mit der neuen Kurve
   * laengst Stufe 11. Umrechnen ginge, waere aber Rateraten: die bereits
   * vergebenen Skillpunkte muessten mitwandern, und die Max-Stufe der Skills
   * ist im selben Zug von 5 auf 15 gestiegen. Deshalb der saubere Schnitt.
   */
  version: 2,
  /** Wie lange "Gespeichert" eingeblendet wird. */
  noticeTime: 1.2,
  /**
   * Hinweis, den der Spieler einmal sieht, wenn sein Stand wegen einer
   * Versionsaenderung zurueckgesetzt wurde (Erweiterung 2, Abschnitt 6).
   */
  resetNotice: 'Der Spielstand stammte aus einer aelteren Version und wurde zurueckgesetzt.',
  resetReason: 'Grund: neue XP-Kurve — die alten Stufen wuerden nicht mehr passen.',
  /**
   * Eigene Version fuer die QUESTLISTE (Erweiterung 2, Abschnitt 8).
   *
   * Die Liste wurde vollstaendig ersetzt, und `claimedQuests` speichert nur
   * IDs — die alte Quest 3 und die neue Quest 3 sind voellig verschiedene
   * Aufgaben. Ohne diese Nummer haette ein vorhandener Stand drei neue Quests
   * als "schon abgeholt" gefuehrt.
   *
   * Bewusst getrennt von SAVE.version: hier muss NICHT der ganze Stand weg.
   * Es reicht, die abgeholten Quests zu vergessen — Gold, Stufe, Ausruestung
   * und Levelfortschritt bleiben, wo sie sind.
   */
  questListVersion: 2,
  /** Hinweis dazu, einmalig beim Laden. */
  questResetNotice: 'Neue Questliste — die Quests fangen von vorne an.',
  questResetReason: 'Alles andere am Spielstand bleibt erhalten: Gold, Stufe, Ausruestung, Level.',
};

/** Welches Level beim Start geladen wird. */
export const START_LEVEL = LEVELS[0].url;
