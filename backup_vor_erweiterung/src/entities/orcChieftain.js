/**
 * orcChieftain.js — Boss aus Level 5 (Abschnitt 6).
 *
 * Drei Phasen mit unterschiedlichen Mustern, umgeschaltet ueber sein Leben:
 *
 *   Phase 1 (100–66 %)  nur der weite Schwung — man lernt sein Timing.
 *   Phase 2 (66–33 %)   zusaetzlich der Ansturm: er holt aus und stuermt geradeaus.
 *   Phase 3 (unter 33 %) zusaetzlich der Bodenstampfer im Umkreis, und er wird
 *                        schneller und ungeduldiger.
 *
 * Jeder Angriff behaelt die sichtbare Ausholphase (>= 0,4 s) aus der
 * Fairness-Regel — beim Ansturm zeigt eine Linie sogar die Richtung an.
 */

import { COLORS } from '../config.js';
import { hasSprite } from '../gfx.js';
import { playSound } from '../audio.js';
import { clamp, dist } from '../util.js';
import { Enemy } from './enemy.js';

export class OrcChieftain extends Enemy {
  constructor(x, y) {
    super('orcChieftain', x, y);
    this.chargeCooldown = this.def.charge.cooldown * 0.5;
    this.slamCooldown = this.def.slam.cooldown * 0.5;
    this.chargeAngle = 0;
    this.chargeHit = false;
    this.lastPhase = 1;
  }

  /** 1, 2 oder 3 — haengt am verbleibenden Leben. */
  get phase() {
    const ratio = this.hp / this.maxHp;
    const [t1, t2] = this.def.phaseThresholds;
    if (ratio > t1) return 1;
    if (ratio > t2) return 2;
    return 3;
  }

  get speedFactor() {
    return this.phase === 3 ? this.def.phase3SpeedFactor : 1;
  }

  think(dt, game) {
    const player = game.player;
    const d = dist(this.x, this.y, player.x, player.y);

    // Phasenwechsel: kurze Pause und ein sichtbares Bruellen.
    if (this.phase !== this.lastPhase) {
      this.lastPhase = this.phase;
      this.chargeCooldown = Math.min(this.chargeCooldown, 1.2);
      this.slamCooldown = Math.min(this.slamCooldown, 1.6);
      playSound('bossPhase');
      game.shake(7, 0.35);
      game.spawnDamageNumber(this.x, this.y - this.hh - 20, `Phase ${this.phase}`, COLORS.bossAccent, true);
    }

    if (this.state === 'idle' && d <= this.def.aggroRadius && !player.dead) {
      this.setState('chase');
    }
    if (this.state === 'idle' || player.dead) return;

    this.chargeCooldown = Math.max(0, this.chargeCooldown - dt);
    this.slamCooldown = Math.max(0, this.slamCooldown - dt);

    if (this.updateCharge(dt, game, d)) return;
    if (this.updateSlam(dt, game)) return;

    // Zurueckweichen, um Anlauf zu holen — sonst bliebe der Ansturm ungenutzt,
    // solange der Spieler im Nahkampf bleibt.
    if (this.state === 'backOff') {
      const c = this.def.charge;
      this.facing = Math.atan2(player.y - this.y, player.x - this.x);
      const away = this.facing + Math.PI;
      const speed = this.def.speed * this.speedFactor;
      const hit = game.level.moveEntity(this,
        Math.cos(away) * speed * dt, Math.sin(away) * speed * dt);
      const readyToCharge = d > c.minRange
        && game.level.isPathClear(this.x, this.y, player.x, player.y, this.hw, this.hh);
      if (readyToCharge) this.setState('chargeWindup');
      // In der Ecke oder zu lange gebraucht? Dann eben wieder normal angreifen.
      else if (hit.hitX || hit.hitY || this.stateTime > 1.6) this.setState('chase');
      return;
    }

    // Sonderangriffe anstossen, sobald sie bereit sind.
    if (this.state === 'chase') {
      const c = this.def.charge;
      if (this.phase >= 2 && this.chargeCooldown <= 0 && d < c.maxRange) {
        if (d > c.minRange
          && game.level.isPathClear(this.x, this.y, player.x, player.y, this.hw, this.hh)) {
          this.setState('chargeWindup');
          return;
        }
        if (d <= c.minRange) {
          this.setState('backOff');
          return;
        }
      }
      if (this.phase >= 3 && this.slamCooldown <= 0 && d <= this.def.slam.radius) {
        this.setState('slamWindup');
        return;
      }
    }

    // Standard: weiter Schwung wie beim Panzer-Ork, nur haerter.
    if (this.meleeCycle(dt, game)) return;

    this.facing = Math.atan2(player.y - this.y, player.x - this.x);
    const heading = this.steer(player, game.level, dt);
    const speed = this.def.speed * this.speedFactor;
    game.level.moveEntity(this, Math.cos(heading) * speed * dt, Math.sin(heading) * speed * dt);
  }

  /** Ansturm (Phase 2+): ausholen, dann geradeaus rennen. */
  updateCharge(dt, game, _d) {
    const c = this.def.charge;
    const player = game.player;

    if (this.state === 'chargeWindup') {
      // Beim Ausholen noch leicht nachdrehen, dann ist die Richtung fest.
      this.facing = this._turnTowards(player, dt, 1.6);
      if (this.stateTime >= c.windupTime) {
        this.chargeAngle = this.facing;
        this.chargeHit = false;
        this.setState('charging');
      }
      return true;
    }

    if (this.state === 'charging') {
      const step = c.speed * this.speedFactor * dt;
      const hit = game.level.moveEntity(this,
        Math.cos(this.chargeAngle) * step, Math.sin(this.chargeAngle) * step);

      // Unterwegs trifft er alles, was im Weg steht — aber nur einmal.
      if (!this.chargeHit && dist(this.x, this.y, player.x, player.y) <= c.radius + player.hw) {
        this.chargeHit = true;
        const angle = Math.atan2(player.y - this.y, player.x - this.x);
        player.takeDamage(c.damage, angle, game);
      }

      // Gegen eine Wand gerannt: kurze Benommenheit — das Fenster zum Zuschlagen.
      if (hit.hitX || hit.hitY) {
        game.shake(8, 0.3);
        this.chargeCooldown = c.cooldown;
        this.setState('stunned');
        return true;
      }
      if (this.stateTime >= c.duration) {
        this.chargeCooldown = c.cooldown;
        this.setState('recover');
      }
      return true;
    }

    if (this.state === 'stunned') {
      if (this.stateTime >= 1.2) this.setState('chase');
      return true;
    }
    return false;
  }

  /** Bodenstampfer (Phase 3): trifft rundum, auch hinter ihm. */
  updateSlam(dt, game) {
    const s = this.def.slam;

    if (this.state === 'slamWindup') {
      if (this.stateTime >= s.windupTime) {
        this._resolveStrike(game, { radius: s.radius, damage: s.damage, arc: 360 });
        game.shake(10, 0.4);
        this.slamCooldown = s.cooldown;
        this.setState('slamRecover');
      }
      return true;
    }
    if (this.state === 'slamRecover') {
      if (this.stateTime >= s.recoverTime) this.setState('chase');
      return true;
    }
    return false;
  }

  /** Phase 3 macht die Erholung nach dem Schwung kuerzer. */
  meleeCycle(dt, game) {
    if (this.state === 'recover' && this.phase === 3) {
      if (this.stateTime >= this.def.recoverTime * this.def.phase3RecoverFactor) {
        this.setState('chase');
        return true;
      }
    }
    return super.meleeCycle(dt, game);
  }

  /** Jeder Angriff bekommt seine eigene Warnung. */
  draw(ctx) {
    if (this.dead) {
      this.drawDeath(ctx);
      return;
    }
    ctx.fillStyle = 'rgba(0,0,0,0.32)';
    ctx.beginPath();
    ctx.ellipse(Math.round(this.x), Math.round(this.y + this.hh), this.hw * 0.85, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    if (this.state === 'windup') this.drawTelegraph(ctx);
    if (this.state === 'chargeWindup') this.drawChargeTelegraph(ctx);
    if (this.state === 'slamWindup') this.drawSlamTelegraph(ctx);

    this.drawBody(ctx);
    // Der Boss traegt seine Leiste oben am Bildschirm (hud.js), nicht ueber dem Kopf.
  }

  drawChargeTelegraph(ctx) {
    const c = this.def.charge;
    const p = clamp(this.stateTime / c.windupTime, 0, 1);
    const len = c.speed * c.duration * p;
    ctx.save();
    ctx.globalAlpha = 0.15 + 0.35 * p;
    ctx.fillStyle = COLORS.enemyWindup;
    ctx.translate(this.x, this.y);
    ctx.rotate(this.facing);
    ctx.fillRect(0, -c.radius, len, c.radius * 2);
    ctx.restore();
  }

  drawSlamTelegraph(ctx) {
    const s = this.def.slam;
    const p = clamp(this.stateTime / s.windupTime, 0, 1);
    ctx.save();
    ctx.globalAlpha = 0.12 + 0.3 * p;
    ctx.fillStyle = COLORS.enemyWindup;
    ctx.beginPath();
    ctx.arc(this.x, this.y, s.radius * p, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.5 + 0.5 * p;
    ctx.strokeStyle = COLORS.bossAccent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(this.x, this.y, s.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  /** Platzhalter: breite Gestalt mit Helmkamm, faerbt sich je Phase. */
  drawBody(ctx) {
    if (hasSprite(this.sprite)) {
      super.drawBody(ctx);
      return;
    }
    const s = this.def.sprite;
    const attacking = ['windup', 'strike', 'chargeWindup', 'charging', 'slamWindup'].includes(this.state);
    const grow = 1 + this.windupProgress * 0.12 + (this.state === 'charging' ? 0.15 : 0);
    const w = s.w * grow;
    const h = s.h * grow;
    const cy = this.y + s.offsetY;

    let fill = this.baseColor;
    if (attacking) fill = COLORS.enemyWindup;
    if (this.state === 'stunned') fill = '#5a4a44';
    if (this.hitFlash > 0) fill = COLORS.enemyHit;

    ctx.save();
    ctx.fillStyle = fill;
    ctx.fillRect(Math.round(this.x - w / 2), Math.round(cy - h / 2), Math.round(w), Math.round(h));
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.lineWidth = 2;
    ctx.strokeRect(Math.round(this.x - w / 2) + 1, Math.round(cy - h / 2) + 1,
      Math.round(w) - 2, Math.round(h) - 2);

    // Helmkamm: ein Streifen pro Phase — man sieht den Fortschritt am Gegner.
    ctx.fillStyle = COLORS.bossAccent;
    for (let i = 0; i < this.phase; i++) {
      ctx.fillRect(Math.round(this.x - 9 + i * 8), Math.round(cy - h / 2 - 6), 5, 6);
    }

    // Augen
    const ex = Math.cos(this.facing) * 5;
    const ey = Math.sin(this.facing) * 3;
    ctx.fillStyle = this.state === 'stunned' ? '#d9d2c0' : '#1a0f0c';
    ctx.fillRect(Math.round(this.x - 8 + ex), Math.round(cy - 6 + ey), 5, 4);
    ctx.fillRect(Math.round(this.x + 3 + ex), Math.round(cy - 6 + ey), 5, 4);
    ctx.restore();
  }
}
