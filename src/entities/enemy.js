/**
 * enemy.js — gemeinsame Grundlage aller Gegner.
 *
 * Enthaelt Leben, Schaden nehmen, Rueckstoss, HP-Balken und vor allem den
 * Angriffszyklus mit der sichtbaren Ausholphase (Fairness-Regel aus Abschnitt 6):
 *
 *   chase -> windup (>= 0,4 s, Gegner leuchtet auf) -> strike (Schaden) -> recover
 *
 * Neue Monstertypen (Schritt 12) erben von dieser Klasse und ueberschreiben
 * nur think() und ggf. drawBody().
 */

import { ENEMIES, COLORS, UI, AI, SPRITES } from '../config.js';
import { scaleEnemyDef, difficultyAim, difficultyBehavior } from '../difficulty.js';
import { drawSprite, drawBar, spriteSize } from '../gfx.js';
import { playSound } from '../audio.js';
import { angleDiff, clamp, degToRad, dist } from '../util.js';

/** Platzhalterfarbe je Gegnertyp — wird von Sprites ersetzt (Schritt 13). */
export const ENEMY_COLORS = {
  slime: COLORS.slime,
  goblin: COLORS.goblin,
  archer: COLORS.archer,
  armoredOrc: COLORS.orc,
  orcChieftain: COLORS.boss,
  gorilla: COLORS.gorilla,
  frog: COLORS.frog,
  giftpilz: COLORS.giftpilz,
  krokodil: COLORS.krokodil,
  titanoboa: COLORS.titanobo
  angel: COLORS.angel,
  seraphim: COLORS.seraphim,
  cherubim: COLORS.cherubim,
  archangel: COLORS.archangel,
  michael: COLORS.michael,a,
};

export class Enemy {
  constructor(type, x, y) {
    const def = ENEMIES[type];
    if (!def) throw new Error(`Unbekannter Gegnertyp "${type}" (siehe ENEMIES in config.js).`);

    this.type = type;
    this.def = def;
    this.name = def.name;
    this.sprite = type;

    this.x = x;
    this.y = y;
    this.hw = def.hitbox.w / 2;
    this.hh = def.hitbox.h / 2;

    this.maxHp = def.maxHp;
    this.hp = this.maxHp;
    this.dead = false;

    this.state = 'idle';
    this.stateTime = 0;
    this.facing = 0;       // Blickrichtung in Radiant
    this.animTime = 0;

    this.hitFlash = 0;
    this.knockX = 0;
    this.knockY = 0;
    this.deathTimer = 0;   // kurze Auflös-Animation nach dem Tod
    /** Waffe des letzten Treffers — fuer die Kill-Statistik (Schritt 7). */
    this.lastHitBy = null;

    /** Platzhalterfarbe, solange kein Sprite geladen ist. */
    this.baseColor = ENEMY_COLORS[type] ?? COLORS.slime;

    /** Schwierigkeitsstufe des Durchgangs (Erweiterung, Abschnitt 4). */
    this.difficulty = 'normal';

    /**
     * Persoenlicher Ringplatz um den Spieler (VERBESSERUNGEN_1 Abschnitt 5,
     * "Umzingeln"). Zufaellig, damit mehrere Gegner nicht alle denselben Platz
     * belegen; bleibt fuer dieses Leben stabil, sonst wechseln sie den Platz
     * jedes Bild.
     */
    this.slotAngle = Math.random() * Math.PI * 2;
    /** Restliche Wartezeit vor dem naechsten Angriff (staggerAttacks). */
    this.staggerHold = 0;
    /**
     * Restzeit, in der der Angriff noch zurueckgehalten wird, weil der Spieler
     * gerade ausweicht (punishDodge, Alptraum). Wird waehrend des Rollens jeden
     * Frame auf dodgePunishDelay zurueckgesetzt und laeuft danach ab.
     */
    this.dodgeHold = 0;
  }

  /**
   * Werte auf eine Schwierigkeitsstufe umrechnen. Wird direkt nach dem Bauen
   * aufgerufen (createEnemy), bevor der Gegner das erste Mal denkt.
   *
   * Der Gegner bekommt dabei seinen EIGENEN `def` — dadurch wirken die neuen
   * Werte ueberall, wo der Code schon `this.def.speed` oder `this.def.damage`
   * liest, ohne dass die Gegnerklassen etwas davon wissen muessen.
   */
  applyDifficulty(id) {
    this.difficulty = id;
    this.def = scaleEnemyDef(ENEMIES[this.type], id);
    this.maxHp = this.def.maxHp;
    this.hp = this.maxHp;
  }

  get alive() {
    return !this.dead;
  }

  /**
   * Ist der Gegner gerade unangreifbar? (Erweiterung 2, Abschnitt 1)
   *
   * Standard ist false; der Frosch ist es waehrend seines Sprungs, das
   * Krokodil waehrend es abgetaucht ist. Getroffen wird gar nicht erst —
   * Schwerthieb, Pfeil und Speer pruefen diesen Wert VOR dem Treffer und
   * gehen sonst durch. Ohne das wuerde ein Pfeil an einem abgetauchten
   * Krokodil verpuffen, statt weiterzufliegen, und ein Hieb gaelte als
   * verbraucht, obwohl er nichts getroffen hat.
   */
  get invulnerable() {
    return false;
  }

  setState(state) {
    this.state = state;
    this.stateTime = 0;
  }

  update(dt, game) {
    this.stateTime += dt;
    this.animTime += dt;
    this.hitFlash = Math.max(0, this.hitFlash - dt);

    if (this.dead) {
      this.deathTimer += dt;
      return;
    }

    this.applyKnockback(dt, game.level);
    this.think(dt, game);
  }

  applyKnockback(dt, level) {
    if (this.knockX === 0 && this.knockY === 0) return;
    level.moveEntity(this, this.knockX * dt, this.knockY * dt);
    const decay = Math.exp(-10 * dt);
    this.knockX *= decay;
    this.knockY *= decay;
    if (Math.abs(this.knockX) < 2) this.knockX = 0;
    if (Math.abs(this.knockY) < 2) this.knockY = 0;
  }

  /** Von Unterklassen zu implementieren. */
  think(_dt, _game) {}

  /**
   * Standard-Nahkampfzyklus. Liefert true, wenn der Gegner gerade angreift
   * (dann soll er sich nicht bewegen).
   */
  meleeCycle(dt, game) {
    const player = game.player;
    const d = dist(this.x, this.y, player.x, player.y);

    switch (this.state) {
      case 'windup':
        // Zielt waehrend des Ausholens noch leicht nach — aber langsam,
        // damit Ausweichen sich lohnt.
        this.facing = this._turnTowards(player, dt, 2.5 * difficultyAim(this.difficulty));
        if (this.stateTime >= this.def.windupTime) this.setState('strike');
        return true;

      case 'strike':
        if (!this.struck) {
          this.struck = true;
          this._resolveStrike(game);
        }
        if (this.stateTime >= this.def.strikeTime) {
          this.struck = false;
          this.setState('recover');
        }
        return true;

      case 'recover':
        if (this.stateTime >= this.def.recoverTime) this.setState('chase');
        return true;

      default:
        // In Reichweite? Dann ausholen.
        if (d <= this.def.attackRange + player.hw) {
          const beh = difficultyBehavior(this.difficulty);

          // Ausweichrolle abwarten (VERBESSERUNGEN_1 Abschnitt 5, Alptraum):
          // Solange der Spieler rollt, wird der Timer aufgefrischt; danach
          // laeuft er ab. So faellt der Hieb genau in den Moment, in dem der
          // Spieler aus der Rolle kommt und noch nicht wieder blockt.
          if (beh.punishDodge && player.isRolling) {
            this.dodgeHold = AI.hardBehavior.dodgePunishDelay;
            return true;
          }
          if (this.dodgeHold > 0) {
            this.dodgeHold -= dt;
            return true;
          }

          // Versetztes Angreifen (VERBESSERUNGEN_1 Abschnitt 5): auf Schwer
          // duerfen hoechstens N Gegner gleichzeitig in der Ausholphase sein;
          // die Ueberzaehligen warten kurz, damit nicht alle als Salve losgehen.
          if (beh.staggerAttacks && this._tooManyAttacking(game)) {
            if (this.staggerHold <= 0) {
              const min = AI.hardBehavior.staggerDelayMin;
              const max = AI.hardBehavior.staggerDelayMax;
              this.staggerHold = min + Math.random() * (max - min);
            }
            this.staggerHold -= dt;
            return true; // stehen bleiben, noch nicht ausholen
          }
          this.staggerHold = 0;
          this.setState('windup');
          this.struck = false;
          return true;
        }
        return false;
    }
  }

  /**
   * Zaehlt, wie viele andere Gegner gerade in der Ausholphase stecken. Fuer
   * das versetzte Angreifen: erst wenn weniger als maxConcurrentWindups
   * ausholen, darf der naechste loslegen.
   */
  _tooManyAttacking(game) {
    const max = AI.hardBehavior.maxConcurrentWindups;
    let count = 0;
    for (const e of game.enemies) {
      if (e === this || e.dead) continue;
      if (e.state === 'windup') {
        count++;
        if (count >= max) return true;
      }
    }
    return false;
  }

  /**
   * Anlaufziel fuer die Bewegung (VERBESSERUNGEN_1 Abschnitt 5 "Umzingeln").
   *
   * Auf Normal: einfach der Spieler — direkt drauf zu.
   * Auf Schwer/Alptraum: erst ein persoenlicher Platz auf einem Ring um den
   * Spieler. Erst wenn der Gegner den Ring erreicht hat, wird der Spieler
   * selbst zum Ziel und der Angriff folgt.
   *
   * Blockt der Spieler, wird der Ringplatz zusaetzlich AUSSERHALB des
   * Block-Kegels gewaehlt — sonst laeuft der Gegner stumpf in den Block.
   *
   * Fernkampf-Gegner (mit keepDistance) laufen weiter direkt zum Spieler; sie
   * halten selbst ihren Abstand und wuerden von einem Ring nur verwirrt.
   */
  _approachGoal(target) {
    const beh = difficultyBehavior(this.difficulty);
    if (!beh.surround) return target;
    if (this.def.keepDistance != null) return target;
    const attackRange = this.def.attackRange;
    if (attackRange == null) return target;

    const d = dist(this.x, this.y, target.x, target.y);
    const ring = attackRange + AI.hardBehavior.ringPadding;
    // Am Ring angekommen -> direkt in Reichweite laufen und zuschlagen.
    if (d <= ring + AI.hardBehavior.ringSnap) return target;

    let slot = this.slotAngle;
    if (target.blocking && typeof target.aim === 'number') {
      const sidestep = degToRad(AI.hardBehavior.shieldSidestepDeg);
      // Seite anhand des Zufalls-Slots waehlen (mal links, mal rechts vom Block).
      const side = Math.sin(this.slotAngle - target.aim) >= 0 ? 1 : -1;
      slot = target.aim + side * sidestep;
    }
    return {
      x: target.x + Math.cos(slot) * ring,
      y: target.y + Math.sin(slot) * ring,
    };
  }

  /**
   * Liefert die Laufrichtung zum Ziel, ohne gegen Waende zu druecken.
   *
   * Ist die Luftlinie frei, wird direkt gelaufen. Sonst laeuft der Gegner um das
   * Hindernis herum und bleibt dabei bei EINER Seite, bis die Luftlinie wieder
   * frei ist — sonst zappelt er vor jeder Mauerkante hin und her.
   * Das ist bewusst kein Pathfinding: es genuegt fuer offene Level und kostet fast nichts.
   */
  steer(target, level, _dt) {
    // Umzingeln (VERBESSERUNGEN_1 Abschnitt 5): auf Schwer/Alptraum wird nicht
    // direkt der Spieler angelaufen, sondern ein Ringplatz um ihn.
    const goal = this._approachGoal(target);
    const angle = Math.atan2(goal.y - this.y, goal.x - this.x);

    if (level.isPathClear(this.x, this.y, goal.x, goal.y, this.hw, this.hh)) {
      this.turnPref = 0;
      return angle;
    }

    const free = (a, distance = AI.probeDistance) =>
      !level.isBoxBlocked(
        this.x + Math.cos(a) * distance,
        this.y + Math.sin(a) * distance,
        this.hw,
        this.hh,
      );

    // Seite einmal waehlen: die, auf der weiter vorausgetastet noch Platz ist.
    if (!this.turnPref) {
      const look = AI.probeDistance * 3;
      const rightFree = free(angle + Math.PI / 2, look);
      const leftFree = free(angle - Math.PI / 2, look);
      if (rightFree !== leftFree) this.turnPref = rightFree ? 1 : -1;
      else this.turnPref = Math.random() < 0.5 ? 1 : -1;
    }

    for (const side of [this.turnPref, -this.turnPref]) {
      for (const deg of AI.avoidAngles) {
        const candidate = angle + degToRad(deg) * side;
        if (free(candidate)) {
          this.turnPref = side;
          return candidate;
        }
      }
    }
    return angle; // voellig eingekeilt — dann eben dagegen
  }

  _turnTowards(target, dt, rate) {
    const want = Math.atan2(target.y - this.y, target.x - this.x);
    let diff = want - this.facing;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    return this.facing + diff * Math.min(1, rate * dt);
  }

  /**
   * Schaden austeilen. Ohne `strikeArc` ein Punkttreffer kurz vor dem Gegner,
   * mit `strikeArc` ein Kegel um die Blickrichtung ("weiter Schwung").
   */
  _resolveStrike(game, opt = {}) {
    const player = game.player;
    if (player.dead) return false;

    const radius = opt.radius ?? this.def.strikeRadius;
    const damage = opt.damage ?? this.def.damage;
    const arc = opt.arc ?? this.def.strikeArc;
    const angleToPlayer = Math.atan2(player.y - this.y, player.x - this.x);

    if (arc) {
      // Kegel: Abstand von der Mitte, Winkel zur Blickrichtung.
      if (dist(this.x, this.y, player.x, player.y) > radius + player.hw) return false;
      if (Math.abs(angleDiff(this.facing, angleToPlayer)) > degToRad(arc) / 2) return false;
    } else {
      const cx = this.x + Math.cos(this.facing) * this.hw;
      const cy = this.y + Math.sin(this.facing) * this.hh;
      if (dist(cx, cy, player.x, player.y) > radius) return false;
    }

    player.takeDamage(damage, angleToPlayer, game);
    return true;
  }

  /**
   * @param {number} amount
   * @param {number} fromAngle
   * @param {number} knockback
   * @param {object} game
   * @param {boolean} [crit]
   * @param {string|null} [weapon] Waffe des Treffers — fuer die Statistik
   *   "Kills nach benutzter Waffe" (Erweiterung, Schritt 7)
   */
  takeDamage(amount, fromAngle, knockback, game, crit = false, weapon = null) {
    if (this.dead || this.invulnerable) return;
    // Merken, womit zuletzt getroffen wurde. Wer den Gegner faellt, bekommt
    // den Kill in der Statistik gutgeschrieben.
    if (weapon) this.lastHitBy = weapon;
    const damage = Math.max(1, Math.round(amount - (this.def.defense ?? 0)));
    this.hp = clamp(this.hp - damage, 0, this.maxHp);
    this.hitFlash = 0.12;

    const resist = 1 - (this.def.knockbackResist ?? 0);
    this.knockX += Math.cos(fromAngle) * knockback * resist;
    this.knockY += Math.sin(fromAngle) * knockback * resist;

    playSound(crit ? 'hitCrit' : 'hit');
    game.spawnDamageNumber(this.x, this.y - this.hh - 6, damage, crit ? COLORS.gold : COLORS.text, crit);
    game.spawnHitSpark(this.x, this.y, fromAngle);

    // Ein Treffer bricht die Ausholphase nicht ab — sonst kann man Gegner
    // endlos "stunlocken". Er verliert nur seinen Vorwaertsdrang.
    if (this.hp <= 0) this.die(game);
  }

  die(game) {
    playSound('enemyDeath');
    this.dead = true;
    this.state = 'dead';
    this.deathTimer = 0;
    game.onEnemyKilled(this);
  }

  /** Wie weit die Ausholphase fortgeschritten ist: 0 -> 1. */
  get windupProgress() {
    return this.state === 'windup' ? clamp(this.stateTime / this.def.windupTime, 0, 1) : 0;
  }

  draw(ctx) {
    if (this.dead) {
      this.drawDeath(ctx);
      return;
    }

    // Schatten
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    ctx.ellipse(Math.round(this.x), Math.round(this.y + this.hh), this.hw * 0.8, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    if (this.state === 'windup') this.drawTelegraph(ctx);
    this.drawBody(ctx);
    this.drawHpBar(ctx);
  }

  /**
   * Sichtbare Warnung waehrend der Ausholphase (Fairness-Regel, Abschnitt 6).
   * Ohne Kegel ein Ring, mit Kegel ein Tortenstueck in Schlagrichtung — der
   * Spieler sieht damit auch, wohin der Schlag geht, nicht nur dass einer kommt.
   */
  drawTelegraph(ctx, opt = {}) {
    const p = opt.progress ?? this.windupProgress;
    const radius = (opt.radius ?? this.def.strikeRadius) * (0.35 + 0.65 * p);
    const arc = opt.arc ?? this.def.strikeArc;

    ctx.save();
    ctx.globalAlpha = 0.18 + 0.35 * p;
    ctx.strokeStyle = opt.color ?? COLORS.enemyWindup;
    ctx.fillStyle = opt.color ?? COLORS.enemyWindup;
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (arc) {
      const half = degToRad(arc) / 2;
      ctx.moveTo(this.x, this.y);
      ctx.arc(this.x, this.y, radius, this.facing - half, this.facing + half);
      ctx.closePath();
      ctx.globalAlpha *= 0.5;
      ctx.fill();
      ctx.globalAlpha = 0.18 + 0.35 * p;
      ctx.stroke();
    } else {
      ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawBody(ctx) {
    const s = this.def.sprite;
    const tint = this.hitFlash > 0
      ? COLORS.enemyHit
      : this.state === 'windup' || this.state === 'strike'
        ? COLORS.enemyWindup
        : null;
    // Beim Ausholen wird der Gegner sichtbar groesser.
    const grow = 1 + this.windupProgress * 0.25 + (this.state === 'strike' ? 0.3 : 0);
    const size = spriteSize(this.sprite, s, SPRITES.scale[this.type] ?? 1);
    drawSprite(ctx, this.sprite, this.x, this.y + s.offsetY, size.w * grow, size.h * grow, this.baseColor, {
      tint,
      tintAlpha: this.hitFlash > 0 ? 0.9 : 0.55,
      frame: Math.floor(this.animTime * 6),
      flipX: Math.cos(this.facing) < 0,
    });
  }

  drawHpBar(ctx) {
    const bar = UI.enemyHpBar;
    if (bar.hideWhenFull && this.hp >= this.maxHp) return;
    const w = bar.width;
    const x = this.x - w / 2;
    const y = this.y - this.hh - bar.offsetY;
    drawBar(ctx, x, y, w, bar.height, this.hp / this.maxHp, COLORS.hpFill, COLORS.hpBack, COLORS.hpBorder);
  }

  /** Kurzes Zusammenfallen; game.js raeumt den Gegner danach weg. */
  drawDeath(ctx) {
    const t = clamp(this.deathTimer / 0.25, 0, 1);
    const s = this.def.sprite;
    const size = spriteSize(this.sprite, s, SPRITES.scale[this.type] ?? 1);
    drawSprite(ctx, this.sprite, this.x, this.y + s.offsetY + t * 4,
      size.w * (1 + t * 0.4), size.h * (1 - t * 0.8), this.baseColor,
      { alpha: 1 - t, tint: COLORS.enemyHit, tintAlpha: 0.4 * t });
  }

  drawDebug(ctx) {
    ctx.strokeStyle = COLORS.debug;
    ctx.lineWidth = 1;
    ctx.strokeRect(
      Math.round(this.x - this.hw) + 0.5,
      Math.round(this.y - this.hh) + 0.5,
      this.hw * 2 - 1,
      this.hh * 2 - 1,
    );
    ctx.strokeStyle = 'rgba(217,86,63,0.35)';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.def.strikeRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(57,208,255,0.18)';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.def.aggroRadius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = COLORS.debug;
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(this.state, this.x, this.y - this.hh - 16);
  }
}