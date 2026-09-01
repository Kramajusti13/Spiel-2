/**
 * goblin.js — Level 2 (Abschnitt 6).
 *
 * "Schnell, greift in Intervallen an, weicht danach zurueck."
 * Der Rueckzug nach dem Schlag ist sein Kniff: er ist dadurch schwer mit dem
 * Schwert zu erwischen und macht das Schild interessant, weil man ihn kommen
 * sieht, statt ihn zu verfolgen.
 */

import { COLORS } from '../config.js';
import { hasSprite } from '../gfx.js';
import { dist } from '../util.js';
import { Enemy } from './enemy.js';

export class Goblin extends Enemy {
  constructor(x, y) {
    super('goblin', x, y);
    this.animTime = Math.random() * 3;
    this.retreatAngle = 0;
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

    // Nach dem Schlag zurueckweichen, statt stehen zu bleiben.
    if (this.state === 'retreat') {
      this.facing = Math.atan2(player.y - this.y, player.x - this.x);
      const speed = this.def.speed * this.def.retreatSpeedFactor;
      game.level.moveEntity(this,
        Math.cos(this.retreatAngle) * speed * dt,
        Math.sin(this.retreatAngle) * speed * dt);
      // Weit genug weg oder Zeit um? Dann wieder ran.
      if (this.stateTime >= this.def.retreatTime || d >= this.def.retreatDistance) {
        this.setState('chase');
      }
      return;
    }

    if (this.meleeCycle(dt, game)) {
      // Direkt nach dem Zuschlagen in den Rueckzug wechseln.
      if (this.state === 'recover' && this.stateTime === 0) {
        this.retreatAngle = Math.atan2(this.y - player.y, this.x - player.x);
        this.setState('retreat');
      }
      return;
    }

    this.facing = Math.atan2(player.y - this.y, player.x - this.x);
    const heading = this.steer(player, game.level, dt);
    game.level.moveEntity(this,
      Math.cos(heading) * this.def.speed * dt,
      Math.sin(heading) * this.def.speed * dt);
  }

  /** Platzhalter: schmale, hektische Gestalt mit Ohren. */
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
    // Koerper
    ctx.fillStyle = fill;
    ctx.fillRect(Math.round(this.x - w / 2), Math.round(cy - h / 2), Math.round(w), Math.round(h));
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.lineWidth = 1;
    ctx.strokeRect(Math.round(this.x - w / 2) + 0.5, Math.round(cy - h / 2) + 0.5,
      Math.round(w) - 1, Math.round(h) - 1);

    // Spitze Ohren — machen ihn auf einen Blick vom Slime unterscheidbar.
    ctx.fillStyle = COLORS.goblinAccent;
    ctx.fillRect(Math.round(this.x - w / 2 - 3), Math.round(cy - h / 2 + 2), 3, 5);
    ctx.fillRect(Math.round(this.x + w / 2), Math.round(cy - h / 2 + 2), 3, 5);

    // Augen in Blickrichtung
    const ex = Math.cos(this.facing) * 3;
    const ey = Math.sin(this.facing) * 2;
    ctx.fillStyle = '#12140d';
    ctx.fillRect(Math.round(this.x - 4 + ex), Math.round(cy - 4 + ey), 3, 3);
    ctx.fillRect(Math.round(this.x + 2 + ex), Math.round(cy - 4 + ey), 3, 3);
    ctx.restore();
  }
}
