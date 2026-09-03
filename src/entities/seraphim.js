/**
 * seraphim.js — Himmelsthema Monster (Level 16-20)
 *
 * Fernkaempfer: Schiesst einen grossen Lichtstrahl auf den Spieler
 * Werte fuer Normal: 2000 HP, 200 Schaden, 3500 XP, 1100-1300 Gold
 */

import { COLORS } from '../config.js';
import { hasSprite } from '../gfx.js';
import { dist } from '../util.js';
import { Enemy } from './enemy.js';

export class Seraphim extends Enemy {
  constructor(x, y) {
    super('seraphim', x, y);
    this.animTime = Math.random() * 3;
    this.beamCooldown = 0;
    this.beam = null;
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
    this.beamCooldown = Math.max(0, this.beamCooldown - dt);

    // Lichtstrahl-Angriff
    if (this.state === 'windup') {
      if (this.stateTime >= this.def.windupTime) {
        this._fireLightBeam(game);
        this.setState('strike');
      }
      return;
    }

    if (this.state === 'strike') {
      if (this.stateTime >= this.def.strikeTime) {
        this.setState('recover');
      }
      return;
    }

    if (this.state === 'recover') {
      if (this.stateTime >= this.def.recoverTime) {
        this.setState('chase');
      }
      return;
    }

    // Angriffsbereit? (nur mit freier Sicht)
    const hasLineOfSight = game.level.isPathClear(this.x, this.y, player.x, player.y, 4, 4);
    if (this.beamCooldown <= 0 && d <= this.def.range && hasLineOfSight) {
      this.setState('windup');
      return;
    }

    // Bewegung
    const heading = this.steer(player, game.level, dt);
    const speed = this.def.speed;
    game.level.moveEntity(this, Math.cos(heading) * speed * dt, Math.sin(heading) * speed * dt);
  }

  _fireLightBeam(game) {
    const player = game.player;
    const angle = Math.atan2(player.y - this.y, player.x - this.x);
    
    // Lichtstrahl als Projektil erstellen
    this.beam = {
      x: this.x + Math.cos(angle) * this.hw * 2,
      y: this.y + Math.sin(angle) * this.hh * 2,
      vx: Math.cos(angle) * this.def.projectileSpeed,
      vy: Math.sin(angle) * this.def.projectileSpeed,
      damage: this.def.damage,
      radius: 4,
      maxRange: this.def.range,
      traveled: 0,
      update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.traveled += Math.abs(this.vx) * dt;
        
        // Pruefen ob Spielertreffer
        const player = game.player;
        const d = dist(this.x, this.y, player.x, player.y);
        if (d <= this.radius + player.hw) {
          player.takeDamage(this.damage, angle, game);
          this.dead = true;
        }
        
        // Pruefen ob Reichweite ueberschritten
        if (this.traveled >= this.maxRange) {
          this.dead = true;
        }
        
        // Pruefen Wandkollision
        if (game.level.isBoxBlocked(this.x, this.y, this.radius, this.radius)) {
          this.dead = true;
        }
      },
      draw(ctx) {
        ctx.save();
        ctx.fillStyle = COLORS.gold;
        ctx.beginPath();
        ctx.ellipse(this.x, this.y, this.radius * 2, this.radius, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    };
    
    game.addProjectile(this.beam);
    this.beamCooldown = this.def.attackCooldown;
  }
}