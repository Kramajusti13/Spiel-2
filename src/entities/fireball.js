/**
 * fireball.js  Feuerball des Magiers und Drachen (Etappe 1).
 *
 * Aufbau wie poisonSpit.js: fliegt geradeaus, endliche Reichweite, zerplatzt
 * an Waenden, beim ersten Treffer oder am Reichweitenende. Beim Treffer wird
 * der Spieler zusaetzlich angezuendet (BurnCloud in game.clouds).
 */

import { COLORS } from '../config.js';
import { drawSprite, hasSprite } from '../gfx.js';
import { playSound } from '../audio.js';
import { aabbOverlap } from '../util.js';
import { BurnCloud } from './burnCloud.js';

const SUBSTEPS = 3;
const RADIUS = 8;
const HIT_RADIUS = 6;
const SPLAT_TIME = 0.35;

export class Fireball {
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
    this.splatTimer = 0;
    this.spin = Math.random() * Math.PI * 2;
    this.sprite = 'fireball';
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
      if (this.traveled >= this.maxRange) { this.splat(); return; }
      if (game.level.isSolidAt(this.x, this.y)) {
        this.x -= stepX; this.y -= stepY;
        this.splat(); return;
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

    // Verbrennung: BurnCloud an den Spieler heften. Stapelt nicht 
    // ein erneuter Treffer setzt die Dauer zurueck.
    const existing = game.clouds.find((c) => c instanceof BurnCloud && !c.spent);
    if (existing) {
      existing.age = 0;
      existing.burnTick = 0;
    } else {
      game.clouds.push(new BurnCloud(p.x, p.y));
    }

    this.splat();
    return true;
  }

  draw(ctx) {
    if (this.splatTimer > 0) { this.drawSplat(ctx); return; }

    if (hasSprite(this.sprite)) {
      const d = RADIUS * 2;
      drawSprite(ctx, this.sprite, this.x, this.y, d, d, COLORS.fireball ?? '#ff6600',
        { rotation: this.spin });
      return;
    }

    // Platzhalter: gluehender Feuerball mit hellem Kern.
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.spin);
    ctx.fillStyle = COLORS.fireball ?? '#ff6600';
    ctx.beginPath();
    ctx.ellipse(0, 0, RADIUS, RADIUS * 0.75, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = COLORS.burnDark ?? '#cc3300';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = COLORS.burnBright ?? '#ffaa00';
    ctx.beginPath();
    ctx.ellipse(0, 0, RADIUS * 0.5, RADIUS * 0.4, 0 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawSplat(ctx) {
    const t = this.splatTimer / SPLAT_TIME;
    ctx.save();
    ctx.globalAlpha = t;
    ctx.fillStyle = COLORS.fireball ?? '#ff6600';
    for (let i = 0; i < 6; i++) {
      const a = this.spin + (i / 6) * Math.PI * 2;
      const spread = RADIUS * (1 + (1 - t) * 2);
      ctx.fillRect(
        Math.round(this.x + Math.cos(a) * spread) - 1,
         Math.round(this.y + Math.sin(a) * spread) - 1,
        3, 3,
      );
    }
    ctx.restore();
  }
}
