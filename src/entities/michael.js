/**
 * michael.js — Himmelsthema Boss (Level 20)
 *
 * Boss: Wirft sein Schwert, teleportiert sich zum Schwert um es wieder aufzuheben
 * und verursacht beim aufheben Flaechenschaden
 * Werte fuer Normal: 7000 HP, 300 Schaden, 10000 XP, 3000 Gold
 */

import { COLORS } from '../config.js';
import { hasSprite, drawSprite } from '../gfx.js';
import { dist, clamp } from '../util.js';
import { Enemy } from './enemy.js';

export class Michael extends Enemy {
  constructor(x, y) {
    super('michael', x, y);
    this.animTime = Math.random() * 3;
    this.sword = null;
    this.swordCooldown = 0;
    this.teleportCooldown = 0;
    this.lastPhase = 1;
  }

  get phase() {
    const ratio = this.hp / this.maxHp;
    if (ratio > 0.5) return 1;
    if (ratio > 0.25) return 2;
    return 3;
  }

  think(dt, game) {
    const player = game.player;
    const d = dist(this.x, this.y, player.x, player.y);

    // Phasenwechsel
    if (this.phase !== this.lastPhase) {
      this.lastPhase = this.phase;
      if (typeof playSound === 'function') playSound('bossPhase');
      if (typeof game.shake === 'function') game.shake(10, 0.4);
      game.spawnDamageNumber(this.x, this.y - this.hh - 30, "Phase " + this.phase, COLORS.bossAccent, true);
    }

    // Aggro
    if (this.state === 'idle' && d <= this.def.aggroRadius && !player.dead) {
      this.setState('chase');
    }
    if (this.state === 'idle' || player.dead) return;

    this.facing = Math.atan2(player.y - this.y, player.x - this.x);
    this.swordCooldown = Math.max(0, this.swordCooldown - dt);
    this.teleportCooldown = Math.max(0, this.teleportCooldown - dt);

    // Schwertwurf-Angriff
    if (this.state === 'swordWindup') {
      if (this.stateTime >= this.def.swordWindupTime) {
        this._throwSword(game);
        this.setState('swordThrown');
      }
      return;
    }

    if (this.state === 'swordThrown') {
      // Warten bis Schwert zurueckkehrt oder Reichweite ueberschritten
      if (!this.sword || this.sword.returned || this.sword.dead) {
        this.sword = null;
        this.teleportCooldown = 0; // Sofort teleportieren
        this.setState('teleportToSword');
      }
      return;
    }

    // Teleport zum Schwert
    if (this.state === 'teleportToSword') {
      if (this.stateTime >= this.def.teleportTime) {
        this._teleportToSword(game);
        this.setState('swordPickup');
      }
      return;
    }

    if (this.state === 'swordPickup') {
      if (this.stateTime >= this.def.pickupTime) {
        this._createShockwave(game);
        this.setState('recover');
      }
      return;
    }

    if (this.state === 'recover') {
      if (this.stateTime >= this.def.recoverTime) {
        this.setState('chase');
        this.swordCooldown = this.def.swordCooldown;
      }
      return;
    }

    // Angriffsentscheidung
    if (this.state === 'chase') {
      // Schwertwurf (wenn Cooldown abgelaufen und Spieler in Reichweite)
      if (this.swordCooldown <= 0 && d <= this.def.range && d > this.def.minRange) {
        this.setState('swordWindup');
        return;
      }

      // Standard-Nahkampf
      if (d <= this.def.attackRange + player.hw) {
        this.setState('windup');
        return;
      }
    }

    // Bewegung
    const heading = this.steer(player, game.level, dt);
    const speed = this.def.speed * this._getPhaseSpeedFactor();
    game.level.moveEntity(this, Math.cos(heading) * speed * dt, Math.sin(heading) * speed * dt);
  }

  _getPhaseSpeedFactor() {
    switch (this.phase) {
      case 1: return 1;
      case 2: return 1.2;
      case 3: return 1.5;
      default: return 1;
    }
  }

  _throwSword(game) {
    const player = game.player;
    const angle = Math.atan2(player.y - this.y, player.x - this.x);
    
    // Schwert als Projektil erstellen
    this.sword = {
      x: this.x + Math.cos(angle) * this.hw * 2,
      y: this.y + Math.sin(angle) * this.hh * 2,
      vx: Math.cos(angle) * this.def.swordSpeed,
      vy: Math.sin(angle) * this.def.swordSpeed,
      damage: this.def.swordDamage,
      radius: 6,
      maxRange: this.def.swordRange,
      traveled: 0,
      returned: false,
      dead: false,
      update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.traveled += Math.abs(this.vx) * dt;
        
        // Pruefen ob Spieler-Treffer
        const player = game.player;
        const d = dist(this.x, this.y, player.x, player.y);
        if (d <= this.radius + player.hw) {
          player.takeDamage(this.damage, angle, game);
          this.returned = true; // Schwert kehrt zurueck
        }
        
        // Pruefen ob Reichweite ueberschritten
        if (this.traveled >= this.maxRange) {
          this.returned = true;
        }
        
        // Pruefen Wandkollision
        if (game.level.isBoxBlocked(this.x, this.y, this.radius, this.radius)) {
          this.returned = true;
        }
        
        // Wenn zurueckgerufen, zum Boss zurueckfliegen
        if (this.returned) {
          const toBossX = this.owner.x - this.x;
          const toBossY = this.owner.y - this.y;
          const distToBoss = Math.sqrt(toBossX * toBossX + toBossY * toBossY);
          if (distToBoss > 10) {
            const speed = this.def.swordReturnSpeed;
            this.x += (toBossX / distToBoss) * speed * dt;
            this.y += (toBossY / distToBoss) * speed * dt;
          } else {
            this.dead = true;
          }
        }
      },
      draw(ctx) {
        ctx.save();
        ctx.fillStyle = COLORS.gold;
        ctx.beginPath();
        ctx.ellipse(this.x, this.y, this.radius * 2, this.radius, Math.atan2(this.vy, this.vx), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      },
      owner: this
    };
    
    game.addProjectile(this.sword);
    if (typeof playSound === 'function') playSound('swordThrow');
  }

  _teleportToSword(game) {
    if (this.sword) {
      this.x = this.sword.x;
      this.y = this.sword.y;
      if (typeof playSound === 'function') playSound('teleport');
      if (typeof game.shake === 'function') game.shake(5, 0.2);
    }
  }

  _createShockwave(game) {
    // Flaechenschaden beim Aufheben des Schwerts
    const shockwave = {
      x: this.x,
      y: this.y,
      radius: 0,
      maxRadius: this.def.shockwaveRadius,
      damage: this.def.shockwaveDamage,
      update(dt) {
        this.radius += this.maxRadius * dt / this.def.shockwaveDuration;
        if (this.radius >= this.maxRadius) {
          this.dead = true;
        }
        
        // Schaden an alle Gegner in Reichweite
        const player = game.player;
        const d = dist(this.x, this.y, player.x, player.y);
        if (d <= this.radius + player.hw && !this.hit) {
          player.takeDamage(this.damage, 0, game);
          this.hit = true;
        }
      },
      draw(ctx) {
        ctx.save();
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = COLORS.gold;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    };
    shockwave.def = this.def;
    shockwave.hit = false;
    
    game.addEffect(shockwave);
    if (typeof playSound === 'function') playSound('shockwave');
  }

  drawBody(ctx) {
    // Boss-Skalierung (1.75x wie Ork-Haeuptling)
    const scale = 1.75;
    if (hasSprite(this.sprite)) {
      const s = this.def.sprite;
      const size = { w: s.w * scale, h: s.h * scale };
      drawSprite(ctx, this.sprite, this.x, this.y + s.offsetY, size.w, size.h, this.baseColor, {
        tint: this.state === 'windup' || this.state === 'strike' ? COLORS.enemyWindup : null,
        tintAlpha: 0.55,
        frame: Math.floor(this.animTime * 6),
        flipX: Math.cos(this.facing) < 0,
      });
      return;
    }
    super.drawBody(ctx);
  }
}