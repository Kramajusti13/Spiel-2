/**
 * game.js — haelt den Spielzustand zusammen und treibt update/draw an.
 *
 * Zustaende: menu, playing, paused, dead (Todesbildschirm), shop, character
 * und loading. Jeder Zustand hat in update() und draw() einen eigenen Ast.
 */

import { VIEW, COLORS, DEATH, DEBUG, LEVEL, LEVELS, LOOT, PLAYER, ROLL, SAVE, SKILLS, UI } from './config.js';
import { Camera } from './camera.js';
import { loadLevel } from './level.js';
import { Player, createProgress, findFreeSpot } from './entities/player.js';
import { createEnemy } from './entities/enemies.js';
import { Coin } from './entities/coin.js';
import { Arrow } from './entities/arrow.js';
import { drawHud, drawLevelIntro } from './hud.js';
import { DeathScreen } from './ui/deathScreen.js';
import { ShopScreen } from './ui/shopScreen.js';
import { CharacterScreen } from './ui/characterScreen.js';
import { MainMenu } from './ui/mainMenu.js';
import { PauseMenu } from './ui/pauseMenu.js';
import { buy as buyOffer } from './shop.js';
import { respec, respecPrice, spendPoint, spentPoints } from './skills.js';
import { clearSave, loadGame, saveGame } from './save.js';
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
    this.effects = [];   // Schadenszahlen, Funken

    /** 'menu' | 'playing' | 'paused' | 'dead' | 'shop' | 'character' | 'loading' */
    this.state = 'menu';
    this.deathScreen = new DeathScreen(this);
    this.shopScreen = new ShopScreen(this);
    this.characterScreen = new CharacterScreen(this);
    this.mainMenu = new MainMenu(this);
    this.pauseMenu = new PauseMenu(this);
    /** Index in LEVELS. */
    this.levelIndex = 0;
    /** Hoechstes freigeschaltetes Level — wandert in den Spielstand. */
    this.unlockedLevel = 0;

    /** Gold und Statistik. Wandern in Schritt 14 in den Spielstand. */
    this.gold = 0;
    this.kills = 0;
    this.goldPop = 0;
    /**
     * Gold, das im laufenden Durchgang eingesammelt wurde. Nur dieser Teil geht
     * beim kostenlosen Level-Neustart verloren (Abschnitt 9).
     */
    this.runGold = 0;
    /** Todeszaehler des aktuellen Levels — bestimmt den Wiederbelebungspreis. */
    this.deathsThisLevel = 0;
    this.levelCleared = false;

    /** Ausruestung und Skillpunkte — ueberleben Tod, Neustart und spaeter den Shop. */
    this.progress = createProgress();

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

  /** Neues Spiel: Spielstand loeschen und im ersten Level anfangen. */
  newGame() {
    clearSave();
    this.gold = 0;
    this.kills = 0;
    this.runGold = 0;
    this.deathsThisLevel = 0;
    this.unlockedLevel = 0;
    this.progress = createProgress();
    this.startLevel(0);
  }

  /** Gespeicherten Stand laden und im Shop weitermachen. */
  continueGame() {
    const s = loadGame();
    if (!s) {
      this.newGame();
      return false;
    }
    this.gold = s.gold;
    this.kills = s.kills;
    this.unlockedLevel = s.unlockedLevel;
    this.progress = s.progress;
    this.runGold = 0;
    this.deathsThisLevel = 0;

    // Level laden und direkt in den Shop — von dort geht es weiter,
    // genau wie nach einem abgeschlossenen Level (Abschnitt 5).
    this.state = 'loading';
    this.loadLevelByIndex(s.levelIndex)
      .then(() => this.enterShop(false))
      .catch((err) => {
        console.error(err);
        this.openMainMenu();
      });
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
   * Levelwechsel aus dem Shop heraus. Laeuft asynchron, deshalb der
   * Zwischenzustand "loading".
   * @returns {boolean} false, wenn das Level noch nicht gebaut ist
   */
  startLevel(index) {
    const entry = LEVELS[index];
    if (!entry || !entry.built) return false;

    // Dasselbe Level noch einmal: die Karte liegt schon im Speicher.
    if (index === this.levelIndex && this.level) {
      this.resetLevel();
      return true;
    }

    this.state = 'loading';
    this.loadLevelByIndex(index).catch((err) => {
      console.error(err);
      this.state = 'shop';
      this.shopScreen.lastMessage = `Level nicht ladbar: ${err.message}`;
    });
    return true;
  }

  /**
   * Level verlassen (E am offenen Ausgang) und in den Shop wechseln.
   * @param {boolean} [completed=true] false = nur den Shop oeffnen (z. B. beim
   *   Weiterspielen aus dem Hauptmenue), ohne das Level als geschafft zu werten
   */
  enterShop(completed = true) {
    if (completed) {
      // Der Durchgang ist abgeschlossen: das Gold ist sicher und die
      // Wiederbelebung kostet im naechsten Level wieder den Grundpreis (Abschnitt 9).
      this.deathsThisLevel = 0;
      this.runGold = 0;
      // Naechstes Level freischalten und speichern (Abschnitt 9).
      this.unlockedLevel = Math.max(this.unlockedLevel,
        Math.min(this.levelIndex + 1, LEVELS.length - 1));
      this.save();
    }
    this.state = 'shop';
    this.shopScreen.open();
    // Im Shop sieht man das HUD nicht — die Speicherbestaetigung also hier zeigen.
    if (completed) {
      this.shopScreen.lastMessage = `${LEVELS[this.levelIndex].name} geschafft — gespeichert.`;
    }
  }

  /** Kauf im Shop. Gibt true zurueck, wenn er geklappt hat. */
  buy(id) {
    const ok = id === 'respec' ? this.respecSkills() : buyOffer(id, this.progress, this);
    if (ok) {
      playSound('buy');
      // Nach jedem Kauf speichern (Abschnitt 9).
      saveGame(this);
    }
    return ok;
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

  /** Charakterfenster oeffnen/schliessen (TAB). */
  toggleCharacterScreen() {
    if (this.state === 'character') {
      this.state = 'playing';
    } else if (this.state === 'playing') {
      this.state = 'character';
      this.characterScreen.open();
    }
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
      const enemy = createEnemy(spawn.type, spawn.x, spawn.y);
      if (!enemy) continue;
      const spot = findFreeSpot(level, spawn.x, spawn.y, enemy.hw, enemy.hh);
      enemy.x = spot.x;
      enemy.y = spot.y;
      this.enemies.push(enemy);
    }

    this.coins = [];
    this.arrows = [];
    this.effects = [];
    this.introTimer = 3.0;
    this.shakeAmount = 0;
    this.runGold = 0;
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

    // Charakterfenster: TAB oeffnet und schliesst, Esc schliesst.
    if (input.wasPressed('Tab')) this.toggleCharacterScreen();
    if (this.state === 'character') {
      if (input.wasPressed('Escape')) this.state = 'playing';
      else this.characterScreen.update(dt, input);
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
    if (this.state === 'shop') {
      this.shopScreen.update(dt, input);
      return;
    }
    if (this.state === 'loading') return;

    // --- Level verlassen: E am offenen Ausgang (Abschnitt 7) ---
    if (this.levelCleared && this.playerAtExit() && input.wasPressed('KeyE')) {
      this.enterShop();
      return;
    }

    this.player.update(dt, input, this.camera, this.level, this);

    for (const enemy of this.enemies) enemy.update(dt, this);
    // Tote Gegner erst nach ihrer kurzen Sterbe-Animation entfernen.
    this.enemies = this.enemies.filter((e) => !e.dead || e.deathTimer < 0.35);

    for (const arrow of this.arrows) arrow.update(dt, this);
    this.arrows = this.arrows.filter((a) => !a.spent);

    for (const coin of this.coins) coin.update(dt, this);
    this.coins = this.coins.filter((c) => !c.collected);

    this.updateEffects(dt);

    this.introTimer = Math.max(0, this.introTimer - dt);
    this.noticeTimer = Math.max(0, this.noticeTimer - dt);
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

  // --- Ereignisse ---------------------------------------------------------

  onEnemyKilled(enemy) {
    this.kills += 1;

    // 1 Skillpunkt pro 15 getoetete Monster (Abschnitt 4). Zaehlt spielueber-
    // greifend weiter und wird bei einem Tod nicht zurueckgesetzt.
    if (this.kills % SKILLS.killsPerPoint === 0) {
      this.progress.skillPoints += 1;
      playSound('skillPoint');
      this.spawnDamageNumber(this.player.x, this.player.y - 42, 'Skillpunkt!', COLORS.menuAccent, true);
    }

    // Der Boss gibt zusaetzlich einen Skillpunkt (Abschnitt 4).
    if (enemy.def.skillPoints) {
      this.progress.skillPoints += enemy.def.skillPoints;
      this.spawnDamageNumber(enemy.x, enemy.y - 50,
        `+${enemy.def.skillPoints} Skillpunkt`, COLORS.bossAccent, true);
      this.shake(10, 0.5);
    }
    const amount = randInt(enemy.def.gold.min, enemy.def.gold.max);
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
    this.goldPop = 0.25;
    this.spawnDamageNumber(coin.x, coin.y - 6, `+${coin.value}`, COLORS.gold);
  }

  onPlayerDeath() {
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
    const ctx = this.ctx;
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);

    if (this.state === 'menu') {
      this.mainMenu.draw(ctx);
      return;
    }
    if (this.state === 'loading') {
      drawText(ctx, 'Lade Level …', VIEW.width / 2, VIEW.height / 2,
        COLORS.textDim, UI.hud.font, 'center', 'middle');
      return;
    }
    if (this.state === 'shop') {
      this.shopScreen.draw(ctx);
      return;
    }
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
      drawLevelIntro(ctx, this.level, Math.min(1, this.introTimer / 0.8));
    } else if (this.state === 'dead') {
      this.deathScreen.draw(ctx);
    } else if (this.state === 'character') {
      this.characterScreen.draw(ctx);
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
