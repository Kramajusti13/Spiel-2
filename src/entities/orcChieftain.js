/**
 * orcChieftain.js — Boss aus Level 5 (VERBESSERUNGEN_1 Abschnitt 7).
 *
 * Drei Phasen mit Angriffswahl nach ABSTAND (nicht mehr nach fester
 * Reihenfolge):
 *
 *   Phase 1 (100 – 66 %)  Axtschlag (< 80 px) und Ansturm (150–400 px).
 *   Phase 2 (66 – 33 %)   dazu Kriegsruf (> 400 px, alle 12 s, ruft 2 Goblins,
 *                         max. 4 gleichzeitig).
 *   Phase 3 (unter 33 %)  Wutmodus: sichtbares Bruellen (1 s Stillstand als
 *                         Vorwarnung), danach +30 % Tempo und der Axtschlag
 *                         wird zum Doppelschlag (2 x 35). Kein Kriegsruf mehr.
 *
 * Jeder Angriff behaelt die sichtbare Ausholphase (>= 0,4 s) aus der
 * Fairness-Regel — beim Ansturm zeigt eine Linie sogar die Richtung an,
 * beim Kriegsruf ein pulsierender Ring.
 */

import { COLORS } from '../config.js';
import { hasSprite } from '../gfx.js';
import { playSound } from '../audio.js';
import { clamp, dist } from '../util.js';
import { Enemy } from './enemy.js';
import { createEnemy } from './enemies.js';

export class OrcChieftain extends Enemy {
  constructor(x, y) {
    super('orcChieftain', x, y);
    this.chargeCooldown = this.def.charge.cooldown * 0.5;
    this.kriegsrufCooldown = this.def.kriegsruf.cooldown * 0.5;
    this.chargeAngle = 0;
    this.chargeHit = false;
    this.lastPhase = 1;
    /** true, sobald das Bruellen zu Beginn von Phase 3 gelaufen ist. */
    this.wutIntroDone = false;
    /** Zaehlt Treffer in der aktuellen Nahkampf-Kombo (fuer Doppelschlag). */
    this.hitsInCombo = 0;
  }

  /** 1, 2 oder 3 — haengt am verbleibenden Leben. */
  get phase() {
    const ratio = this.hp / this.maxHp;
    const [t1, t2] = this.def.phaseThresholds;
    if (ratio > t1) return 1;
    if (ratio > t2) return 2;
    return 3;
  }

  /** Nur im Wutmodus (Phase 3 nach Bruellen) legt er zu. */
  get speedFactor() {
    return this.phase === 3 && this.wutIntroDone ? this.def.wutmodus.speedFactor : 1;
  }

  /** Doppelschlag: nur in Phase 3 nach abgeschlossenem Bruellen. */
  get wutmodusActive() {
    return this.phase === 3 && this.wutIntroDone;
  }

  think(dt, game) {
    const player = game.player;
    const d = dist(this.x, this.y, player.x, player.y);

    // --- Phasenwechsel ---
    if (this.phase !== this.lastPhase) {
      const wechseltInPhase3 = this.phase === 3;
      this.lastPhase = this.phase;
      this.chargeCooldown = Math.min(this.chargeCooldown, 1.0);
      this.kriegsrufCooldown = Math.min(this.kriegsrufCooldown, 2.0);
      playSound('bossPhase');
      game.shake(7, 0.35);
      game.spawnDamageNumber(this.x, this.y - this.hh - 20, `Phase ${this.phase}`,
        COLORS.bossAccent, true);
      // Phase 3 -> sichtbares Bruellen als Vorwarnung.
      if (wechseltInPhase3) {
        this.wutIntroDone = false;
        this.setState('wutIntro');
        game.shake(10, 0.45);
        game.spawnDamageNumber(this.x, this.y - this.hh - 34, 'WUTMODUS',
          COLORS.bossAccent, true);
        return;
      }
    }

    // --- Wutmodus-Intro: 1 s Stillstand ---
    if (this.state === 'wutIntro') {
      if (this.stateTime >= this.def.wutmodus.introTime) {
        this.wutIntroDone = true;
        this.setState('chase');
      }
      return;
    }

    if (this.state === 'idle' && d <= this.def.aggroRadius && !player.dead) {
      this.setState('chase');
    }
    if (this.state === 'idle' || player.dead) return;

    this.chargeCooldown = Math.max(0, this.chargeCooldown - dt);
    this.kriegsrufCooldown = Math.max(0, this.kriegsrufCooldown - dt);

    // --- Laufende Sonderangriffe zuerst abarbeiten ---
    if (this.updateCharge(dt, game, d)) return;
    if (this.updateKriegsruf(dt, game)) return;
    if (this.updateMelee(dt, game, d)) return;

    // --- Angriffswahl nach Abstand ---
    if (this.state === 'chase' || this.state === 'closeIn') {
      // < 80 px: Axtschlag
      if (d <= this.def.attackRange + player.hw) {
        this.setState('windup');
        this.struck = false;
        this.hitsInCombo = 0;
        return;
      }
      // 150-400 px: Ansturm
      const c = this.def.charge;
      if (this.chargeCooldown <= 0 && d >= c.minRange && d <= c.maxRange
        && game.level.isPathClear(this.x, this.y, player.x, player.y, this.hw, this.hh)) {
        this.setState('chargeWindup');
        return;
      }
      // > 400 px UND Phase 2 (in Phase 3 gibt es keinen Kriegsruf mehr):
      const k = this.def.kriegsruf;
      if (this.phase === 2 && d > k.distanceThreshold && this.kriegsrufCooldown <= 0) {
        this.setState('kriegsrufWindup');
        return;
      }
    }

    // Sonst: dem Spieler hinterher.
    this.facing = Math.atan2(player.y - this.y, player.x - this.x);
    const heading = this.steer(player, game.level, dt);
    const speed = this.def.speed * this.speedFactor;
    game.level.moveEntity(this, Math.cos(heading) * speed * dt, Math.sin(heading) * speed * dt);
  }

  // --- Nahkampf / Axtschlag (inkl. Doppelschlag im Wutmodus) ------------

  updateMelee(_dt, game) {
    if (this.state === 'windup') {
      if (this.stateTime >= this.def.windupTime) {
        this._resolveStrike(game, { arc: this.def.strikeArc, radius: this.def.strikeRadius });
        this.hitsInCombo++;
        this.setState('strike');
      }
      return true;
    }
    if (this.state === 'strike') {
      if (this.stateTime >= this.def.strikeTime) {
        // Doppelschlag im Wutmodus: direkt in einen kurzen Folge-Windup.
        if (this.wutmodusActive && this.hitsInCombo < 2) {
          this.setState('doppelschlagWindup');
        } else {
          this.setState('recover');
        }
      }
      return true;
    }
    if (this.state === 'doppelschlagWindup') {
      if (this.stateTime >= this.def.wutmodus.doppelschlagWindup) {
        this._resolveStrike(game, { arc: this.def.strikeArc, radius: this.def.strikeRadius });
        this.hitsInCombo++;
        this.setState('strike');
      }
      return true;
    }
    if (this.state === 'recover') {
      if (this.stateTime >= this.def.recoverTime) {
        this.hitsInCombo = 0;
        this.setState('chase');
      }
      return true;
    }
    return false;
  }

  // --- Ansturm ----------------------------------------------------------

  updateCharge(dt, game, _d) {
    const c = this.def.charge;
    const player = game.player;

    if (this.state === 'chargeWindup') {
      // Beim Ausholen noch leicht nachdrehen — danach ist die Richtung fest.
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

      if (!this.chargeHit && dist(this.x, this.y, player.x, player.y) <= c.radius + player.hw) {
        this.chargeHit = true;
        const angle = Math.atan2(player.y - this.y, player.x - this.x);
        player.takeDamage(c.damage, angle, game);
      }

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

  // --- Kriegsruf (Phase 2) ---------------------------------------------

  updateKriegsruf(_dt, game) {
    if (this.state === 'kriegsrufWindup') {
      const k = this.def.kriegsruf;
      if (this.stateTime >= k.windupTime) {
        this.spawnGoblins(game);
        this.kriegsrufCooldown = k.cooldown;
        game.shake(6, 0.3);
        game.spawnDamageNumber(this.x, this.y - this.hh - 20, 'Kriegsruf!',
          COLORS.bossAccent, true);
        this.setState('kriegsrufRecover');
      }
      return true;
    }
    if (this.state === 'kriegsrufRecover') {
      if (this.stateTime >= this.def.kriegsruf.recoverTime) this.setState('chase');
      return true;
    }
    return false;
  }

  /**
   * Ruft bis zu goblinCount Goblins herbei — hoechstens so viele, dass die
   * Gesamtzahl der von diesem Boss gerufenen Goblins maxAlive nicht ueberschreitet.
   */
  spawnGoblins(game) {
    const k = this.def.kriegsruf;
    const alive = game.enemies.filter(
      (e) => e && !e.dead && e._summonedBy === this,
    ).length;
    const free = Math.max(0, k.maxAlive - alive);
    const wanted = Math.min(k.goblinCount, free);
    for (let i = 0; i < wanted; i++) {
      const angle = Math.random() * Math.PI * 2;
      const sx = this.x + Math.cos(angle) * k.spawnRadius;
      const sy = this.y + Math.sin(angle) * k.spawnRadius;
      // Blockierte Spawnpunkte einfach ueberspringen — der Kriegsruf gibt es
      // dann eben nur, wo Platz ist. Kein Goblin steckt in einer Wand fest.
      if (game.level.isBoxBlocked(sx, sy, 12, 12)) continue;
      const g = createEnemy('goblin', sx, sy, this.difficulty);
      if (g) {
        g._summonedBy = this;
        game.enemies.push(g);
      }
    }
    playSound('bossPhase');
  }

  // --- Zeichnen ---------------------------------------------------------

  draw(ctx) {
    if (this.dead) {
      this.drawDeath(ctx);
      return;
    }
    ctx.fillStyle = 'rgba(0,0,0,0.32)';
    ctx.beginPath();
    ctx.ellipse(Math.round(this.x), Math.round(this.y + this.hh), this.hw * 0.85, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    if (this.state === 'windup' || this.state === 'doppelschlagWindup') this.drawTelegraph(ctx);
    if (this.state === 'chargeWindup') this.drawChargeTelegraph(ctx);
    if (this.state === 'kriegsrufWindup') this.drawKriegsrufTelegraph(ctx);
    if (this.state === 'wutIntro') this.drawWutIntro(ctx);

    this.drawBody(ctx);
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

  drawKriegsrufTelegraph(ctx) {
    const k = this.def.kriegsruf;
    const p = clamp(this.stateTime / k.windupTime, 0, 1);
    ctx.save();
    ctx.strokeStyle = COLORS.bossAccent;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.4 + 0.5 * (1 - p);
    // Drei pulsierende Ringe, die vom Boss weg wandern.
    for (let i = 0; i < 3; i++) {
      const r = 20 + (p * 60 + i * 20);
      ctx.beginPath();
      ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawWutIntro(ctx) {
    const p = clamp(this.stateTime / this.def.wutmodus.introTime, 0, 1);
    // Sichtbares Bruellen: pulsierender roter Ring um den Boss.
    ctx.save();
    ctx.strokeStyle = COLORS.blood;
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.55 * (1 - p);
    const r = 30 + 90 * p;
    ctx.beginPath();
    ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
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
    const attacking = ['windup', 'doppelschlagWindup', 'strike',
      'chargeWindup', 'charging', 'kriegsrufWindup', 'wutIntro'].includes(this.state);
    const grow = 1 + this.windupProgress * 0.12 + (this.state === 'charging' ? 0.15 : 0);
    const w = s.w * grow;
    const h = s.h * grow;
    const cy = this.y + s.offsetY;

    let fill = this.baseColor;
    if (attacking) fill = COLORS.enemyWindup;
    if (this.state === 'stunned') fill = '#5a4a44';
    if (this.wutmodusActive) fill = COLORS.blood;
    if (this.hitFlash > 0) fill = COLORS.enemyHit;

    ctx.save();
    ctx.fillStyle = fill;
    ctx.fillRect(Math.round(this.x - w / 2), Math.round(cy - h / 2), Math.round(w), Math.round(h));
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.lineWidth = 2;
    ctx.strokeRect(Math.round(this.x - w / 2) + 1, Math.round(cy - h / 2) + 1,
      Math.round(w) - 2, Math.round(h) - 2);

    ctx.fillStyle = COLORS.bossAccent;
    for (let i = 0; i < this.phase; i++) {
      ctx.fillRect(Math.round(this.x - 9 + i * 8), Math.round(cy - h / 2 - 6), 5, 6);
    }

    const ex = Math.cos(this.facing) * 5;
    const ey = Math.sin(this.facing) * 3;
    ctx.fillStyle = this.state === 'stunned' ? '#d9d2c0' : '#1a0f0c';
    ctx.fillRect(Math.round(this.x - 8 + ex), Math.round(cy - 6 + ey), 5, 4);
    ctx.fillRect(Math.round(this.x + 3 + ex), Math.round(cy - 6 + ey), 5, 4);
    ctx.restore();
  }
}
