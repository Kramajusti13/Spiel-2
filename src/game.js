/**
 * game.js — haelt den Spielzustand zusammen und treibt update/draw an.
 *
 * Zustaende: menu, dashboard, playing, paused, dead (Todesbildschirm),
 * character und loading. Jeder Zustand hat in update() und draw() einen eigenen
 * Ast. Einzige Ausnahme ist das Dashboard: das ist HTML und wird nicht
 * gezeichnet, sondern nur ein- und ausgeblendet (siehe syncScreen).
 */

import { VIEW, COLORS, DEATH, DEBUG, DIFFICULTY_ORDER, LEVEL, LEVELS, LOADOUT, LOOT, PLAYER, ROLL, SAVE, UI, XP } from './config.js';
import { Camera } from './camera.js';
import { loadLevel } from './level.js';
import { Player, createProgress, findFreeSpot } from './entities/player.js';
import { createEnemy } from './entities/enemies.js';
import { Coin } from './entities/coin.js';
import { Arrow } from './entities/arrow.js';
import { ThrownSpear } from './entities/thrownSpear.js';
import { Stone } from './entities/stone.js';
import { PoisonSpit } from './entities/poisonSpit.js';
import { PoisonCloud } from './entities/poisonCloud.js';
import { drawHud, drawLevelIntro } from './hud.js';
import { DeathScreen } from './ui/deathScreen.js';
import { CharacterWindow } from './ui/characterWindow.js';
import { MainMenu } from './ui/mainMenu.js';
import { PauseMenu } from './ui/pauseMenu.js';
import { Dashboard } from './ui/dashboard.js';
import { buy as buyOffer } from './shop.js';
import { respec, respecPrice, spendPoint, spentPoints } from './skills.js';
import { clearSave, loadGame, saveGame } from './save.js';
import { difficultyDef, difficultyIndex, difficultyName } from './difficulty.js';
import { createStats, recordKill } from './stats.js';
import { activeQuests, claimQuest, questProgress, questsUnlocked } from './quests.js';
import { isMaxLevel, xpRatio, xpToNext } from './xp.js';
import { WEAPON_ORDER, loadout } from './weapons.js';
import { drawText, fillRect, strokeRect } from './gfx.js';
import { playSound, toggleMuted, isMuted } from './audio.js';
import { randInt, clamp, dist } from './util.js';

export class Game {
  constructor(ctx, input) {
    this.ctx = ctx;
    this.input = input;
    this.camera = new Camera();

    this.level = null;
    this.player = null;
    this.enemies = [];
    this.coins = [];
    this.arrows = [];    // Pfeile von Spieler und (ab Schritt 12) Gegnern
    /**
     * Giftwolken (Erweiterung 2, Abschnitt 1). Eigene Liste, weil sie keine
     * Flugkoerper sind: sie liegen still, verschwinden nicht beim ersten
     * Treffer und ueberdauern ihren Verursacher.
     */
    this.clouds = [];
    this.effects = [];   // Schadenszahlen, Funken

    /**
     * 'menu' | 'dashboard' | 'playing' | 'paused' | 'dead' | 'character' |
     * 'loading'. Den Shop gibt es seit Schritt 3 nur noch als Kachel im
     * Dashboard, also nicht mehr als eigenen Zustand.
     */
    this.state = 'menu';
    this.deathScreen = new DeathScreen(this);
    this.characterWindow = new CharacterWindow(this);
    this.mainMenu = new MainMenu(this);
    this.pauseMenu = new PauseMenu(this);
    this.dashboard = new Dashboard(this);
    /** Wohin das Charakterfenster zurueckkehrt: 'playing' oder 'dashboard'. */
    this.characterReturnState = 'playing';
    /** Index in LEVELS. */
    this.levelIndex = 0;
    /** Hoechstes freigeschaltetes Level — wandert in den Spielstand. */
    this.unlockedLevel = 0;
    /**
     * Pro Level der Index der hoechsten dort geschafften Schwierigkeitsstufe,
     * -1 = noch nie geschafft (Erweiterung, Abschnitt 4). Traegt zugleich den
     * Haken der Route: geschafft ist alles ab 0. Nicht aus unlockedLevel
     * ableitbar — das letzte Level kann nichts mehr freischalten.
     */
    this.bestDifficulty = LEVELS.map(() => -1);
    /** Stufe des laufenden Durchgangs. */
    this.difficulty = DIFFICULTY_ORDER[0];

    /**
     * Zentrale Zaehler (Erweiterung, Schritt 7) — Grundlage fuer die Quests.
     * Laufen spieluebergreifend weiter und werden nie kleiner.
     */
    this.stats = createStats();
    /**
     * IDs der Quests, deren Belohnung schon abgeholt ist (Abschnitt 3).
     * Daraus ergeben sich die drei aktiven Quests — es ruecken immer die
     * ersten drei noch offenen aus der Liste nach.
     */
    this.claimedQuests = [];
    /**
     * Tode im laufenden VERSUCH. Getrennt von deathsThisLevel, das den
     * Wiederbelebungspreis treibt: hier zaehlt, ob ein Durchgang sauber war.
     * Ein Neustart beginnt einen neuen Versuch (resetLevel), eine
     * Wiederbelebung nicht — der Tod bleibt dann angerechnet (Abschnitt 3).
     */
    this.deathsThisRun = 0;

    this.gold = 0;
    this.goldPop = 0;
    /**
     * Gold, das im laufenden Durchgang eingesammelt wurde. Nur dieser Teil geht
     * beim kostenlosen Level-Neustart verloren (Abschnitt 9).
     */
    this.runGold = 0;
    /** Todeszaehler des aktuellen Levels — bestimmt den Wiederbelebungspreis. */
    this.deathsThisLevel = 0;
    /**
     * Wurde der Spieler in diesem Durchgang vergiftet? Traegt die Quest
     * "Schaffe ein Level, ohne vergiftet zu werden" (Abschnitt 8).
     */
    this.poisonedThisRun = false;
    this.levelCleared = false;

    /** Ausruestung, Stufe, XP und Skillpunkte — ueberleben Tod und Neustart. */
    this.progress = createProgress();

    /**
     * Gezeichneter Stand der XP-Leiste. Laeuft dem echten Wert hinterher,
     * damit sich die Leiste bei jedem Kill sichtbar fuellt (Abschnitt 1).
     */
    this.xpBarRatio = 0;
    this.xpBarLevel = 1;
    /** Restzeit des Aufleuchtens nach einem Stufenaufstieg. */
    this.levelUpFlash = 0;

    this.introTimer = 0;
    this.shakeAmount = 0;
    this.shakeTime = 0;
    this.debug = DEBUG.enabled;
    this.fps = 0;

    /** Kurze Einblendung, z. B. "Ton aus". */
    this.notice = '';
    this.noticeTimer = 0;
    this.muted = isMuted();
  }

  // --- Spielstand und Menues (Abschnitt 9) --------------------------------

  /** Hauptmenue zeigen. */
  openMainMenu() {
    this.state = 'menu';
    this.mainMenu.open();
  }

  /** Neues Spiel: Spielstand loeschen und auf dem Dashboard anfangen. */
  newGame() {
    clearSave();
    this.gold = 0;
    this.runGold = 0;
    this.deathsThisLevel = 0;
    this.unlockedLevel = 0;
    this.bestDifficulty = LEVELS.map(() => -1);
    this.difficulty = DIFFICULTY_ORDER[0];
    this.stats = createStats();
    this.claimedQuests = [];
    this.progress = createProgress();
    this.syncXpBar();
    // Beim Spielstart landet der Spieler auf dem Dashboard (Abschnitt 2).
    this.openDashboard('Neues Spiel — los geht es in der Waldlichtung.');
  }

  /** Gespeicherten Stand laden und auf dem Dashboard weitermachen. */
  continueGame() {
    const s = loadGame();
    if (!s) {
      this.newGame();
      return false;
    }
    this.gold = s.gold;
    this.unlockedLevel = s.unlockedLevel;
    this.bestDifficulty = s.bestDifficulty;
    this.stats = s.stats;
    this.claimedQuests = s.claimedQuests;
    this.progress = s.progress;
    this.runGold = 0;
    this.deathsThisLevel = 0;
    this.syncXpBar();

    // Weiterspielen fuehrt aufs Dashboard, nicht mitten ins Level
    // (Abschnitt 2). Das Level muss dafuer nicht vorgeladen werden.
    this.levelIndex = s.levelIndex;
    this.openDashboard('Spielstand geladen.');
    return true;
  }

  /** Speichern und kurz einblenden, dass es geklappt hat. */
  save() {
    if (saveGame(this)) {
      this.notice = 'Gespeichert';
      this.noticeTimer = SAVE.noticeTime;
      return true;
    }
    return false;
  }

  /** Zurueck ins Hauptmenue (aus der Pause). */
  toMainMenu() {
    this.openMainMenu();
  }

  togglePause() {
    if (this.state === 'playing') {
      this.state = 'paused';
      this.pauseMenu.open();
    } else if (this.state === 'paused') {
      this.resumeFromPause();
    }
  }

  resumeFromPause() {
    this.state = 'playing';
  }

  /** Level laden und betreten. Wird beim Programmstart benutzt (main.js). */
  async loadLevelByIndex(index) {
    const entry = LEVELS[index];
    if (!entry) throw new Error(`Level ${index} steht nicht in LEVELS (config.js).`);
    this.level = await loadLevel(entry.url);
    this.levelIndex = index;
    this.resetLevel();
  }

  /**
   * Levelwechsel vom Dashboard aus. Laeuft asynchron, deshalb der
   * Zwischenzustand "loading".
   * @returns {boolean} false, wenn das Level noch nicht gebaut ist
   */
  startLevel(index, difficulty = DIFFICULTY_ORDER[0]) {
    const entry = LEVELS[index];
    if (!entry || !entry.built) return false;

    // Die Stufe gilt fuer den ganzen Durchgang und muss vor resetLevel()
    // stehen — dort werden die Gegner damit gebaut.
    this.difficulty = difficulty;

    // Dasselbe Level noch einmal: die Karte liegt schon im Speicher.
    if (index === this.levelIndex && this.level) {
      this.resetLevel();
      this.syncScreen();
      return true;
    }

    this.state = 'loading';
    this.syncScreen();
    this.loadLevelByIndex(index).catch((err) => {
      console.error(err);
      this.openDashboard(`Level nicht ladbar: ${err.message}`);
    });
    return true;
  }

  // --- Dashboard (Erweiterung, Abschnitt 2) -------------------------------

  /**
   * Dashboard zeigen. Hier landet der Spieler nach jedem abgeschlossenen
   * Level, nach dem Aufgeben und beim Spielstart.
   * @param {string} [message] Einzeiler fuer die Route-Kachel
   */
  openDashboard(message = '') {
    this.state = 'dashboard';
    this.dashboard.open(message);
    // Sofort umschalten statt erst im naechsten Bild — sonst blitzt der
    // Canvas noch einmal auf.
    this.syncScreen();
  }

  /**
   * Level abgeschlossen (E am offenen Ausgang): abrechnen, speichern und
   * zurueck aufs Dashboard.
   *
   * Frueher ging es von hier direkt in den Shop — das Dashboard ersetzt
   * diesen Sprung (Abschnitt 2).
   */
  finishLevel() {
    // Hoechste dort geschaffte Stufe merken — sie schaltet die naechste frei
    // und bestimmt die Sterne am Levelknoten (Abschnitt 4).
    const i = this.levelIndex;
    this.bestDifficulty[i] = Math.max(this.bestDifficulty[i], difficultyIndex(this.difficulty));

    // --- Zaehler fuer die Quests (Schritt 7) ---
    const clean = this.deathsThisRun === 0;
    this.stats.levelsCleared += 1;
    this.stats.clearsByLevel[i] += 1;
    this.stats.clearsByDifficulty[difficultyIndex(this.difficulty)] += 1;
    if (clean) this.stats.cleanRuns += 1;
    // Quest 6 (Erweiterung 2, Abschnitt 8): ohne eine einzige Vergiftung.
    if (!this.poisonedThisRun) this.stats.poisonFreeRuns += 1;
    // Quest 13: jedes der zehn Level einmal auf Alptraum ohne einen Tod.
    // Einmal gesetzt bleibt es gesetzt — ein spaeterer Fehlversuch nimmt es
    // nicht zurueck ("Kein Zuruecksetzen", Abschnitt 3).
    if (clean && this.difficulty === 'nightmare') this.stats.nightmareNoDeath[i] = true;
    // Der Durchgang ist abgeschlossen: das Gold ist sicher und die
    // Wiederbelebung kostet im naechsten Level wieder den Grundpreis (Abschnitt 9).
    this.deathsThisLevel = 0;
    this.runGold = 0;
    // Naechstes Level freischalten und speichern (Abschnitt 9).
    this.unlockedLevel = Math.max(this.unlockedLevel,
      Math.min(this.levelIndex + 1, LEVELS.length - 1));
    // --- Abschluss des Spiels (Erweiterung 2, Schritt 12) ---
    // Das letzte Level der Route ist das Ende. Beim ersten Mal bekommt der
    // Spieler das auch gesagt: nach zehn Leveln ist ein "gespeichert." zu wenig.
    const letztes = i === LEVELS.length - 1;
    const ersterAbschluss = letztes && !this.stats.gameCompleted;
    if (letztes) this.stats.gameCompleted = true;

    this.save();
    if (ersterAbschluss) {
      this.openDashboard('Die Titanoboa ist gefallen — das Spiel ist durchgespielt! '
        + 'Jedes Level laesst sich weiter auf hoeheren Stufen wiederholen.');
    } else {
      this.openDashboard(
        `${LEVELS[i].name} auf ${difficultyName(this.difficulty)} geschafft — gespeichert.`);
    }
  }

  /** Level aufgeben (Pause-Menue): zurueck aufs Dashboard, ohne Abschluss. */
  giveUpLevel() {
    // Das im Durchgang gesammelte Gold ist weg — wie beim Neustart nach einem
    // Tod. Sonst waere Aufgeben ein kostenloser Weg, Beute zu sichern.
    this.gold = Math.max(0, this.gold - this.runGold);
    this.runGold = 0;
    this.openDashboard(`${LEVELS[this.levelIndex].name} aufgegeben.`);
  }

  /**
   * Zustand eines Levels fuer die Route (Erweiterung, Abschnitt 2).
   *
   * 'done'    schon geschafft — bleibt anklickbar und wiederholbar
   * 'current' jetzt dran: freigeschaltet, aber noch nie geschafft
   * 'next'    kommt als naechstes — sichtbar, aber noch nicht spielbar
   * 'locked'  weiter hinten, Vorgaenger noch nicht geschafft
   * @returns {'done'|'current'|'next'|'locked'}
   */
  levelState(i) {
    if (this.isCompleted(i)) return 'done';
    if (i <= this.unlockedLevel) return 'current';
    if (i === this.unlockedLevel + 1) return 'next';
    return 'locked';
  }

  /** Schon mindestens einmal geschafft — auf irgendeiner Stufe? */
  isCompleted(i) {
    return this.bestDifficulty[i] >= 0;
  }

  /** Darf dieses Level gestartet werden? */
  canPlayLevel(i) {
    return Boolean(LEVELS[i]?.built) && i <= this.unlockedLevel;
  }

  /** Multiplikatoren des laufenden Durchgangs. */
  get difficultyDef() {
    return difficultyDef(this.difficulty);
  }

  /**
   * Sichtbare Ansicht an den Spielzustand angleichen. Wird in jedem Bild
   * aufgerufen — dadurch kann die Anzeige nie vom Zustand abweichen, egal
   * wer den Zustand gesetzt hat.
   */
  syncScreen() {
    // Das Charakterfenster liegt ueber dem, woraus es geoeffnet wurde —
    // der Hintergrund bleibt also der des Rueckkehrziels.
    const overCharacter = this.state === 'character';
    const onDashboard = this.state === 'dashboard'
      || (overCharacter && this.characterReturnState === 'dashboard');

    const screen = onDashboard ? 'dashboard' : 'game';
    if (document.body.dataset.screen !== screen) document.body.dataset.screen = screen;

    // Das Charakterfenster geht vor: es kann auch ueber dem Levelfenster
    // liegen, wenn beide angefordert waeren.
    const modal = overCharacter
      ? 'character'
      : this.state === 'dashboard' ? this.dashboard.modal : '';
    if (document.body.dataset.modal !== modal) document.body.dataset.modal = modal;
  }

  // --- Quests (Erweiterung, Abschnitt 3) ---------------------------------

  /** Die drei gerade aktiven Quests mit ihrem Fortschritt. */
  /** Ist das Questmenue schon freigeschaltet? (Abschnitt 8) */
  get questsUnlocked() {
    return questsUnlocked(this);
  }

  get quests() {
    // Vor der Freischaltung gibt es keine aktiven Quests — die Kachel zeigt
    // stattdessen den Hinweis (Abschnitt 8).
    if (!this.questsUnlocked) return [];
    return activeQuests(this.claimedQuests).map((q) => questProgress(q, this));
  }

  /**
   * Belohnung einer Quest abholen. Nach dem Abholen rueckt automatisch die
   * naechste Quest aus der Liste nach.
   * @returns {null | { quest, parts: string[] }}
   */
  claimQuest(id) {
    const result = claimQuest(id, this);
    if (result) {
      playSound('skillPoint');
      this.save();
    }
    return result;
  }

  /** Insgesamt besiegte Monster. Liegt zentral in den Zaehlern (Schritt 7). */
  get kills() {
    return this.stats.killsTotal;
  }

  /** Ton an/aus — auch vom Dashboard aus bedienbar. */
  toggleMuted() {
    this.muted = toggleMuted();
    return this.muted;
  }

  /**
   * Held fuer Bildschirme ausserhalb eines Levels. Auf dem Dashboard gibt es
   * keinen `player` (es ist ja kein Level geladen), die Werte stehen aber alle
   * im Fortschritt — also ein Anzeige-Held daraus.
   */
  get hero() {
    if (this.player) return this.player;
    if (!this.previewHero || this.previewHero.progress !== this.progress) {
      this.previewHero = new Player(0, 0, this.progress);
    }
    // Ausserhalb eines Levels ist der Held immer heil — jedes Level beginnt
    // mit vollem Leben. Sonst stuende hier "115 / 135", sobald ein Punkt in
    // Vitalitaet das Maximum anhebt.
    this.previewHero.hp = this.previewHero.maxHp;
    this.previewHero.stamina = this.previewHero.maxStamina;
    return this.previewHero;
  }

  /**
   * Kauf im Shop. Gibt true zurueck, wenn er geklappt hat.
   * Aufgerufen von der Shop-Kachel des Dashboards (ui/shopTile.js).
   */
  buy(id) {
    const goldBefore = this.gold;
    // Was der Spieler VOR dem Kauf dabeihatte. Ohne das wuerde ein neu
    // gekaufter Speer die bisherige Wahl still ueberschreiben: gespeichert ist
    // oft nur ["sword"], und der Rest wird nach Anzeigereihenfolge aufgefuellt
    // — der Bogen fiele dann beim Speerkauf unbemerkt heraus (Abschnitt 4).
    const dabeiVorher = loadout(this.progress);
    const ok = id === 'respec' ? this.respecSkills() : buyOffer(id, this.progress, this);
    if (ok) {
      if (WEAPON_ORDER.includes(id)) this.takeNewWeapon(id, dabeiVorher);
      this.stats.goldSpent += goldBefore - this.gold;
      playSound('buy');
      // Nach jedem Kauf speichern (Abschnitt 9).
      saveGame(this);
    }
    return ok;
  }

  /**
   * Eine frisch gekaufte Waffe einsortieren (Erweiterung 2, Abschnitt 4).
   *
   * Ist ein Platz frei, kommt sie mit — sonst waere die erste Freude "du
   * darfst sie nicht benutzen". Sind beide Plaetze belegt, bleibt die
   * bisherige Wahl stehen: welche der drei nun zu Hause bleibt, entscheidet
   * der Spieler im Ausruestungsfenster, nicht der Zufall.
   *
   * @param {string} id            gekaufte Waffe
   * @param {string[]} dabeiVorher Wahl vor dem Kauf
   */
  takeNewWeapon(id, dabeiVorher) {
    if (dabeiVorher.includes(id)) return;   // nur eine Stufe aufgeruestet
    this.progress.loadout = dabeiVorher.length < LOADOUT.slots
      ? [...dabeiVorher, id]
      : dabeiVorher;
  }

  /**
   * Skill-Reset gegen Gold (Abschnitt 4): alle vergebenen Punkte zurueck in den
   * Pool. Ermutigt zum Ausprobieren, ohne dass eine Fehlentscheidung bleibt.
   */
  respecSkills() {
    if (this.gold < respecPrice || spentPoints(this.progress) === 0) return false;
    this.gold -= respecPrice;
    respec(this.progress);
    // Leben an das neue Maximum anpassen (Vitalitaet kann weggefallen sein).
    if (this.player) this.player.hp = Math.min(this.player.hp, this.player.maxHp);
    return true;
  }

  /**
   * Einen freien Skillpunkt vergeben. Bei Vitalitaet steigt das aktuelle Leben
   * mit — sonst fuehlt sich der Punkt mitten im Level wie nichts an.
   */
  spendSkillPoint(id) {
    const before = this.player ? this.player.maxHp : 0;
    if (!spendPoint(this.progress, id)) return false;
    if (this.player) {
      const gained = this.player.maxHp - before;
      if (gained > 0) this.player.hp = Math.min(this.player.maxHp, this.player.hp + gained);
    }
    return true;
  }

  /** Charakterfenster oeffnen/schliessen (TAB im Level). */
  toggleCharacterScreen() {
    if (this.state === 'character') {
      this.closeCharacterScreen();
    } else if (this.state === 'playing') {
      this.openCharacterScreen('playing');
    }
  }

  /**
   * Charakterfenster oeffnen.
   * @param {'playing'|'dashboard'} returnTo Wohin Esc/TAB zurueckfuehrt.
   *   Vom Dashboard aus gibt es kein laufendes Level, in das man
   *   zurueckspringen koennte.
   */
  openCharacterScreen(returnTo = 'playing') {
    this.characterReturnState = returnTo;
    this.state = 'character';
    this.characterWindow.open();
    this.syncScreen();
  }

  closeCharacterScreen() {
    if (this.characterReturnState === 'dashboard') this.openDashboard(this.dashboard.message);
    else this.state = 'playing';
    this.syncScreen();
  }

  /** Steht der Spieler nah genug am Ausgang? */
  playerAtExit() {
    const exit = this.level?.exit;
    if (!exit || !this.player) return false;
    return dist(this.player.x, this.player.y, exit.x, exit.y) <= LEVEL.exitRadius;
  }

  /** Baut Spieler, Gegner und Loot neu auf — Levelstart und Neustart nach Tod. */
  resetLevel() {
    const level = this.level;
    const start = level.playerStart;

    // Fortschritt (Ausruestung, Skillpunkte) ueberlebt Tod und Neustart.
    this.player = new Player(start.x, start.y, this.progress);
    const free = findFreeSpot(level, start.x, start.y, this.player.hw, this.player.hh);
    this.player.x = free.x;
    this.player.y = free.y;

    this.enemies = [];
    for (const spawn of level.spawns) {
      const enemy = createEnemy(spawn.type, spawn.x, spawn.y, this.difficulty);
      if (!enemy) continue;
      const spot = findFreeSpot(level, spawn.x, spawn.y, enemy.hw, enemy.hh);
      enemy.x = spot.x;
      enemy.y = spot.y;
      this.enemies.push(enemy);
    }

    this.coins = [];
    this.arrows = [];
    this.clouds = [];
    this.effects = [];
    // Neuer Versuch: auch die Vergiftungsfrage faengt von vorne an.
    this.poisonedThisRun = false;
    this.introTimer = 3.0;
    this.shakeAmount = 0;
    this.runGold = 0;
    // Neuer Versuch: alle Monster leben wieder, also faengt auch die Frage
    // "ohne einen Tod?" von vorne an.
    this.deathsThisRun = 0;
    this.stats.levelRuns += 1;
    this.levelCleared = false;
    this.state = 'playing';
    this.camera.snapTo(this.player.x, this.player.y, level);
  }

  /** Kosten der naechsten Wiederbelebung: 50, 75, 100, 125 … */
  get reviveCost() {
    return Math.round(DEATH.reviveBaseCost + DEATH.reviveCostIncrement * this.deathsThisLevel);
  }

  /**
   * Option 1: Wiederbeleben gegen Gold. Der Spieler steht an derselben Stelle
   * mit vollem Leben wieder auf; besiegte Monster bleiben besiegt.
   */
  revive() {
    const cost = this.reviveCost;
    if (this.gold < cost) return false;

    this.gold -= cost;
    this.stats.revives += 1;
    this.stats.goldSpent += cost;
    // Erst vom Gold dieses Durchgangs abziehen — sonst wuerde ein spaeterer
    // Neustart mehr wegnehmen, als in diesem Durchgang verdient wurde.
    this.runGold = Math.max(0, this.runGold - cost);
    this.deathsThisLevel += 1;

    const p = this.player;
    p.hp = p.maxHp;
    // Wer mit vollem Leben aufsteht, steht auch ausgeruht auf — sonst kann man
    // direkt nach der Wiederbelebung nicht ausweichen.
    p.stamina = p.maxStamina;
    p.staminaDelay = 0;
    p.dead = false;
    p.knockX = 0;
    p.knockY = 0;
    p.attackCooldown = 0;
    p.swingTimer = 0;
    // Gnadenfrist, damit umstehende Gegner einen nicht sofort wieder umhauen.
    p.invulnTimer = DEATH.reviveInvulnTime;

    // Gegner, die gerade ausholen, fangen von vorne an — sonst trifft ein
    // laengst begonnener Schlag den frisch Auferstandenen ohne Vorwarnung.
    for (const enemy of this.enemies) {
      if (!enemy.dead && (enemy.state === 'windup' || enemy.state === 'strike')) {
        enemy.struck = false;
        enemy.setState('recover');
      }
    }

    this.state = 'playing';
    return true;
  }

  /**
   * Option 2: Level kostenlos neu starten. Alle Monster leben wieder,
   * das in diesem Durchgang gesammelte Gold ist weg.
   */
  restartLevel() {
    this.gold = Math.max(0, this.gold - this.runGold);
    this.deathsThisLevel += 1;
    this.resetLevel();
  }

  /**
   * Alle Monster besiegt — der Ausgang oeffnet sich (Abschnitt 7).
   * Abgeschlossen ist das Level aber erst, wenn der Spieler dort E drueckt;
   * erst dann werden Gold und Todeszaehler gesichert (siehe enterShop).
   */
  onLevelCleared() {
    this.levelCleared = true;
    playSound('levelClear');
  }

  update(dt) {
    const input = this.input;

    // Laeuft in jedem Zustand: die Leiste soll auch auf dem Dashboard
    // fertig nachlaufen, wenn der letzte Kill sie noch gefuellt hat.
    this.updateXpBar(dt);

    if (input.wasPressed('F1')) this.debug = !this.debug;
    // Ton an/aus (Abschnitt 8).
    if (input.wasPressed('KeyM')) {
      this.muted = toggleMuted();
      this.notice = this.muted ? 'Ton aus' : 'Ton an';
      this.noticeTimer = 1.5;
    }

    // Hauptmenue laeuft ohne Level.
    if (this.state === 'menu') {
      this.mainMenu.update(dt, input);
      return;
    }

    // Dashboard ist HTML: es hat eigene Klick-Behandlung, hier laufen nur
    // die Werte in der Kopfzeile nach.
    if (this.state === 'dashboard') {
      this.dashboard.update(dt);
      return;
    }

    // Charakterfenster: TAB oeffnet es im Level. Geschlossen wird es vom
    // Fenster selbst (HTML), denn solange es offen ist, bekommt das Spiel
    // keine Tasten mehr (siehe input.js).
    if (input.wasPressed('Tab')) this.toggleCharacterScreen();
    if (this.state === 'character') {
      this.characterWindow.update(dt);
      // Das Dashboard liegt dahinter und ist sichtbar — Gold und Stufe muessen
      // dort mitlaufen, sonst zeigt die Kopfzeile veraltete Werte.
      if (this.characterReturnState === 'dashboard') this.dashboard.update(dt);
      return;
    }

    // Pause-Menue: Esc oeffnet und schliesst (Abschnitt 3).
    if (this.state === 'paused') {
      this.pauseMenu.update(dt, input);
      return;
    }
    if (this.state === 'playing' && input.wasPressed('Escape')) {
      this.togglePause();
      return;
    }

    // Todesbildschirm und Shop: die Welt steht still, nur das Menue laeuft.
    if (this.state === 'dead') {
      this.deathScreen.update(dt, input);
      return;
    }
    if (this.state === 'loading') return;

    // --- Level verlassen: E am offenen Ausgang (Abschnitt 7) ---
    if (this.levelCleared && this.playerAtExit() && input.wasPressed('KeyE')) {
      this.finishLevel();
      return;
    }

    this.player.update(dt, input, this.camera, this.level, this);

    for (const enemy of this.enemies) enemy.update(dt, this);
    // Tote Gegner erst nach ihrer kurzen Sterbe-Animation entfernen.
    this.enemies = this.enemies.filter((e) => !e.dead || e.deathTimer < 0.35);

    for (const arrow of this.arrows) arrow.update(dt, this);
    this.arrows = this.arrows.filter((a) => !a.spent);

    for (const cloud of this.clouds) cloud.update(dt, this);
    this.clouds = this.clouds.filter((c) => !c.spent);

    for (const coin of this.coins) coin.update(dt, this);
    this.coins = this.coins.filter((c) => !c.collected);

    this.updateEffects(dt);

    this.introTimer = Math.max(0, this.introTimer - dt);
    this.noticeTimer = Math.max(0, this.noticeTimer - dt);
    this.levelUpFlash = Math.max(0, this.levelUpFlash - dt);
    this.goldPop = Math.max(0, this.goldPop - dt);
    this.shakeTime = Math.max(0, this.shakeTime - dt);
    if (this.shakeTime <= 0) this.shakeAmount = 0;

    this.camera.update(this.player.x, this.player.y, dt, this.level);
  }

  updateEffects(dt) {
    for (const fx of this.effects) {
      fx.age += dt;
      if (fx.type === 'spark') {
        fx.x += fx.vx * dt;
        fx.y += fx.vy * dt;
        fx.vx *= Math.exp(-8 * dt);
        fx.vy *= Math.exp(-8 * dt);
      }
    }
    this.effects = this.effects.filter((fx) => fx.age < fx.life);
  }

  // --- XP und Stufen (Erweiterung, Abschnitt 1) ---------------------------

  /**
   * Stufe des HELDEN. Bewusst nicht `level` — das ist die geladene Karte.
   * Liegt im Fortschritt, damit sie mitgespeichert wird.
   */
  get heroLevel() {
    return this.progress.level;
  }

  /** XP innerhalb der aktuellen Stufe. */
  get xp() {
    return this.progress.xp;
  }

  /** Wie viel XP bis zur naechsten Stufe fehlt. */
  get xpNeeded() {
    return xpToNext(this.progress.level);
  }

  /** Fuellstand der XP-Leiste, 0…1 — der echte Wert, nicht der animierte. */
  get xpRatio() {
    return xpRatio(this.progress.level, this.progress.xp);
  }

  /**
   * XP gutschreiben und dabei so viele Stufen aufsteigen, wie hineinpassen.
   * Ein Boss kann mehrere Stufen auf einmal bringen — deshalb die Schleife.
   * @param {number} amount
   * @param {number} [x] Ort fuer die aufsteigende "+20 XP"-Zahl
   * @param {number} [y]
   */
  gainXp(amount, x, y) {
    if (amount <= 0 || isMaxLevel(this.progress.level)) return;

    this.progress.xp += amount;
    if (x != null && y != null) {
      this.spawnDamageNumber(x, y, `+${amount} XP`, COLORS.xpFillBright);
    }

    while (!isMaxLevel(this.progress.level) && this.progress.xp >= this.xpNeeded) {
      this.progress.xp -= this.xpNeeded;
      this.levelUp();
    }
    // Auf Maximalstufe verfaellt der Ueberschuss — sonst stuende in der
    // Leiste eine Zahl, die nie wieder kleiner wird.
    if (isMaxLevel(this.progress.level)) this.progress.xp = 0;
  }

  /**
   * Ein Stufenaufstieg: Skillpunkt, mehr maximales Leben, volle Heilung.
   * Die volle Heilung ist Absicht — dadurch ist ein Aufstieg mitten im Kampf
   * ein echter Moment und keine Randnotiz.
   */
  levelUp() {
    this.progress.level += 1;
    this.progress.skillPoints += XP.skillPointsPerLevel;

    if (this.player) {
      // maxHp haengt am Fortschritt und ist damit schon gestiegen.
      this.player.hp = XP.fullHealOnLevelUp
        ? this.player.maxHp
        : Math.min(this.player.maxHp, this.player.hp + XP.hpPerLevel);
      this.spawnDamageNumber(this.player.x, this.player.y - 46,
        `Stufe ${this.progress.level}!`, COLORS.xpFillBright, true);
    }

    this.notice = `Stufe ${this.progress.level} erreicht — +1 Skillpunkt, +${XP.hpPerLevel} Leben`;
    this.noticeTimer = XP.levelUpNoticeTime;
    this.levelUpFlash = XP.levelUpNoticeTime;
    playSound('skillPoint');
    this.shake(6, 0.25);
  }

  /**
   * Laesst die gezeichnete Leiste dem echten Wert nachlaufen. Bei einem
   * Aufstieg laeuft sie erst voll und faengt dann bei 0 wieder an — sonst
   * saehe man den Aufstieg als Rueckwaertssprung.
   */
  updateXpBar(dt) {
    const speed = XP.barFillSpeed * dt;
    if (this.xpBarLevel < this.progress.level) {
      this.xpBarRatio += speed;
      if (this.xpBarRatio >= 1) {
        this.xpBarLevel += 1;
        this.xpBarRatio = 0;
      }
      return;
    }
    const target = this.xpRatio;
    const diff = target - this.xpBarRatio;
    this.xpBarRatio += Math.sign(diff) * Math.min(Math.abs(diff), speed);
  }

  /** Leiste ohne Animation auf den echten Stand setzen (Laden, neues Spiel). */
  syncXpBar() {
    this.xpBarLevel = this.progress.level;
    this.xpBarRatio = this.xpRatio;
    this.levelUpFlash = 0;
  }

  // --- Ereignisse ---------------------------------------------------------

  onEnemyKilled(enemy) {
    recordKill(this.stats, enemy.type, enemy.lastHitBy);

    // Hoehere Schwierigkeit bringt deutlich mehr Beute — genau das macht das
    // Wiederholen zur Entscheidung statt zur Pflicht (Abschnitt 4).
    const mult = this.difficultyDef;

    // XP statt Kill-Zaehler: Skillpunkte kommen ab jetzt ausschliesslich aus
    // Stufenaufstiegen (Erweiterung, Abschnitt 1).
    if (enemy.def.xp) {
      this.gainXp(Math.round(enemy.def.xp * mult.xp), enemy.x, enemy.y - 34);
    }

    const amount = Math.round(randInt(enemy.def.gold.min, enemy.def.gold.max) * mult.gold);
    // Groessere Beute faellt in mehreren Muenzen — sieht wertvoller aus.
    const coinCount = clamp(Math.round(amount / 6), 1, 4);
    const perCoin = Math.floor(amount / coinCount);
    const rest = amount - perCoin * coinCount;
    for (let i = 0; i < coinCount; i++) {
      this.coins.push(new Coin(enemy.x, enemy.y, perCoin + (i === 0 ? rest : 0)));
    }
    this.shake(3, 0.12);

    if (!this.levelCleared && !this.enemies.some((e) => !e.dead)) this.onLevelCleared();
  }

  collectGold(coin) {
    playSound('coin', { volume: 0.7 });
    this.gold += coin.value;
    this.runGold += coin.value;
    // Insgesamt verdientes Gold — waechst nur, Kaeufe ziehen hier nichts ab.
    this.stats.goldEarned += coin.value;
    this.goldPop = 0.25;
    this.spawnDamageNumber(coin.x, coin.y - 6, `+${coin.value}`, COLORS.gold);
  }

  onPlayerDeath() {
    this.stats.deaths += 1;
    this.stats.deathsByLevel[this.levelIndex] += 1;
    // Jeder Tod zaehlt — auch wenn der Spieler sich gleich wiederbeleben
    // laesst. Damit ist dieser Versuch fuer Quest 11 verbraucht (Abschnitt 3).
    this.deathsThisRun += 1;
    this.shake(9, 0.4);
    this.state = 'dead';
    this.deathScreen.open();
  }

  spawnDamageNumber(x, y, value, color, big = false) {
    this.effects.push({
      type: 'number', x, y, value: String(value), color, big,
      age: 0, life: UI.damageNumbers.duration,
    });
  }

  /**
   * Pfeil abfeuern. `friendly: false` waere ein Gegnerpfeil (Schritt 12).
   */
  spawnArrow(x, y, angle, damage, opt = {}) {
    this.arrows.push(new Arrow(x, y, angle, damage, opt));
  }

  /**
   * Geworfener Speer (Erweiterung 2, Abschnitt 3). Liegt in derselben Liste
   * wie die Pfeile: beide sind Flugkoerper mit update/draw/spent, und eine
   * zweite Liste haette nur eine zweite Stelle zum Vergessen geschaffen.
   */
  spawnThrownSpear(x, y, angle, damage) {
    this.arrows.push(new ThrownSpear(x, y, angle, damage));
  }

  /**
   * Wurfstein des Gorillas (Erweiterung 2, Abschnitt 1). Liegt in derselben
   * Liste wie Pfeile und geworfene Speere — alle drei sind Flugkoerper mit
   * update/draw/spent.
   */
  spawnStone(x, y, angle, damage, opt = {}) {
    this.arrows.push(new Stone(x, y, angle, damage, opt));
  }

  /**
   * Giftspucke der Titanoboa (VERBESSERUNGEN_1 Abschnitt 6). Liegt in
   * derselben Liste wie Pfeile, Speere und Steine.
   */
  spawnPoisonSpit(x, y, angle, damage, opt = {}) {
    this.arrows.push(new PoisonSpit(x, y, angle, damage, opt));
  }

  /** Giftwolke des Giftpilzes (Erweiterung 2, Abschnitt 1). */
  spawnPoisonCloud(x, y, radius) {
    this.clouds.push(new PoisonCloud(x, y, radius));
  }

  /** Nachbild waehrend der Ausweichrolle. */
  spawnRollTrail(x, y) {
    this.effects.push({ type: 'trail', x, y, age: 0, life: ROLL.trailLife });
  }

  spawnHitSpark(x, y, angle) {
    for (let i = 0; i < 5; i++) {
      const a = angle + (Math.random() - 0.5) * 1.6;
      const speed = 60 + Math.random() * 120;
      this.effects.push({
        type: 'spark', x, y,
        vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
        age: 0, life: 0.25,
      });
    }
  }

  shake(amount, time) {
    this.shakeAmount = Math.max(this.shakeAmount, amount);
    this.shakeTime = Math.max(this.shakeTime, time);
  }

  // --- Zeichnen -----------------------------------------------------------

  draw() {
    // Zuerst die sichtbare Ansicht angleichen — Canvas oder Dashboard.
    this.syncScreen();

    const ctx = this.ctx;
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);

    // Das Dashboard ist HTML und liegt vor dem Canvas — nichts zu zeichnen.
    if (this.state === 'dashboard') return;

    if (this.state === 'menu') {
      this.mainMenu.draw(ctx);
      return;
    }
    if (this.state === 'loading') {
      drawText(ctx, 'Lade Level …', VIEW.width / 2, VIEW.height / 2,
        COLORS.textDim, UI.hud.font, 'center', 'middle');
      return;
    }
    // Vom Dashboard aus geoeffnet liegt das Charakterfenster ueber dem
    // Dashboard — dann gibt es auf dem Canvas nichts zu zeichnen.
    if (this.state === 'character' && this.characterReturnState === 'dashboard') return;
    // Ohne geladenes Level gibt es nichts weiter zu zeichnen.
    if (!this.level || !this.player) return;
    // Das Charakterfenster liegt ueber der eingefrorenen Welt — siehe unten.

    // Bildschirmzittern bei Treffern.
    let sx = 0;
    let sy = 0;
    if (this.shakeTime > 0) {
      sx = (Math.random() - 0.5) * 2 * this.shakeAmount;
      sy = (Math.random() - 0.5) * 2 * this.shakeAmount;
    }
    ctx.save();
    ctx.translate(Math.round(sx), Math.round(sy));

    this.camera.apply(ctx);
    this.level.draw(ctx, this.camera);
    this.drawExit(ctx);
    for (const coin of this.coins) coin.draw(ctx);
    this.drawRollTrails(ctx);   // vor den Figuren, damit die Spur dahinter liegt
    // Giftwolken liegen am Boden und werden von Figuren ueberdeckt — sonst
    // verliert man den eigenen Helden im gruenen Nebel.
    for (const cloud of this.clouds) cloud.draw(ctx);

    // Alles, was auf dem Boden steht, nach y sortieren: was weiter unten ist,
    // wird spaeter gezeichnet und verdeckt korrekt.
    const actors = [...this.enemies, this.player].sort((a, b) => a.y - b.y);
    for (const actor of actors) actor.draw(ctx);

    // Pfeile fliegen ueber allem, damit man sie nicht hinter Gegnern verliert.
    for (const arrow of this.arrows) arrow.draw(ctx);

    this.drawEffects(ctx);

    if (this.debug) {
      this.player.drawDebug(ctx);
      for (const enemy of this.enemies) if (!enemy.dead) enemy.drawDebug(ctx);
      this.drawDebugPickupRadius(ctx);
    }

    this.camera.restore(ctx);
    ctx.restore();

    drawHud(ctx, this);
    if (this.state === 'playing') {
      drawLevelIntro(ctx, this.level, Math.min(1, this.introTimer / 0.8),
        difficultyName(this.difficulty));
    } else if (this.state === 'dead') {
      this.deathScreen.draw(ctx);
    } else if (this.state === 'paused') {
      this.pauseMenu.draw(ctx);
    }
  }

  /**
   * Level-Ausgang: geschlossen, solange noch Monster leben; danach leuchtet er.
   * Der Spieler sieht damit ohne Text, wann und wo es weitergeht.
   */
  drawExit(ctx) {
    const exit = this.level.exit;
    if (!exit) return;
    const size = LEVEL.exitSize;
    const open = this.levelCleared;

    if (open) {
      // Pulsierender Schein, damit der offene Ausgang auffaellt.
      const pulse = 0.75 + 0.25 * Math.sin(performance.now() / 260);
      ctx.save();
      ctx.fillStyle = COLORS.exitGlow;
      ctx.beginPath();
      ctx.arc(exit.x, exit.y, LEVEL.exitRadius * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    fillRect(ctx, exit.x - size / 2, exit.y - size / 2, size, size,
      open ? COLORS.exitOpen : COLORS.exitClosed);
    strokeRect(ctx, exit.x - size / 2, exit.y - size / 2, size, size, COLORS.hpBorder, 1);

    // Geschlossen: Gitterstaebe. Offen: freier Durchgang.
    if (!open) {
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 2;
      for (let i = 1; i < 4; i++) {
        const bx = Math.round(exit.x - size / 2 + (size / 4) * i);
        ctx.beginPath();
        ctx.moveTo(bx + 0.5, exit.y - size / 2 + 3);
        ctx.lineTo(bx + 0.5, exit.y + size / 2 - 3);
        ctx.stroke();
      }
    } else {
      fillRect(ctx, exit.x - size / 2 + 5, exit.y - size / 2 + 5, size - 10, size - 10,
        COLORS.background);
    }
  }

  drawRollTrails(ctx) {
    const s = PLAYER.sprite;
    for (const fx of this.effects) {
      if (fx.type !== 'trail') continue;
      const t = fx.age / fx.life;
      ctx.save();
      ctx.globalAlpha = 0.35 * (1 - t);
      ctx.fillStyle = COLORS.rollTrail;
      ctx.fillRect(
        Math.round(fx.x - s.w / 2),
        Math.round(fx.y + s.offsetY - s.h / 2),
        s.w, s.h,
      );
      ctx.restore();
    }
  }

  drawEffects(ctx) {
    for (const fx of this.effects) {
      if (fx.type === 'trail') continue;   // liegt schon hinter den Figuren
      const t = fx.age / fx.life;
      if (fx.type === 'number') {
        ctx.save();
        ctx.globalAlpha = 1 - t * t;
        drawText(ctx, fx.value, fx.x, fx.y - t * UI.damageNumbers.rise, fx.color,
          fx.big ? '15px "Segoe UI", system-ui, sans-serif' : UI.hud.fontSmall, 'center', 'middle');
        ctx.restore();
      } else {
        ctx.save();
        ctx.globalAlpha = 1 - t;
        ctx.fillStyle = COLORS.enemyHit;
        ctx.fillRect(Math.round(fx.x), Math.round(fx.y), 2, 2);
        ctx.restore();
      }
    }
  }

  drawDebugPickupRadius(ctx) {
    ctx.strokeStyle = 'rgba(217,176,74,0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(this.player.x, this.player.y, LOOT.pickupRadius, 0, Math.PI * 2);
    ctx.stroke();
  }
}
