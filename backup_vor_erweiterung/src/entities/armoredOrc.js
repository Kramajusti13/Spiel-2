/**
 * armoredOrc.js — Level 4 (Abschnitt 6).
 *
 * "Langsam, 5 Verteidigung, weiter Schwung."
 * Die 5 Verteidigung machen das rostige Schwert fast wirkungslos (20 - 5 = 15
 * statt 20) — hier lohnt sich das Waffen-Upgrade zum ersten Mal richtig.
 * Sein Schlag trifft einen breiten Kegel, man kann ihm also nicht einfach
 * seitlich ausweichen, sondern muss nach hinten oder um ihn herum.
 */

import { COLORS } from '../config.js';
import { hasSprite } from '../gfx.js';
import { dist } from '../util.js';
import { Enemy } from './enemy.js';

export class ArmoredOrc extends Enemy {
  constructor(x, y) {
    super('armoredOrc', x, y);
    this.animTime = Math.random() * 3;
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
    // Schwerer Gang: leichtes Stampfen im Tempo.
    const stomp = 0.9 + 0.2 * Math.sin(this.animTime * 4);
    game.level.moveEntity(this,
      Math.cos(heading) * this.def.speed * stomp * dt,
      Math.sin(heading) * this.def.speed * stomp * dt);
  }

  /** Platzhalter: breite Gestalt mit Panzerplatte. */
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

    // Panzerplatte auf der Brust — erklaert die 5 Verteidigung auf einen Blick.
    ctx.fillStyle = this.hitFlash > 0 ? COLORS.enemyHit : COLORS.orcArmor;
    ctx.fillRect(Math.round(this.x - w * 0.3), Math.round(cy - h * 0.1),
      Math.round(w * 0.6), Math.round(h * 0.42));

    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(Math.round(this.x - w / 2) + 0.5, Math.round(cy - h / 2) + 0.5,
      Math.round(w) - 1, Math.round(h) - 1);

    // Keule in Blickrichtung, holt beim Ausholen weit aus.
    const swing = this.state === 'windup' ? -0.9 + 1.2 * this.windupProgress
      : this.state === 'strike' ? 0.7 : 0;
    ctx.translate(Math.round(this.x), Math.round(cy));
    ctx.rotate(this.facing + swing);
    ctx.fillStyle = this.hitFlash > 0 ? COLORS.enemyHit : '#4a3a2a';
    ctx.fillRect(10, -3, 16, 6);
    ctx.restore();
  }
}
