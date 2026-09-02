/**
 * drache.js  Boss, Luft (Etappe 1).
 *
 * "Fliegt und spuckt feuer auf den spieler, der drache landet nie und kann
 * nur mit fernangriffen getoetet werden."
 *
 * Drei Besonderheiten, die keinen bestehenden Gegner hat:
 *
 *   1. FLIEGEN: keine Wand-Kollision. Der Drache bewegt sich frei ueber die
 *      Karte, clamped nur an die Levelgrenzen. Kein steer/Pathfinding noetig.
 *
 *   2. FEUERATEM: 5 Feuerbaelle in einem Kegel. Jeder verursacht direkten
 *      Schaden und Verbrennung (BurnCloud).
 *
 *   3. NAHKAMPF-IMMUNITAET: Schwert und Speerstoss machen KEINEN Schaden.
 *      Nur Bogen und geworfener Speer (Fernkampf) treffen. Unterschieden
 *      wird am Abstand: Speer aus > 80 px ist ein Wurf (trifft), aus
 *      < 80 px ein Stoss (wird blockiert).
 */

import { COLORS, SPRITES } from '../config.js';
import { hasSprite, drawSprite, spriteSize } from '../gfx.js';
import { playSound } from '../audio.js';
import { clamp, degToRad, dist } from '../util.js';
import { Enemy } from './enemy.js';
import { Fireball } from './fireball.js';

/**
 * Bewegung ohne Wand-Kollision: der Drache fliegt ueber alles hinweg.
 * Nur die Levelgrenzen halten ihn auf.
 */
function flyMove(entity, dx, dy, level) {
  entity.x = clamp(entity.x + dx, entity.hw, level.pixelWidth - entity.hw);
  entity.y = clamp(entity.y + dy, entity.hh, level.pixelHeight - entity.hh);
}

export class Drache extends Enemy {
  constructor(x, y) {
    super('drache', x, y);
    this.animTime = Math.random() * 3;
    this.baseColor = COLORS.drache ?? '#aa3322';
    this.breathCooldown = 2.0;
    this.setState('chase');
  }

  /**
   * Nur Fernkampf-Schaden. Nahkampf (Schwert, Speerstoss) wird blockiert.
   * Das ist KEIN invulnerable-Getter: der Drache IST treffbar, nur nicht
   * mit jeder Waffe. So fliegt ein Pfeil nicht ins Leere  er trifft und
   * macht Schaden.
   */
  takeDamage(amount, fromAngle, knockback, game, crit = false, weapon = null) {
    if (this.dead) return;
    const player = game.player;
    const d = dist(this.x, this.y, player.x, player.y);
    const threshold = this.def.meleeThreshold ?? 80;

    if (weapon === 'sword') {
      // Schwert = Nahkampf = kein Schaden.
      game.spawnDamageNumber(this.x, this.y - this.hh - 6, 'Kein Schaden',
        COLORS.dracheAccent ?? '#ff6600');
      return;
    }
    if (weapon === 'spear' && d <= threshold) {
      // Speerstoss = Nahkampf = kein Schaden.
      game.spawnDamageNumber(this.x, this.y - this.hh - 6, 'Kein Schaden',
        COLORS.dracheAccent ?? '#ff6600');
      return;
    }
    // Bogen und geworfener Speer = Fernkampf = voller Schaden.
    super.takeDamage(amount, fromAngle, knockback, game, crit, weapon);
  }

  think(dt, game) {
    const player = game.player;
    if (player.dead) return;
    const d = dist(this.x, this.y, player.x, player.y);

    this.facing = Math.atan2(player.y - this.y, player.x - this.x);
    this.breathCooldown = Math.max(0, this.breathCooldown - dt);

    // --- Feueratem-Zyklus ---
    if (this.state === 'breathWindup') {
      this.facing = this._turnTowards(player, dt, 2.0);
      if (this.stateTime >= this.def.firebreath.windupTime) {
        this.breatheFire(game);
        this.setState('breathStrike');
      }
      return;
    }
    if (this.state === 'breathStrike') {
      if (this.stateTime >= this.def.firebreath.strikeTime) this.setState('breathRecover');
      return;
    }
    if (this.state === 'breathRecover') {
      if (this.stateTime >= this.def.firebreath.recoverTime) {
        this.breathCooldown = this.def.firebreath.cooldown;
        this.setState('chase');
      }
      return;
    }

    // --- Angriffswahl ---
    if (this.state === 'chase') {
      const fb = this.def.firebreath;
      if (this.breathCooldown <= 0 && d <= fb.maxRange && d >= 60) {
        this.setState('breathWindup');
        return;
      }
    }

    // --- Bewegung: direkt zum Spieler fliegen, keine Wand-Kollision ---
    // Abstand halten: nicht auf den Spieler drauf fliegen.
    const wantDist = 150;
    if (d > wantDist + 20) {
      const speed = this.def.speed * dt;
      flyMove(this, Math.cos(this.facing) * speed, Math.sin(this.facing) * speed, game.level);
    } else if (d < wantDist - 20) {
      // Etwas zurueckweichen.
      const speed = this.def.speed * 0.7 * dt;
      flyMove(this, -Math.cos(this.facing) * speed, -Math.sin(this.facing) * speed, game.level);
    }
    // sonst: schweben auf Abstand.
  }

  /** 5 Feuerbaelle in einem Kegel. */
  breatheFire(game) {
    const fb = this.def.firebreath;
    const spread = degToRad(fb.spreadDeg);
    const base = this.facing;
    for (let i = 0; i < fb.count; i++) {
      const t = fb.count === 1 ? 0 : (i / (fb.count - 1)) - 0.5;
      const a = base + t * spread;
      const mx = this.x + Math.cos(a) * (this.hw + 8);
      const my = this.y + Math.sin(a) * (this.hh + 8);
      game.arrows.push(new Fireball(mx, my, a, fb.damage, {
        speed: fb.speed,
        maxRange: fb.maxRange,
      }));
    }
    playSound('arrowHit', { volume: 0.5 });
    game.shake(4, 0.2);
  }

  // --- Zeichnen --------------------------------------------------------

  draw(ctx) {
    if (this.dead) {
      this.drawDeath(ctx);
      return;
    }
    // Schatten am Boden  der Drache fliegt, aber der Schatten zeigt, wo er ist.
    ctx.fillStyle = 'rgba(0,0,0,0.20)';
    ctx.beginPath();
    ctx.ellipse(Math.round(this.x), Math.round(this.y + this.hh + 8),
      this.hw * 0.7, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    if (this.state === 'breathWindup') this.drawBreathTelegraph(ctx);
    this.drawBody(ctx);
    this.drawHpBar(ctx);
  }

  drawBreathTelegraph(ctx) {
    const fb = this.def.firebreath;
    const p = clamp(this.stateTime / fb.windupTime, 0, 1);
    const spread = degToRad(fb.spreadDeg);
    const len = fb.maxRange * p;
    ctx.save();
    ctx.globalAlpha = 0.15 + 0.35 * p;
    ctx.fillStyle = COLORS.fireball ?? '#ff6600';
    ctx.translate(this.x, this.y);
    ctx.rotate(this.facing);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, len, -spread / 2, spread / 2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  drawBody(ctx) {
    if (hasSprite(this.sprite)) {
      const s = this.def.sprite;
      const size = spriteSize(this.sprite, s, SPRITES.scale?.[this.type] ?? 1);
      const tint = this.hitFlash > 0
        ? COLORS.enemyHit
        : (this.state === 'breathWindup' || this.state === 'breathStrike')
          ? COLORS.enemyWindup : null;
      drawSprite(ctx, this.sprite, this.x, this.y + s.offsetY, size.w, size.h,
        this.baseColor, { tint, tintAlpha: 0.6 });
      return;
    }
    // Platzhalter: grosser Drache mit Fluegeln.
    const s = this.def.sprite;
    const grow = 1 + (this.state === 'breathWindup' ? 0.1 * this.windupProgress : 0);
    const w = s.w * grow;
    const h = s.h * grow;
    const cy = this.y + s.offsetY;

    let fill = this.baseColor;
    if (this.state === 'breathWindup' || this.state === 'breathStrike') fill = COLORS.enemyWindup;
    if (this.hitFlash > 0) fill = COLORS.enemyHit;

    ctx.save();
    ctx.fillStyle = fill;
    ctx.fillRect(Math.round(this.x - w / 2), Math.round(cy - h / 2), Math.round(w), Math.round(h));
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.lineWidth = 2;
    ctx.strokeRect(Math.round(this.x - w / 2) + 1, Math.round(cy - h / 2 + 1),
      Math.round(w) - 2, Math.round(h) - 2);
    // Fluegel  schlagen langsam.
    ctx.fillStyle = COLORS.dracheAccent ?? '#ff6600';
    const wingFlap = Math.sin(this.animTime * 8) * 4;
    ctx.fillRect(Math.round(this.x - w / 2 - 10), Math.round(cy - h / 3 + wingFlap),
      10, Math.round(h / 2));
    ctx.fillRect(Math.round(this.x + w / 2), Math.round(cy - h / 3 - wingFlap),
      10, Math.round(h / 2));
    // Augen.
    const ex = Math.cos(this.facing) * 5;
    const ey = Math.sin(this.facing) * 3;
    ctx.fillStyle = '#1a0a0a';
    ctx.fillRect(Math.round(this.x - 8 + ex), Math.round(cy - 6 + ey), 5, 4);
    ctx.fillRect(Math.round(this.x + 3 + ex), Math.round(cy - 6 + ey), 5, 4);
    ctx.restore();
  }

  drawHpBar(ctx) {
    super.drawHpBar(ctx);
    if (this.dead) return;
    ctx.save();
    ctx.fillStyle = COLORS.dracheAccent ?? '#ff6600';
    ctx.font = '10px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Boss', Math.round(this.x), Math.round(this.y - this.hh - 16));
    ctx.restore();
  }
}
