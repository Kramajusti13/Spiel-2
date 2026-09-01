/**
 * stone.js — der Wurfstein des Gorillas (Erweiterung 2, Abschnitt 1).
 *
 * Fliegt geradeaus auf den Spieler zu, zerschellt an Waenden und beim ersten
 * Treffer. Aufbau wie arrow.js und thrownSpear.js.
 *
 * Der Stein ist der erste Gegnerangriff, dem man im Flug ausweichen kann —
 * bisher war eine Ausholphase die einzige Vorwarnung. Damit das trägt, muss er
 * DEUTLICH langsamer sein als ein Pfeil (250 statt 300 px/s), gross genug zum
 * Sehen und sichtbar trudeln. Ein schneller, unauffaelliger Stein waere nur
 * ein Pfeil in Grau — und die Fairness-Regel liefe ins Leere.
 */

import { STONE, COLORS } from '../config.js';
import { drawSprite, hasSprite } from '../gfx.js';
import { playSound } from '../audio.js';
import { aabbOverlap } from '../util.js';

/** In wie viele Teilschritte die Bewegung eines Bildes zerlegt wird. */
const SUBSTEPS = 3;

export class Stone {
  /**
   * @param {number} x Startpunkt
   * @param {number} y
   * @param {number} angle Flugrichtung in Radiant
   * @param {number} damage
   * @param {object} [opt] { speed, knockback }
   */
  constructor(x, y, angle, damage, opt = {}) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.damage = damage;
    this.speed = opt.speed ?? 250;
    this.knockback = opt.knockback ?? 90;

    this.age = 0;
    this.spent = false;
    /** > 0 = zerschellt, die Bruchstuecke verblassen noch. */
    this.debrisTimer = 0;
    /** Eigendrehung, damit der Flug lesbar ist. */
    this.spin = Math.random() * Math.PI * 2;
    this.sprite = 'stone';
  }

  update(dt, game) {
    this.age += dt;
    this.spin += STONE.spin * dt * Math.PI * 2;

    if (this.debrisTimer > 0) {
      this.debrisTimer -= dt;
      if (this.debrisTimer <= 0) this.spent = true;
      return;
    }

    if (this.age >= STONE.life) {
      this.spent = true;
      return;
    }

    const stepX = (Math.cos(this.angle) * this.speed * dt) / SUBSTEPS;
    const stepY = (Math.sin(this.angle) * this.speed * dt) / SUBSTEPS;

    for (let i = 0; i < SUBSTEPS; i++) {
      this.x += stepX;
      this.y += stepY;

      if (game.level.isSolidAt(this.x, this.y)) {
        this.x -= stepX;
        this.y -= stepY;
        this.shatter();
        return;
      }
      if (this.hitPlayer(game)) return;
    }
  }

  /** Zerschellen: kurz sichtbare Bruchstuecke, dann weg. */
  shatter() {
    playSound('arrowHit', { volume: 0.55 });
    this.debrisTimer = STONE.debrisTime;
  }

  hitPlayer(game) {
    const p = game.player;
    if (!p || p.dead) return false;
    if (!aabbOverlap(this.x, this.y, STONE.hitRadius, STONE.hitRadius,
      p.x, p.y, p.hw, p.hh)) return false;

    // takeDamage() prueft Schild, Rolle und Unverwundbarkeit selbst.
    p.takeDamage(this.damage, this.angle, game);
    this.shatter();
    return true;
  }

  draw(ctx) {
    if (this.debrisTimer > 0) {
      this.drawDebris(ctx);
      return;
    }

    if (hasSprite(this.sprite)) {
      const d = STONE.radius * 2;
      drawSprite(ctx, this.sprite, this.x, this.y, d, d, COLORS.stone, { rotation: this.spin });
      return;
    }

    // Platzhalter: kantiger Brocken, der sich dreht. Bewusst ein Vieleck und
    // kein Kreis — beim Kreis saehe man die Drehung nicht.
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.spin);
    ctx.fillStyle = COLORS.stone;
    ctx.beginPath();
    const r = STONE.radius;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      // Leicht unregelmaessig, damit es nach Stein aussieht und nicht nach Mutter.
      const rr = r * (i % 2 === 0 ? 1 : 0.82);
      const px = Math.cos(a) * rr;
      const py = Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    // Dunkle Kante: hebt ihn vom Waldboden ab.
    ctx.strokeStyle = COLORS.stoneDark;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }

  /** Aufschlag: ein paar Splitter, die schnell verblassen. */
  drawDebris(ctx) {
    const t = this.debrisTimer / STONE.debrisTime;   // 1 -> 0
    ctx.save();
    ctx.globalAlpha = t;
    ctx.fillStyle = COLORS.stoneDark;
    for (let i = 0; i < 4; i++) {
      const a = this.spin + (i / 4) * Math.PI * 2;
      const spread = STONE.radius * (1 + (1 - t) * 1.6);
      ctx.fillRect(
        Math.round(this.x + Math.cos(a) * spread) - 1,
        Math.round(this.y + Math.sin(a) * spread) - 1,
        3, 3,
      );
    }
    ctx.restore();
  }
}
