/**
 * poisonSpit.js — Giftspucke der Titanoboa (VERBESSERUNGEN_1 Abschnitt 6).
 *
 * Aufbau wie stone.js: fliegt geradeaus, endliche Reichweite, zerplatzt an
 * Waenden, beim ersten Treffer oder am Reichweitenende. Nicht friendly — nur
 * der Spieler wird getroffen.
 */

import { COLORS } from '../config.js';
import { playSound } from '../audio.js';
import { aabbOverlap } from '../util.js';

const SUBSTEPS = 3;
const RADIUS = 8;
const HIT_RADIUS = 6;
const SPLAT_TIME = 0.35;

export class PoisonSpit {
  /**
   * @param {number} x Startpunkt
   * @param {number} y
   * @param {number} angle Flugrichtung in Radiant
   * @param {number} damage
   * @param {object} [opt] { speed, maxRange, knockback }
   */
  constructor(x, y, angle, damage, opt = {}) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.damage = damage;
    this.speed = opt.speed ?? 280;
    this.knockback = opt.knockback ?? 60;
    this.maxRange = opt.maxRange ?? 400;
    this.traveled = 0;

    this.age = 0;
    this.spent = false;
    /** > 0 = zerplatzt sichtbar, blendet aus. */
    this.splatTimer = 0;
    /** Leichte Eigendrehung fuer die Optik. */
    this.spin = Math.random() * Math.PI * 2;
  }

  update(dt, game) {
    this.age += dt;
    this.spin += 3 * dt;

    if (this.splatTimer > 0) {
      this.splatTimer -= dt;
      if (this.splatTimer <= 0) this.spent = true;
      return;
    }

    const stepX = (Math.cos(this.angle) * this.speed * dt) / SUBSTEPS;
    const stepY = (Math.sin(this.angle) * this.speed * dt) / SUBSTEPS;
    const stepLen = Math.hypot(stepX, stepY);

    for (let i = 0; i < SUBSTEPS; i++) {
      this.x += stepX;
      this.y += stepY;
      this.traveled += stepLen;
      if (this.traveled >= this.maxRange) {
        this.splat();
        return;
      }
      if (game.level.isSolidAt(this.x, this.y)) {
        this.x -= stepX;
        this.y -= stepY;
        this.splat();
        return;
      }
      if (this.hitPlayer(game)) return;
    }
  }

  splat() {
    playSound('arrowHit', { volume: 0.4 });
    this.splatTimer = SPLAT_TIME;
  }

  hitPlayer(game) {
    const p = game.player;
    if (!p || p.dead) return false;
    if (!aabbOverlap(this.x, this.y, HIT_RADIUS, HIT_RADIUS, p.x, p.y, p.hw, p.hh)) return false;
    p.takeDamage(this.damage, this.angle, game);
    this.splat();
    return true;
  }

  draw(ctx) {
    if (this.splatTimer > 0) {
      this.drawSplat(ctx);
      return;
    }
    // Grundform: dunkelgruener Tropfen mit heller Kante — passt zu Giftpilz/POISON.
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.spin);
    ctx.fillStyle = COLORS.giftpilz ?? '#4d7a3a';
    ctx.beginPath();
    ctx.ellipse(0, 0, RADIUS, RADIUS * 0.75, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = COLORS.titanoboaAccent ?? '#8fb36a';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }

  drawSplat(ctx) {
    const t = this.splatTimer / SPLAT_TIME;
    ctx.save();
    ctx.globalAlpha = t;
    ctx.fillStyle = COLORS.titanoboaAccent ?? '#8fb36a';
    for (let i = 0; i < 5; i++) {
      const a = this.spin + (i / 5) * Math.PI * 2;
      const spread = RADIUS * (1 + (1 - t) * 1.6);
      ctx.fillRect(
        Math.round(this.x + Math.cos(a) * spread) - 1,
        Math.round(this.y + Math.sin(a) * spread) - 1,
        3, 3,
      );
    }
    ctx.restore();
  }
}
