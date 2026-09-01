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
  /** Reichweite ab Spielermitte. */
  range: 46,
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
  /** Obergrenze der Schadensreduktion, auch mit Skill "Blockmeister". */
  maxBlock: 0.95,
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
 * Pfeil und Bogen (Abschnitt 3 und 5).
 * Pfeile sind unbegrenzt, aber mit Cooldown — keine Munitionsverwaltung.
 */
export const BOW = {
  /** 1 Schuss / 0,8 s. Der Kompositbogen halbiert das ueber fireRateFactor. */
  cooldown: 0.8,
  arrowSpeed: 420,
  /** Flugzeit in Sekunden — daraus ergibt sich die Reichweite (420 * 1,4 = 588 px). */
  arrowLife: 1.4,
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
  /** Jede weitere Stufe kostet das 1,4-fache der vorigen. */
  growth: 1.4,
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

/** Skillbaum — ab Schritt 11. */
export const SKILLS = {
  tree: {
    vitality: { name: 'Vitalitaet', maxRank: 5, perRank: 20 },
    strength: { name: 'Staerke', maxRank: 5, perRank: 3 },
    armor: { name: 'Ruestung', maxRank: 5, perRank: 2 },
    speed: { name: 'Geschwindigkeit', maxRank: 5, perRank: 0.08 },
    archery: { name: 'Bogenschuetze', maxRank: 5, perRank: 0.15 },
    blockMaster: { name: 'Blockmeister', maxRank: 5, perRank: 0.10 },
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
    aggroRadius: 340, loseAggroRadius: 520,
    /** Wunschabstand; darunter weicht er zurueck, darueber rueckt er nach. */
    keepDistance: 200, distanceTolerance: 40,
    /** Seitliches Ausweichen, damit er kein stehendes Ziel ist. */
    strafeSpeedFactor: 0.55, strafeChangeTime: 1.4,
    shootInterval: 2.0, windupTime: 0.5, strikeTime: 0.1, recoverTime: 0.4,
    projectileSpeed: 300, arrowKnockback: 60,
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
   * Boss (Level 5) mit drei Phasen (Abschnitt 6).
   * Die Phase haengt am Leben: ueber 66 % Phase 1, ueber 33 % Phase 2, darunter 3.
   */
  orcChieftain: {
    name: 'Ork-Haeuptling', maxHp: 400, damage: 25, defense: 5, speed: 55,
    aggroRadius: 900, loseAggroRadius: 9999, attackRange: 52, strikeRadius: 72,
    windupTime: 0.6, strikeTime: 0.2, recoverTime: 1.0, strikeArc: 160,
    phases: 3,
    /** Ab diesem Lebensanteil beginnt die naechste Phase. */
    phaseThresholds: [0.66, 0.33],
    /** Phase 2+: Ansturm. Holt sichtbar aus, dann geradeaus. */
    charge: {
      windupTime: 0.7, speed: 340, duration: 0.55, cooldown: 4.0,
      damage: 20, radius: 34, minRange: 120, maxRange: 420,
    },
    /** Phase 3: Bodenstampfer im Umkreis, trifft auch hinter ihm. */
    slam: {
      windupTime: 0.9, radius: 130, damage: 30, cooldown: 6.0, recoverTime: 1.2,
    },
    /** Phase 3 macht ihn schneller und ungeduldiger. */
    phase3SpeedFactor: 1.3, phase3RecoverFactor: 0.7,
    hitbox: { w: 40, h: 40 }, sprite: { w: 44, h: 46, offsetY: -4 },
    knockbackResist: 0.9, gold: { min: 200, max: 200 }, xp: 300,
    isBoss: true,
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
 * `reward` kennt gold, xp, potions und skillPoints. Skillpunkte vergibt
 * ausschliesslich Quest 11 — sie ist die Kroenung des Spiels (Abschnitt 1).
 *
 * Die Reihenfolge ist die Nachrueck-Reihenfolge: es sind immer die ersten drei
 * noch nicht abgeholten Quests aktiv.
 */
export const QUESTS = [
  { id: 1, text: 'Besiege 10 Slimes', counter: 'kills:slime', target: 10,
    reward: { gold: 50, xp: 50 } },
  { id: 2, text: 'Schaffe die Waldlichtung', counter: 'level:0', target: 1,
    reward: { gold: 75, xp: 100 } },
  { id: 3, text: 'Sammle 200 Gold', counter: 'stat:goldEarned', target: 200,
    reward: { gold: 100 } },
  { id: 4, text: 'Besiege 20 Goblins', counter: 'kills:goblin', target: 20,
    reward: { gold: 120, xp: 150 } },
  { id: 5, text: 'Schaffe ein Level ohne zu sterben', counter: 'stat:cleanRuns', target: 1,
    reward: { gold: 150, xp: 200 } },
  { id: 6, text: 'Erreiche Stufe 5', counter: 'heroLevel', target: 5,
    reward: { gold: 200, potions: 1 } },
  { id: 7, text: 'Besiege 10 Gegner mit dem Bogen', counter: 'weapon:bow', target: 10,
    reward: { gold: 150, xp: 150 } },
  { id: 8, text: 'Blocke 15 Angriffe', counter: 'stat:blocks', target: 15,
    reward: { gold: 100, xp: 100 } },
  { id: 9, text: 'Schaffe ein Level auf Schwer', counter: 'difficulty:hard', target: 1,
    reward: { gold: 250, xp: 300 } },
  { id: 10, text: 'Besiege den Ork-Haeuptling', counter: 'kills:orcChieftain', target: 1,
    reward: { gold: 500, xp: 500 } },
  {
    id: 11,
    text: 'Schaffe alle Level auf Alptraum, jedes ohne zu sterben',
    // Kurzform fuer die Fortschrittszeile: "Alptraum ohne Tod  3/5".
    shortText: 'Alptraum ohne Tod',
    counter: 'nightmareNoDeath',
    target: 5,
    reward: { gold: 1000, xp: 2000, skillPoints: 5 },
  },
];

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
    stars: 1,
    unlockNote: 'von Anfang an',
  },
  hard: {
    name: 'Schwer', short: 'S',
    hp: 1.5, damage: 1.3, speed: 1.0, gold: 1.8, xp: 1.8,
    stars: 2,
    unlockNote: 'Level auf Normal geschafft',
  },
  nightmare: {
    name: 'Alptraum', short: 'A',
    hp: 2.2, damage: 1.7, speed: 1.15, gold: 3.0, xp: 3.0,
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

  player: '#8fa2b8',
  playerAccent: '#d8d3c4',
  playerHit: '#e8e2d4',
  shield: '#7d838f',
  shieldRim: '#b9bec9',
  shieldBlock: '#e9e4d6',
  bow: '#8a6f47',
  arrow: '#d6cdb4',
  arrowTip: '#b9bec9',

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
    description: 'Der Ork-Haeuptling in drei Phasen. Das Ende der Route.',
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
  /** Hochzaehlen, wenn sich das Format aendert — alte Staende werden dann verworfen. */
  version: 1,
  /** Wie lange "Gespeichert" eingeblendet wird. */
  noticeTime: 1.2,
};

/** Welches Level beim Start geladen wird. */
export const START_LEVEL = LEVELS[0].url;
