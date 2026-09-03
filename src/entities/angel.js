/**
 * angel.js — Himmelsthema Monster (Level 16-20)
 *
 * Fernkaempfer: Laesst einen Heiligenschein ueber dem Spieler erscheinen, der explodiert.
 * Werte fuer Normal: 1500 HP, 180 Schaden, 3000 XP, 800-1000 Gold
 */

import { COLORS } from '../config.js';
import { hasSprite } from '../gfx.js';
import { dist } from '../util.js';
import { Enemy } from './enemy.js';

export class Angel extends Enemy {
  constructor(x, y) {
    super('angel', x, y);
    this.animTime = Math.random() * 3;
    this.haloCooldown = 0;
    this.haloCharging = false;
    this.halo = null;
  }

  think(dt, game) {
    const player = game.player;
    const d = dist(this.x, this.y, player.x, player.y);

    // Aggro
    if (this.state === 'idle' && d <= this.def.aggroRadius && !player.dead) {
      this.setState('chase');
    } else if (this.state !== 'idle' && (d > this.def.loseAggroRadius || player.dead)) {
      this.setState('idle');
    }
    if (this.state === 'idle') return;

    this.facing = Math.atan2(player.y - this.y, player.x - this.x);
    this.haloCooldown = Math.max(0, this.haloCooldown - dt);

    // Heiligenschein-Angriff
    if (this.state === 'windup') {
      if (!this.haloCharging) {
        this.haloCharging = true;
        this._createHalo(game);
      }
      if (this.stateTime >= this.def.windupTime) {
        this.setState('strike');
      }
      return;
    }

    if (this.state === 'strike') {
      this._explodeHalo(game);
      if (this.stateTime >= this.def.strikeTime) {
        this.setState('recover');
        this.haloCharging = false;
      }
      return;
    }

    if (this.state === 'recover') {
      if (this.stateTime >= this.def.recoverTime) {
        this.setState('chase');
      }
      return;
    }

    // Angriffsbereit?
    if (this.haloCooldown <= 0 && d <= this.def.range) {
      this.setState('windup');
      return;
    }

    // Bewegung
    const heading = this.steer(player, game.level, dt);
    const speed = this.def.speed;
    game.level.moveEntity(this, Math.cos(heading) * speed * dt, Math.sin(heading) * speed * dt);
  }

  _createHalo(game) {
    const player = game.player;
    this.halo = {
      x: player.x,
      y: player.y - 40,
      radius: 0,
      maxRadius: 60,
      damage: this.def.damage,
      update(dt) {
        const progress = Math.min(1, this.growthTime / this.def.windupTime);
        this.radius = this.maxRadius * progress;
      },
      draw(ctx) {
        ctx.save();
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = COLORS.gold;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    };
    this.halo.def = this.def;
    this.halo.growthTime = 0;
    game.addEffect(this.halo);
  }

  _explodeHalo(game) {
    if (!this.halo || this.halo.exploded) return;
    this.halo.exploded = true;
    
    const player = game.player;
    const d = dist(this.halo.x, this.halo.y, player.x, player.y);
    if (d <= this.halo.maxRadius + player.hw) {
      player.takeDamage(this.halo.damage, Math.atan2(player.y - this.halo.y, player.x - this.halo.x), game);
    }
    
    this.haloCooldown = this.def.attackCooldown;
  }
}