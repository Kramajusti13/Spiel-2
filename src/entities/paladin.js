/**
 * paladin.js â Nahkaempfer mit Ansturm und Selbstheilung (Etappe 1).
 *
 * "Rennt schnell auf einen zu, laedt seinen Hammer auf, um daraufhin doppelten
 * Schaden zu machen. Heilt sich ab und zu."
 *
 * Drei Verhaltensweisen, gewaehlt nach Abstand und Zustand:
 *   < 44 px:    Nahkampf (Hammer)
 *   100-400 px: Ansturm (charge) â sichtbare Vorwarnung, dann schnelle
 *               Bewegung auf den Spieler zu, doppelten Schaden beim Treffer.
 *   < 50 % HP:  Selbstheilung â kurzes Ausholen, dann Heilung. Cooldown 8 s.
 */

import { COLORS } from '../config.js';
import { hasSprite } from '../gfx.js';
import { playSound } from '../audio.js';
import { clamp, dist } from '../util.js';
import { Enemy } from './enemy.js';

export class Paladin extends Enemy {
  constructor(x, y) {
    super('paladin', x, y);
    this.animTime = Math.random() * 3;
    this.baseColor = COLORS.paladin ?? '#d4a838';
    this.chargeCooldown = (this.def.charge?.cooldown ?? 5.0) * 0.5;
    this.healCooldown = this.def.heal?.cooldown ?? 8.0;
    this.chargeAngle = 0;
    this.chargeHit = false;
  }

  think(dt, game) {
    const player = game.player;
    const d = dist(this.x, this.y, player.x, player.y);

    if (this.state === 'idle' && d <= this.def.aggroRadius && !player.dead) {
      this.setState('chase');
    } else if (this.state === 'chase' && (d > this.def.loseAggroRadius || player.dead)) {
      this.setState('idle');
    }
    if (this.state === 'idle' || player.dead) return;

    this.chargeCooldown = Math.max(0, this.chargeCooldown - dt);
    this.healCooldown = Math.max(0, this.healCooldown - dt);

    // --- Heilung (hoechste Prioritaet, wenn HP niedrig) ---
    if (this.updateHeal(dt, game)) return;

    // --- Ansturm ---
    if (this.updateCharge(dt, game, d)) return;
    // --- Nahkampf ---
    if (this.updateMelee(dt, game, d)) return;

    // --- Angriffswahl ---
    if (this.state === 'chase') {
      // Nah genugz? Zuschlagen.
      if (d <= this.def.attackRange + player.hw) {
        this.setState('windup');
        this.struck = false;
        return;
      }
      // In Ansturm-Reichweite?
      const c = this.def.charge;
      if (c && this.chargeCooldown <= 0 && d >= c.minRange && d <= c.maxRange
        && game.level.isPathClear(this.x, this.y, player.x, player.y, this.hw, this.hh)) {
        this.setState('chargeWindup');
        return;
      }
      // Heilung, wenn HP < 50 % und bereit?
      const h = this.def.heal;
      if (h && this.healCooldown <= 0 && this.hp < this.maxHp * 0.5) {
        this.setState('healWindup');
        return;
      }
    }

    // Verfolgen.
    this.facing = Math.atan2(player.y - this.y, player.x - this.x);
    const heading = this.steer(player, game.level, dt);
    game.level.moveEntity(this,
      Math.cos(heading) * this.def.speed * dt,
      Math.sin(heading) * this.def.speed * dt);
  }

  // --- Nahkampf --------------------------------------------------------

  updateMelee(_dt, game) {
    if (this.state === 'windup') {
      if (this.stateTime >= this.def.windupTime) {
        this._resolveStrike(game, { arc: this.def.strikeArc, radius: this.def.strikeRadius });
        this.setState('strike');
      }
      return true;
    }
    if (this.state === 'strike') {
      if (this.stateTime >= this.def.strikeTime) this.setState('recover');
      return true;
    }
    if (this.state === 'recover') {
      if (this.stateTime >= this.def.recoverTime) this.setState('chase');
      return true;
    }
    return false;
  }

  // --- Ansturm ---------------------------------------------------------

  updateCharge(dt, game, _d) {
    const c = this.def.charge;
    if (!c) return false;
    const player = game.player;

    if (this.state === 'chargeWindup') {
      this.facing = this._turnTowards(player, dt, 1.6);
      if (this.stateTime >= c.windupTime) {
        this.chargeAngle = this.facing;
        this.chargeHit = false;
        this.setState('charging');
      }
      return true;
    }

    if (this.state === 'charging') {
      const step = c.speed * dt;
      const hit = game.level.moveEntity(this,
        Math.cos(this.chargeAngle) * step, Math.sin(this.chargeAngle) * step);

      if (!this.chargeHit && dist(this.x, this.y, player.x, player.y) <= c.radius + player.hw) {
        this.chargeHit = true;
        const angle = Math.atan2(player.y - this.y, player.x - this.x);
        player.takeDamage(c.damage, angle, game);
        game.shake(5, 0.2);
      }

      if (hit.hitX || hit.hitY) {
        game.shake(6, 0.25);
        this.chargeCooldown = c.cooldown;
        this.setState('recover');
        return true;
      }
      if (this.stateTime >= c.duration) {
        this.chargeCooldown = c.cooldown;
        this.setState('recover');
      }
      return true;
    }
    return false;
  }

  // --- Selbstheilung ---------------------------------------------------

  updateHeal(_dt, game) {
    const h = this.def.heal;
    if (!h) return false;

    if (this.state === 'healWindup') {
      if (this.stateTime >= h.windupTime) {
        const amount = Math.min(h.amount, this.maxHp - this.hp);
        this.hp = clamp(this.hp + amount, 0, this.maxHp);
        this.healCooldown = h.cooldown;
        playSound('skillPoint');
        game.spawnDamageNumber(this.x, this.y - this.hh - 10,
          '+' + amount, COLORS.paladinAccent ?? '#ffd700', true);
        game.spawnHitSpark(ithis.x, this.y, 0));
        this.setState('healRecover');
      }
      return true;
    }
    if (this.state === 'healRecover') {
      if (this.stateTime >= 0.5) this.setState('chase');
      return true;
    }
    return false;
  }

  // --- Zeichnen -------------------------------------------------------

  draw(ctx) {
    if (this.dead) { this.drawDeath(ctx); return; }
    ctx.fillStyle = 'rgba(0,0,0,0.30)';
    ctx.beginPath();
    ctx.ellipse(Math.round(this.x), Math.round(this.y + this.hh), this.hw * 0.8, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    if (this.state === 'windup') this.drawTelegraph(ctx);
    if (this.state === 'chargeWindup') this.drawChargeTelegraph(ctx);
    if (this.facing) * 3);
    const ey = Math.sin(this.facing) * 2;
    ctx.fillStyle = '#1a1a0a';
    ctx.fillRect(Math.round(this.x - 5 + ex), Math.round(cy - 5 + ey), 3, 3);
    ctx.fillRect(Math.round(this.x + 2 + ex), Math.round(cy - 5 + ey), 3, 3);
    ctx.restore();
  }
}
