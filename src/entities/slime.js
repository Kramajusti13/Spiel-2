/**
 * slime.js — erster Gegner (Level 1).
 *
 * "Laeuft langsam direkt auf den Spieler zu" (Abschnitt 6). Bleibt er an einer
 * Wandecke haengen, weicht er kurz seitlich aus, statt dagegen zu druecken.
 */

import { COLORS } from '../config.js';
import { hasSprite } from '../gfx.js';
import { dist } from '../util.js';
import { Enemy } from './enemy.js';

export class Slime extends Enemy {
  constructor(x, y) {
    super('slime', x, y);
    /** Zufaellige Phase, damit nicht alle Slimes im Gleichtakt huepfen. */
    this.animTime = Math.random() * 3;
  }

  think(dt, game) {
    const player = game.player;
    const d = dist(this.x, this.y, player.x, player.y);

    // Aggro an/aus.
    if (this.state === 'idle' && d <= this.def.aggroRadius && !player.dead) {
      this.setState('chase');
    } else if (this.state === 'chase' && (d > this.def.loseAggroRadius || player.dead)) {
      this.setState('idle');
    }
    if (this.state === 'idle') return;

    // Angriffszyklus hat Vorrang; waehrend windup/strike/recover steht er still.
    if (this.meleeCycle(dt, game)) return;

    // Verfolgen: Blick immer zum Spieler, gelaufen wird um Hindernisse herum.
    const toPlayer = Math.atan2(player.y - this.y, player.x - this.x);
    this.facing = toPlayer;
    const heading = this.steer(player, game.level, dt);

    // Huepf-Rhythmus: kurze Schuebe statt gleichfoermigem Gleiten.
    const hop = 0.75 + 0.45 * Math.max(0, Math.sin(this.animTime * 6));
    const vx = Math.cos(heading) * this.def.speed * hop;
    const vy = Math.sin(heading) * this.def.speed * hop;
    game.level.moveEntity(this, vx * dt, vy * dt);
  }

  /** Platzhalter-Blob: gequetschte Ellipse mit Augen — bis das Sprite da ist. */
  drawBody(ctx) {
    if (hasSprite(this.sprite)) {
      super.drawBody(ctx);
      return;
    }

    const s = this.def.sprite;
    const grow = 1 + this.windupProgress * 0.3 + (this.state === 'strike' ? 0.35 : 0);
    // Huepfen: breit und flach am Boden, schmal und hoch in der Luft.
    const hop = this.state === 'chase' ? Math.max(0, Math.sin(this.animTime * 6)) : 0;
    const w = s.w * grow * (1.1 - hop * 0.2);
    const h = s.h * grow * (0.9 + hop * 0.35);
    const cy = this.y + s.offsetY + (h - s.h) / 2 - hop * 4;

    let fill = COLORS.slime;
    if (this.state === 'windup' || this.state === 'strike') fill = COLORS.enemyWindup;
    if (this.hitFlash > 0) fill = COLORS.enemyHit;

    ctx.save();
    ctx.beginPath();
    ctx.ellipse(Math.round(this.x), Math.round(cy), w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Glanzpunkt
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = COLORS.slimeAccent;
    ctx.beginPath();
    ctx.ellipse(this.x - w * 0.18, cy - h * 0.2, w * 0.16, h * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Augen in Blickrichtung — zeigt, wen der Slime anvisiert.
    const ex = Math.cos(this.facing) * 4;
    const ey = Math.sin(this.facing) * 2;
    ctx.fillStyle = '#0f120d';
    ctx.fillRect(Math.round(this.x - 5 + ex), Math.round(cy - 2 + ey), 3, 3);
    ctx.fillRect(Math.round(this.x + 2 + ex), Math.round(cy - 2 + ey), 3, 3);
    ctx.restore();
  }
}

