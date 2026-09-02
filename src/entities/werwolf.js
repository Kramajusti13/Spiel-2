/**
 * werwolf.js  Nahkaempfer (Etappe 1).
 *
 * "Rennt sehr schnell auf den Spieler zu und versucht ihn zu beissen"
 *
 * Der einfachste der neuen Monster: schneller Nahkampf ohne Rueckzug oder
 * Sonderangriff. Wie der Goblin, aber deutlich schneller und mit mehr Leben.
 */

import { COLORS } from '../config.js';
import { hasSprite } from '../gfx.js';
import { dist } from '../util.js';
import { Enemy } from './enemy.js';

export class Werwolf extends Enemy {
  constructor(x, y) {
    super('werwolf', x, y);
    this.animTime = Math.random() * 3;
    this.baseColor = COLORS.werwolf ?? '#5a4a3a';
  }

  think(dt, game) {
    const player = game.player;
    const d = dist(this.x, this.y, player.x, player.y);

    if (this.state === 'idle' && d <= this.def.aggroRadius && !player.dead) {
      this.setState('chase');
    } else if (this.state === 'chase' && (d > this.def.loseAggroRadius || player.dead)) {
      this.setState('idle');
    }
    if (this.state === 'idle') return;

    // Standard-Nahkampfzyklus (chase -> windup -> strike -> recover).
    if (this.meleeCycle(dt, game)) return;

    // Nicht in Reichweite: sehr schnell hinterher.
    this.facing = Math.atan2(player.y - this.y, player.x - this.x);
    const heading = this.steer(player, game.level, dt);
    game.level.moveEntity(this,
      Math.cos(heading) * this.def.speed * dt,
      Math.sin(heading) * this.def.speed * dt);
  }

  /** Platzhalter: dunkle, gedrungene Gestalt mit gluehenden Augen. */
  drawBody(ctx) {
    if (hasSprite(this.sprite)) {
      super.drawBody(ctx);
      return;
    }
    const s = this.def.sprite;
    const grow = 1 + this.windupProgress * 0.2 + (this.state === 'strike' ? 0.25 : 0);
    const w = s.w * grow;
    const h = s.h * grow;
    const cy = this.y + s.offsetY;

    let fill = this.baseColor;
    if (this.state === 'windup' || this.state === 'strike') fill = COLORS.enemyWindup;
    if (this.hitFlash > 0) fill = COLORS.enemyHit;

    ctx.save();
    ctx.fillStyle = fill;
    ctx.fillRect(Math.round(this.x - w / 2), Math.round(cy - h / 2), Math.round(w), Math.round(h));
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(Math.round(this.x - w / 2) + 0.5, Math.round(cy - h / 2 + 0.5),
      Math.round(w) - 1, Math.round(h) - 1);
    // Kraeftige Beine.
    ctx.fillStyle = COLORS.werwolfAccent ?? '#8a7a5a';
    ctx.fillRect(Math.round(this.x - w / 2 - 2), Math.round(cy + h / 4), 4, 6);
    ctx.fillRect(Math.round(this.x + w / 2 - 2), Math.round(cy + h / 4), 4, 6);
    // Gluehende Augen  gelb.
    const ex = Math.cos(this.facing) * 3;
    const ey = Math.sin(this.facing) * 2;
    ctx.fillStyle = '#ffcc00';
    ctx.fillRect(Math.round(this.x - 5 + ex), Math.round(cy - 5 + ey), 3, 3);
    ctx.fillRect(Math.round(this.x + 2 + ex), Math.round(cy - 5 + ey), 3, 3);
    ctx.restore();
  }
}
