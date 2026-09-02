/**
 * arrow.js — Pfeil des Spielers (Schritt 10).
 *
 * Fliegt geradeaus, bleibt an Waenden stecken und verschwindet beim ersten
 * Treffer. Die Flugbahn wird pro Bild in mehreren Schritten geprueft, damit ein
 * schneller Pfeil bei niedriger Bildrate nicht durch einen Gegner hindurchspringt.
 *
 * Gegnerpfeile (Bogenschuetze, Schritt 12) koennen dieselbe Klasse benutzen —
 * dafuer gibt es das Feld `friendly`.
 */

import { BOW, COLORS, PLAYER } from '../config.js';
import { drawSprite, hasSprite } from '../gfx.js';
import { playSound } from '../audio.js';
import { aabbOverlap } from '../util.js';

/** In wie viele Teilschritte die Bewegung eines Bildes zerlegt wird. */
const SUBSTEPS = 3;

export class Arrow {
  /**
   * @param {number} x Startpunkt
   * @param {number} y
   * @param {number} angle Flugrichtung in Radiant
   * @param {number} damage
   * @param {object} [opt] { friendly, speed, knockback }
   */
  constructor(x, y, angle, damage, opt = {}) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.damage = damage;
    this.speed = opt.speed ?? BOW.arrowSpeed;
    this.knockback = opt.knockback ?? BOW.knockback;
    /** true = vom Spieler abgeschossen (trifft Gegner). */
    this.friendly = opt.friendly ?? true;
    /** Endliche Reichweite: nach dieser Flugstrecke verschwindet der Pfeil. */
    this.maxRange = opt.maxRange ?? BOW.maxRange;
    this.traveled = 0;

    this.age = 0;
    this.spent = false;      // getroffen oder abgelaufen -> wird entfernt
    this.stuckTimer = 0;     // steckt in einer Wand und verblasst
    this.sprite = 'arrow';
  }

  update(dt, game) {
    this.age += dt;

    if (this.stuckTimer > 0) {
      this.stuckTimer -= dt;
      if (this.stuckTimer <= 0) this.spent = true;
      return;
    }

    if (this.age >= BOW.arrowLife) {
      this.spent = true;
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
        this.spent = true;
        return;
      }

      if (game.level.isSolidAt(this.x, this.y)) {
        // Ein Stueck zurueck, damit der Pfeil sichtbar in der Wand steckt.
        this.x -= stepX * 0.5;
        this.y -= stepY * 0.5;
        playSound('arrowHit', { volume: 0.5 });
        this.stuckTimer = 0.6;
        return;
      }

      if (this.friendly) {
        if (this.hitEnemy(game)) return;
      } else if (this.hitPlayer(game)) {
        return;
      }
    }
  }

  hitEnemy(game) {
    for (const enemy of game.enemies) {
      // Unverwundbare Gegner werden durchflogen, nicht getroffen — sonst
      // waere der Schuss verbraucht, ohne Wirkung zu haben.
      if (enemy.dead || enemy.invulnerable) continue;
      if (!aabbOverlap(this.x, this.y, BOW.hitRadius, BOW.hitRadius,
        enemy.x, enemy.y, enemy.hw, enemy.hh)) continue;

      const crit = Math.random() < PLAYER.critChance;
      const damage = Math.round(crit ? this.damage * PLAYER.critMultiplier : this.damage);
      // Nur Spielerpfeile treffen Gegner — der Kill zaehlt auf den Bogen.
      enemy.takeDamage(damage, this.angle, this.knockback, game, crit, 'bow');
      this.spent = true;
      return true;
    }
    return false;
  }

  /** Fuer Gegnerpfeile ab Schritt 12. */
  hitPlayer(game) {
    const p = game.player;
    if (p.dead) return false;
    if (!aabbOverlap(this.x, this.y, BOW.hitRadius, BOW.hitRadius, p.x, p.y, p.hw, p.hh)) return false;
    p.takeDamage(this.damage, this.angle, game);
    this.spent = true;
    return true;
  }

  draw(ctx) {
    const s = BOW.sprite;
    const alpha = this.stuckTimer > 0 ? Math.max(0, this.stuckTimer / 0.6) : 1;

    if (hasSprite(this.sprite)) {
      drawSprite(ctx, this.sprite, this.x, this.y, s.w, s.h, COLORS.arrow,
        { rotation: this.angle, alpha });
      return;
    }

    // Platzhalter: Schaft mit hellerer Spitze, in Flugrichtung gedreht.
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.fillStyle = COLORS.arrow;
    ctx.fillRect(-s.w / 2, -s.h / 2, s.w, s.h);
    ctx.fillStyle = COLORS.arrowTip;
    ctx.fillRect(s.w / 2 - 3, -s.h / 2 - 1, 3, s.h + 2);
    ctx.restore();
  }
}
