/**
 * cherubim.js — Himmelsthema Monster (Level 16-20)
 *
 * Nahkaempfer: Sprintet auf den Spieler zu und versucht ihn zu beissen, kann auch dashen
 * Werte fuer Normal: 2500 HP, 220 Schaden, 4000 XP, 1400-1600 Gold
 */

import { COLORS } from '../config.js';
import { hasSprite } from '../gfx.js';
import { dist } from '../util.js';
import { Enemy } from './enemy.js';

export class Cherubim extends Enemy {
  constructor(x, y) {
    super('cherubim', x, y);
    this.animTime = Math.random() * 3;
    this.dashCooldown = 0;
    this.dashing = false;
    this.dashTimer = 0;
    this.dashHit = false;
  }

  think(dt, game) {
    const player = game.player;
    const d = dist(this.x, this.y, player.x, player.y);

    if (this.state === 'idle' && d <= this.def.aggroRadius && !player.dead) {
      this.setState('chase');
    } else if (this.state !== 'idle' && (d > this.def.loseAggroRadius || player.dead)) {
      this.setState('idle');
    }
    if (this.state === 'idle') return;

    this.facing = Math.atan2(player.y - this.y, player.x - this.x);
    this.dashCooldown = Math.max(0, this.dashCooldown - dt);

    if (this.state === 'dashWindup') {
      if (this.stateTime >= this.def.dashWindupTime) {
        this.dashing = true;
        this.dashTimer = this.def.dashDuration;
        this.dashHit = false;
        this.setState('dash');
      }
      return;
    }

    if (this.state === 'dash') {
      this.dashTimer -= dt;
      if (this.dashTimer <= 0) {
        this.dashing = false;
        this.setState('recover');
      }
      const dashSpeed = this.def.dashSpeed;
      game.level.moveEntity(this, Math.cos(this.facing) * dashSpeed * dt, Math.sin(this.facing) * dashSpeed * dt);
      
      if (!this.dashHit) {
        this.dashHit = this._checkDashHit(game);
      }
      return;
    }

    if (this.state === 'recover') {
      if (this.stateTime >= this.def.recoverTime) {
        this.setState('chase');
        this.dashHit = false;
      }
      return;
    }

    if (this.meleeCycle(dt, game)) return;

    if (d > this.def.attackRange + player.hw && this.dashCooldown <= 0 && d <= this.def.dashRange) {
      this.setState('dashWindup');
      return;
    }

    const heading = this.steer(player, game.level, dt);
    const speed = this.def.speed;
    game.level.moveEntity(this, Math.cos(heading) * speed * dt, Math.sin(heading) * speed * dt);
  }

  _checkDashHit(game) {
    const player = game.player;
    const d = dist(this.x, this.y, player.x, player.y);
    if (d <= this.def.dashHitRadius + player.hw) {
      player.takeDamage(this.def.damage, Math.atan2(player.y - this.y, player.x - this.x), game);
      return true;
    }
    return false;
  }
}