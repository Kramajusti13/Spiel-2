/**
 * frog.js — Sprung-Angreifer des Urwalds (Erweiterung 2, Abschnitt 1).
 *
 * "Laeuft mittelschnell auf den Spieler zu. In Reichweite springt er hoch und
 * landet mit einem Flaechenschaden."
 *
 * Ablauf: chase -> crouch (kurzes Ducken) -> jump (1,2 s in der Luft,
 * unangreifbar, Zielkreis am Boden) -> strike (Einschlag) -> recover.
 *
 * ZWEI DINGE SIND PFLICHT, KEIN DETAIL:
 *
 *   Der Zielkreis liegt fest. Er wird beim Absprung gesetzt und bewegt sich
 *   danach nicht mehr. Wuerde er dem Spieler folgen, waere er keine Warnung,
 *   sondern eine Ankuendigung des Unvermeidlichen — weglaufen brauchte man
 *   dann gar nicht erst.
 *
 *   Der Frosch landet dort, wo der Kreis liegt. Deshalb fliegt er ueber
 *   Waende hinweg (er ist in der Luft) statt an ihnen abzuprallen. Ein Frosch,
 *   den eine Mauer auf halber Strecke stoppt, waere ein Kreis, der luegt.
 */

import { COLORS, SPRITES } from '../config.js';
import { hasSprite, drawSprite, spriteSize } from '../gfx.js';
import { dist, randRange } from '../util.js';
import { Enemy } from './enemy.js';
import { findFreeSpot } from './player.js';

export class Frog extends Enemy {
  constructor(x, y) {
    super('frog', x, y);
    this.animTime = Math.random() * 3;
    this.jumpTimer = randRange(0, this.def.jumpCooldown);

    /** Absprungpunkt und Ziel — waehrend des Fluges wird dazwischen interpoliert. */
    this.fromX = x;
    this.fromY = y;
    this.targetX = x;
    this.targetY = y;
    /** Sichtbare Hoehe ueber dem Boden, 0 = am Boden. */
    this.height = 0;
  }

  /** Waehrend des Sprungs ist er nicht angreifbar (Abschnitt 1). */
  get invulnerable() {
    return this.state === 'jump';
  }

  /** Fortschritt des Fluges, 0 -> 1. */
  get airProgress() {
    return this.state === 'jump' ? Math.min(1, this.stateTime / this.def.airTime) : 0;
  }

  think(dt, game) {
    const player = game.player;
    const d = dist(this.x, this.y, player.x, player.y);

    if (this.state === 'idle' && d <= this.def.aggroRadius && !player.dead) {
      this.setState('chase');
    } else if (this.state !== 'idle' && this.state !== 'jump'
      && (d > this.def.loseAggroRadius || player.dead)) {
      this.setState('idle');
    }
    if (this.state === 'idle') return;

    this.jumpTimer = Math.max(0, this.jumpTimer - dt);

    // --- Ducken: kurzer sichtbarer Moment vor dem Absprung ---
    if (this.state === 'crouch') {
      this.facing = Math.atan2(this.targetY - this.y, this.targetX - this.x);
      if (this.stateTime >= this.def.crouchTime) this.takeOff();
      return;
    }

    // --- In der Luft: Position interpolieren, Hoehe als Parabel ---
    if (this.state === 'jump') {
      const t = this.airProgress;
      this.x = this.fromX + (this.targetX - this.fromX) * t;
      this.y = this.fromY + (this.targetY - this.fromY) * t;
      // Sinusbogen: 0 am Boden, Scheitel in der Mitte, 0 bei der Landung.
      this.height = Math.sin(t * Math.PI) * this.def.jumpHeight;
      if (t >= 1) this.land(game);
      return;
    }

    if (this.state === 'strike') {
      if (this.stateTime >= this.def.strikeTime) this.setState('recover');
      return;
    }

    // --- Nach der Landung offen dastehen: das Zeitfenster zum Zuschlagen ---
    if (this.state === 'recover') {
      if (this.stateTime >= this.def.recoverTime) this.setState('chase');
      return;
    }

    // --- Verfolgen, bis der Sprung sich lohnt ---
    this.facing = Math.atan2(player.y - this.y, player.x - this.x);
    if (this.jumpTimer <= 0 && d <= this.def.jumpRange) {
      this.startCrouch(player);
      return;
    }

    const heading = this.steer(player, game.level, dt);
    game.level.moveEntity(this,
      Math.cos(heading) * this.def.speed * dt,
      Math.sin(heading) * this.def.speed * dt);
  }

  /**
   * Ducken und dabei das Ziel festlegen. Gezielt wird auf den Spieler, wie er
   * JETZT steht — was danach passiert, ist seine Entscheidung.
   */
  startCrouch(player) {
    this.targetX = player.x;
    this.targetY = player.y;
    this.setState('crouch');
  }

  takeOff() {
    this.fromX = this.x;
    this.fromY = this.y;
    this.setState('jump');
  }

  /**
   * Landung: Flaechenschaden im Einschlagsradius, dann eine offene Pause.
   *
   * Der Frosch wird beim Aufsetzen auf einen freien Fleck geschoben, falls das
   * Ziel inzwischen zugebaut ist (er fliegt ueber Waende, landen kann er nicht
   * in ihnen).
   */
  land(game) {
    this.height = 0;
    const frei = findFreeSpot(game.level, this.targetX, this.targetY, this.hw, this.hh);
    this.x = frei.x;
    this.y = frei.y;
    this.jumpTimer = this.def.jumpCooldown;
    this.setState('strike');

    // Flaechenschaden: alles im Radius um den Einschlag. Gemessen wird vom
    // Kreismittelpunkt, also von dort, wo der Kreis lag — nicht von der
    // korrigierten Froschposition.
    const player = game.player;
    if (!player.dead
      && dist(this.targetX, this.targetY, player.x, player.y) <= this.def.impactRadius) {
      const angle = Math.atan2(player.y - this.targetY, player.x - this.targetX);
      player.takeDamage(this.def.damage, angle, game);
    }

    game.shake(7, 0.22);
    // Staub am Einschlag, damit die Landung auch ohne Treffer sichtbar einschlaegt.
    game.spawnHitSpark(this.targetX, this.targetY, 0);
  }

  /**
   * Der Zielkreis. Er liegt am Boden, waehrend der Frosch fliegt, und fuellt
   * sich sichtbar bis zur Landung — man sieht also nicht nur WO, sondern auch
   * WANN es einschlaegt.
   */
  drawImpactRing(ctx) {
    const t = this.airProgress;
    const r = this.def.impactRadius;

    ctx.save();
    // Gefuellte Flaeche: sie waechst mit der Zeit und ist der eigentliche
    // "raus hier"-Hinweis.
    ctx.globalAlpha = 0.12 + 0.20 * t;
    ctx.fillStyle = COLORS.impactRing;
    ctx.beginPath();
    ctx.arc(this.targetX, this.targetY, r * t, 0, Math.PI * 2);
    ctx.fill();

    // Aussenkante: zeigt die volle Reichweite von Anfang an. Ohne sie wuesste
    // man erst kurz vor dem Einschlag, wie gross die Flaeche wirklich wird.
    ctx.globalAlpha = 0.45 + 0.45 * t;
    ctx.strokeStyle = COLORS.impactRing;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.arc(this.targetX, this.targetY, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  draw(ctx) {
    if (!this.dead && this.state === 'jump') this.drawImpactRing(ctx);
    super.draw(ctx);
  }

  /**
   * Platzhalter: gedrungener Koerper mit Augen obendrauf. In der Luft wandert
   * er nach oben, der Schatten bleibt am Boden — daran liest man die Hoehe ab.
   */
  drawBody(ctx) {
    const s = this.def.sprite;
    const cy = this.y + s.offsetY - this.height;

    if (hasSprite(this.sprite)) {
      const size = spriteSize(this.sprite, s, SPRITES.scale.frog);
      const tint = this.hitFlash > 0
        ? COLORS.enemyHit
        : this.state === 'crouch' ? COLORS.enemyWindup : null;
      drawSprite(ctx, this.sprite, this.x, cy, size.w, size.h, this.baseColor,
        { tint, tintAlpha: 0.85, flipX: Math.cos(this.facing) < 0 });
      return;
    }

    let fill = this.baseColor;
    if (this.state === 'crouch') fill = COLORS.enemyWindup;
    if (this.hitFlash > 0) fill = COLORS.enemyHit;

    // Beim Ducken flacher, in der Luft gestreckt — der Koerper zeigt, was er tut.
    const squash = this.state === 'crouch' ? 0.7 : 1 + 0.15 * Math.sin(this.airProgress * Math.PI);
    const w = s.w / squash;
    const h = s.h * squash;

    ctx.save();
    ctx.fillStyle = fill;
    ctx.fillRect(Math.round(this.x - w / 2), Math.round(cy - h / 2), Math.round(w), Math.round(h));
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.lineWidth = 1;
    ctx.strokeRect(Math.round(this.x - w / 2) + 0.5, Math.round(cy - h / 2) + 0.5,
      Math.round(w) - 1, Math.round(h) - 1);

    // Zwei Augen oben — macht aus dem Rechteck erkennbar einen Frosch.
    ctx.fillStyle = COLORS.frogAccent;
    const ey = Math.round(cy - h / 2 - 1);
    ctx.fillRect(Math.round(this.x - w / 2 + 3), ey, 4, 4);
    ctx.fillRect(Math.round(this.x + w / 2 - 7), ey, 4, 4);
    ctx.restore();
  }

  /** Debug: Einschlagsradius und Sprungreichweite. */
  drawDebug(ctx) {
    super.drawDebug?.(ctx);
    ctx.save();
    ctx.strokeStyle = 'rgba(217,86,63,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.def.impactRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(57,208,255,0.3)';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.def.jumpRange, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}
