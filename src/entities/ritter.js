/**
 * ritter.js  Nahkaempfer mit Schild (Etappe 1).
 *
 * "Blockt jede Art von Schuss oder Wurf. Mit dem Speer zugestochen bekommt er
 * Schaden genau so wie durch das Schwert. Der Ritter schlaegt mit einem Hammer"
 *
 * Der Schild ist waffenabhaengig: Bogen und geworfener Speer machen
 * verminderten Schaden, Schwert und Speerstoss vollen. Unterschieden wird
 * am Abstand: ein Speer aus > 80 px ist ein Wurf, aus < 80 px ein Stoss.
 */

import { COLORS } from '../config.js';
import { hasSprite } from '../gfx.js';
import { dist } from '../util.js';
import { Enemy } from './enemy.js';

export class Ritter extends Enemy {
  constructor(x, y) {
    super('ritter', x, y);
    this.animTime = Math.random() * 3;
    this.baseColor = COLORS.ritter ?? '#7a7a8a';
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

    if (this.meleeCycle(dt, game)) return;

    this.facing = Math.atan2(player.y - this.y, player.x - this.x);
    const heading = this.steer(player, game.level, dt);
    game.level.moveEntity(this,
      Math.cos(heading) * this.def.speed * dt,
      Math.sin(heading) * this.def.speed * dt);
  }

  /**
   * Waffenbewusste Schadensreduktion:
   *   Bogen                -> Schaden * rangedDamageFactor (30 %)
   *   Speer aus > 80 px   -> geworfen = wie Bogen behandelt
   *   Schwert             -> voller Schaden
   *   Speer aus < 80 px   -> Stoss = voller Schaden
   */
  takeDamage(amount, fromAngle, knockback, game, crit = false, weapon = null) {
    if (this.dead) return;
    let reduced = amount;
    const player = game.player;
    const d = dist(this.x, this.y, player.x, player.y);
    const factor = this.def.rangedDamageFactor ?? 0.3;
    const threshold = this.def.rangedThreshold ?? 80;

    if (weapon === 'bow') {
      reduced = amount * factor;
    } else if (weapon === 'spear' && d > threshold) {
      // Geworfener Speer = Fernkampf = reduziert.
      reduced = amount * factor;
    }
    // Schwert und Speerstoss (nah) = voller Schaden.

    super.takeDamage(reduced, fromAngle, knockback, game, crit, weapon);
  }

  /** Platzhalter: gepanzerte Gestalt mit Schild und Hammer. */
  drawBody(ctx) {
    if (hasSprite(this.sprite)) {
      super.drawBody(ctx);
      return;
    }
    const s = this.def.sprite;
    const grow = 1 + this.windupProgress * 0.15 + (this.state === 'strike' ? 0.2 : 0);
    const w = s.w * grow;
    const h = s.h * grow;
    const cy = this.y + s.offsetY;

    let fill = this.baseColor;
    if (this.state === 'windup' || this.state === 'strike') fill = COLORS.enemyWindup;
    if (this.hitFlash > 0) fill = COLORS.enemyHit;

    ctx.save();
    ctx.fillStyle = fill;
    ctx.fillRect(Math.round(this.x - w / 2), Math.round(cy - h / 2), Math.round(w), Math.round(h));
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.lineWidth = 2;
    ctx.strokeRect(Math.round(this.x - w / 2) + 1, Math.round(cy - h / 2 + 1),
      Math.round(w) - 2, Math.round(h) - 2);
    // Schild an der Seite.
    ctx.fillStyle = COLORS.ritterAccent ?? '#aaaacc';
    ctx.fillRect(Math.round(this.x - w / 2 - 4), Math.round(cy - h / 4), 6, Math.round(h / 2));
    // Hammer beim Ausholen.
    if (this.state === 'windup') {
      const lift = 3 + 5 * this.windupProgress;
      ctx.fillStyle = COLORS.ritterAccent ?? '#aaaacc';
      ctx.fillRect(Math.round(this.x + w / 2), Math.round(cy - h / 2 - lift), 8, 6);
    }
    // Helm-Schlitz.
    const ex = Math.cos(this.facing) * 3;
    const ey = Math.sin(this.facing) * 2;
    ctx.fillStyle = '#1a1a2a';
    ctx.fillRect(Math.round(this.x - 5 + ex), Math.round(cy - 5 + ey), 3, 3);
    ctx.fillRect(Math.round(this.x + 2 + ex), Math.round(cy - 5 + ey), 3, 3);
    ctx.restore();
  }
}
