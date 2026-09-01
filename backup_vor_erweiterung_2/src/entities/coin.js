/**
 * coin.js — Gold-Drop.
 *
 * Faellt beim Tod eines Gegners, springt kurz zur Seite, fliegt dem Spieler
 * ab LOOT.magnetRadius entgegen und wird ab LOOT.pickupRadius eingesammelt.
 */

import { LOOT, COLORS, SPRITES } from '../config.js';
import { drawSprite, hasSprite, spriteSize } from '../gfx.js';
import { dist, randRange } from '../util.js';

export class Coin {
  constructor(x, y, value) {
    this.x = x;
    this.y = y;
    this.hw = LOOT.sprite.w / 2;
    this.hh = LOOT.sprite.h / 2;
    this.value = value;

    const angle = randRange(0, Math.PI * 2);
    const speed = randRange(LOOT.scatterSpeed * 0.4, LOOT.scatterSpeed);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;

    this.age = 0;
    this.collected = false;
    this.sprite = 'coin';
    this.bobPhase = randRange(0, Math.PI * 2);
  }

  update(dt, game) {
    this.age += dt;
    const player = game.player;
    const d = dist(this.x, this.y, player.x, player.y);
    const armed = this.age >= LOOT.armTime;

    if (armed && !player.dead && d <= LOOT.magnetRadius) {
      // Sog zum Spieler: je naeher, desto schneller.
      const pull = LOOT.magnetSpeed * (1.1 - d / LOOT.magnetRadius);
      const angle = Math.atan2(player.y - this.y, player.x - this.x);
      this.vx += Math.cos(angle) * pull * dt * 6;
      this.vy += Math.sin(angle) * pull * dt * 6;
    }

    // Reibung
    const decay = Math.exp(-LOOT.friction * dt);
    this.vx *= decay;
    this.vy *= decay;

    // Muenzen rollen ueber den Boden, aber nicht durch Waende.
    game.level.moveEntity(this, this.vx * dt, this.vy * dt);

    if (armed && !player.dead && d <= LOOT.pickupRadius) {
      this.collected = true;
      game.collectGold(this);
    }
  }

  draw(ctx) {
    const bob = Math.sin(this.age * LOOT.bobSpeed + this.bobPhase) * LOOT.bobAmplitude;
    const y = this.y + bob;

    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(Math.round(this.x), Math.round(this.y + 5), 5, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();

    if (hasSprite(this.sprite)) {
      const size = spriteSize(this.sprite, LOOT.sprite, SPRITES.scale.coin);
      drawSprite(ctx, this.sprite, this.x, y, size.w, size.h, COLORS.gold, {
        frame: Math.floor(this.age * 8),
      });
      return;
    }

    // Platzhalter: Muenze als schmaler werdender Kreis — wirkt wie Rotation.
    const spin = Math.abs(Math.cos(this.age * 4));
    const w = Math.max(2, LOOT.sprite.w * (0.25 + 0.75 * spin));
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(Math.round(this.x), Math.round(y), w / 2, LOOT.sprite.h / 2, 0, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.gold;
    ctx.fill();
    ctx.strokeStyle = COLORS.goldDark;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }
}
