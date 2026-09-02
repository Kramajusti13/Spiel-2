/**
 * thrownSpear.js — der geworfene Speer (Erweiterung 2, Abschnitt 3).
 *
 * Aufbau wie arrow.js: fliegt geradeaus, bleibt in Waenden stecken, ist beim
 * ersten Treffer verbraucht. Bewusst eine eigene Klasse statt eines Flags an
 * Arrow — der Speer holt seine Werte aus SPEAR statt aus BOW, und ein
 * "istEigentlichEinSpeer"-Schalter mitten im Pfeilcode waere die Sorte
 * Abkuerzung, die man drei Monate spaeter nicht mehr versteht.
 *
 * Der Kill zaehlt auf die Waffe 'spear' — davon lebt spaeter die Quest
 * "Besiege 20 Gegner mit dem Speer" (Abschnitt 8).
 */

import { SPEAR, COLORS, PLAYER } from '../config.js';
import { drawSprite, hasSprite } from '../gfx.js';
import { playSound } from '../audio.js';
import { aabbOverlap } from '../util.js';

/** In wie viele Teilschritte die Bewegung eines Bildes zerlegt wird. */
const SUBSTEPS = 3;

/** Wie lange ein steckengebliebener Speer noch sichtbar ist. */
const STUCK_TIME = 0.9;

export class ThrownSpear {
  /**
   * @param {number} x Startpunkt
   * @param {number} y
   * @param {number} angle Flugrichtung in Radiant
   * @param {number} damage
   */
  constructor(x, y, angle, damage) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.damage = damage;
    this.speed = SPEAR.throwSpeed;
    /** Endliche Reichweite: bewusst kuerzer als beim Bogen. */
    this.maxRange = SPEAR.throwMaxRange;
    this.traveled = 0;

    this.age = 0;
    this.spent = false;     // getroffen oder abgelaufen -> wird entfernt
    this.stuckTimer = 0;    // steckt in einer Wand und verblasst
    this.sprite = 'spear';
  }

  update(dt, game) {
    this.age += dt;

    if (this.stuckTimer > 0) {
      this.stuckTimer -= dt;
      if (this.stuckTimer <= 0) this.spent = true;
      return;
    }

    if (this.age >= SPEAR.throwLife) {
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
        // Ein Stueck zurueck, damit der Speer sichtbar in der Wand steckt.
        this.x -= stepX * 0.5;
        this.y -= stepY * 0.5;
        playSound('arrowHit', { volume: 0.6 });
        this.stuckTimer = STUCK_TIME;
        return;
      }

      if (this.hitEnemy(game)) return;
    }
  }

  hitEnemy(game) {
    for (const enemy of game.enemies) {
      // Unverwundbare Gegner werden durchflogen, nicht getroffen — sonst
      // waere der Schuss verbraucht, ohne Wirkung zu haben.
      if (enemy.dead || enemy.invulnerable) continue;
      if (!aabbOverlap(this.x, this.y, SPEAR.hitRadius, SPEAR.hitRadius,
        enemy.x, enemy.y, enemy.hw, enemy.hh)) continue;

      const crit = Math.random() < PLAYER.critChance;
      const damage = Math.round(crit ? this.damage * PLAYER.critMultiplier : this.damage);
      enemy.takeDamage(damage, this.angle, SPEAR.throwKnockback, game, crit, 'spear');
      this.spent = true;
      return true;
    }
    return false;
  }

  draw(ctx) {
    const s = SPEAR.sprite;
    const alpha = this.stuckTimer > 0 ? Math.max(0, this.stuckTimer / STUCK_TIME) : 1;

    if (hasSprite(this.sprite)) {
      drawSprite(ctx, this.sprite, this.x, this.y, s.w, s.h, COLORS.spear,
        { rotation: this.angle, alpha });
      return;
    }

    // Platzhalter: laengerer, dickerer Schaft als beim Pfeil, mit heller
    // Spitze — man soll im Flug sehen, dass da etwas Schweres unterwegs ist.
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.fillStyle = COLORS.spear;
    ctx.fillRect(-s.w / 2, -s.h / 2, s.w, s.h);
    ctx.fillStyle = COLORS.spearTip;
    // Spitze als Dreieck am vorderen Ende.
    ctx.beginPath();
    ctx.moveTo(s.w / 2 + 5, 0);
    ctx.lineTo(s.w / 2 - 3, -s.h / 2 - 2);
    ctx.lineTo(s.w / 2 - 3, s.h / 2 + 2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}
