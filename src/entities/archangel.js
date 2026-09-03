/**
 * archangel.js — Himmelsthema Monster (Level 16-20)
 *
 * Nahkaempfer: Schlaegt drei mal auf den Spieler ein und teleportiert sich 150px,
 * heilt sich, falls er Schaden erlitten hat und teleportiert sich hinter den Spieler
 * Werte fuer Normal: 3000 HP, 250 Schaden, 4500 XP, 1700-1900 Gold
 */

import { COLORS } from '../config.js';
import { hasSprite } from '../gfx.js';
import { dist } from '../util.js';
import { Enemy } from './enemy.js';

export class Archangel extends Enemy {
  constructor(x, y) {
    super('archangel', x, y);
    this.animTime = Math.random() * 3;
    this.comboCount = 0;
    this.teleportCooldown = 0;
    this.healCooldown = 0;
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
    this.teleportCooldown = Math.max(0, this.teleportCooldown - dt);
    this.healCooldown = Math.max(0, this.healCooldown - dt);

    // Teleport hinter den Spieler
    if (this.state === 'teleportWindup') {
      if (this.stateTime >= this.def.teleportWindupTime) {
        this._teleportBehindPlayer(game);
        this.setState('chase');
      }
      return;
    }

    // Heilung (wenn Leben unter 50% und Cooldown abgelaufen)
    if (this.hp < this.maxHp * 0.5 && this.healCooldown <= 0 && Math.random() < 0.01) {
      this._heal(game);
      this.healCooldown = this.def.healCooldown;
    }

    // Combo-Nahkampf
    if (this.state === 'windup') {
      if (this.stateTime >= this.def.windupTime) {
        this._resolveStrike(game);
        this.comboCount++;
        this.setState('strike');
      }
      return;
    }

    if (this.state === 'strike') {
      if (this.stateTime >= this.def.strikeTime) {
        // Nach dem 3. Schlag: Teleport
        if (this.comboCount >= 3 && this.teleportCooldown <= 0) {
          this.comboCount = 0;
          this.setState('teleportWindup');
          this.teleportCooldown = this.def.teleportCooldown;
        } else {
          this.setState('recover');
        }
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
    if (d <= this.def.attackRange + player.hw) {
      this.setState('windup');
      this.comboCount = 0;
      return;
    }

    // Bewegung
    const heading = this.steer(player, game.level, dt);
    const speed = this.def.speed;
    game.level.moveEntity(this, Math.cos(heading) * speed * dt, Math.sin(heading) * speed * dt);
  }

  _teleportBehindPlayer(game) {
    const player = game.player;
    const offset = 150;
    const angle = Math.atan2(player.y - this.y, player.x - this.x);
    const newX = player.x - Math.cos(angle) * offset;
    const newY = player.y - Math.sin(angle) * offset;
    
    // Pruefen ob Position frei ist
    if (game.level.isPathClear(this.x, this.y, newX, newY, this.hw, this.hh)) {
      this.x = newX;
      this.y = newY;
    }
  }

  _heal(game) {
    const healAmount = this.def.healAmount;
    this.hp = Math.min(this.maxHp, this.hp + healAmount);
    // Visueller Effekt
    game.spawnDamageNumber(this.x, this.y - this.hh - 16, "+" + Math.round(healAmount), COLORS.heal, false);
  }
}