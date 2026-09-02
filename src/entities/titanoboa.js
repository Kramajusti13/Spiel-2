/**
 * titanoboa.js — Endboss des Urwalds (VERBESSERUNGEN_1 Abschnitt 6).
 *
 * PHASE 1 (750 – 375 HP) — abgetaucht, verschlingt:
 *   stalk     Der Schatten wandert sichtbar ueber den Boden auf den Spieler zu.
 *   warn      1,5 s bleibt der Schatten STEHEN und pulsiert.
 *   lunge     Sie schiesst hoch. Wer noch auf dem Schatten steht: 100 Schaden.
 *   surfaced  Sie ist ueber der Erde und angreifbar. In dieser Zeit waehlt sie
 *             einen Angriff nach ABSTAND (siehe unten).
 *
 * HAEUTUNG (bei 375 HP) — 3 Sekunden IMMUN.
 *   Bildschirm wackelt leicht, alte Haut platzt sichtbar ab, sie waechst.
 *
 * PHASE 2 (unter 375 HP) — offener Kampf, taucht NICHT mehr ab:
 *   +20 Schaden auf alles, +30 % Tempo, groesser. Pausen zwischen den
 *   Angriffen sinken von 2,0 s auf 1,4 s.
 *
 * ANGRIFFSWAHL NACH ABSTAND (ersetzt das feste Muster):
 *   unter 100 px   Schwanzfeger 360°, Radius 128, Schaden 70 (+20)
 *   100 – 350 px   Biss, Schaden 60 (+20)
 *   ueber 350 px   Giftspucke, 3 Geschosse, Reichweite 400, 40 pro Treffer (+20)
 *
 * Die 1,5 s Vorwarnung des Verschlingens bleiben unantastbar — 100 Schaden
 * ohne Vorwarnung waeren kein Kampf.
 */

import { COLORS, SPRITES } from '../config.js';
import { hasSprite, drawSprite, spriteSize } from '../gfx.js';
import { playSound } from '../audio.js';
import { clamp, degToRad, dist } from '../util.js';
import { Enemy } from './enemy.js';

/**
 * Wie level.moveEntity, aber Wasser-Kacheln sind fuer die Titanoboa begehbar
 * (VERBESSERUNGEN_1 Abschnitt 3, "kann durch Wasser schwimmen"). Sie bleibt
 * dabei angreifbar — nur die Bewegungssperre faellt weg.
 */
function swimMove(entity, dx, dy, level) {
  const T = level.tileSize;
  const blocked = (col, row) => {
    const tile = level.tileAt(col, row);
    if (!tile.solid) return false;
    return tile.name !== 'water';
  };
  const result = { hitX: false, hitY: false };

  if (dx !== 0) {
    entity.x += dx;
    const r0 = Math.floor((entity.y - entity.hh) / T);
    const r1 = Math.floor((entity.y + entity.hh - 0.001) / T);
    if (dx > 0) {
      const col = Math.floor((entity.x + entity.hw - 0.001) / T);
      for (let r = r0; r <= r1; r++) {
        if (blocked(col, r)) { entity.x = col * T - entity.hw - 0.001; result.hitX = true; break; }
      }
    } else {
      const col = Math.floor((entity.x - entity.hw) / T);
      for (let r = r0; r <= r1; r++) {
        if (blocked(col, r)) { entity.x = (col + 1) * T + entity.hw + 0.001; result.hitX = true; break; }
      }
    }
  }
  if (dy !== 0) {
    entity.y += dy;
    const c0 = Math.floor((entity.x - entity.hw) / T);
    const c1 = Math.floor((entity.x + entity.hw - 0.001) / T);
    if (dy > 0) {
      const row = Math.floor((entity.y + entity.hh - 0.001) / T);
      for (let c = c0; c <= c1; c++) {
        if (blocked(c, row)) { entity.y = row * T - entity.hh - 0.001; result.hitY = true; break; }
      }
    } else {
      const row = Math.floor((entity.y - entity.hh) / T);
      for (let c = c0; c <= c1; c++) {
        if (blocked(c, row)) { entity.y = (row + 1) * T + entity.hh + 0.001; result.hitY = true; break; }
      }
    }
  }
  entity.x = clamp(entity.x, entity.hw, level.pixelWidth - entity.hw);
  entity.y = clamp(entity.y, entity.hh, level.pixelHeight - entity.hh);
  return result;
}

export class Titanoboa extends Enemy {
  constructor(x, y) {
    super('titanoboa', x, y);
    this.lastPhase = 1;
    /** Festgenagelter Einschlagpunkt, sobald die Vorwarnung laeuft. */
    this.targetX = x;
    this.targetY = y;
    /** true = die Haeutung ist gelaufen, Phase 2 kaempft offen. */
    this.hasShed = false;
    /** Welchen Angriff hat sie gerade gewaehlt? 'tail' | 'bite' | 'spit' */
    this.currentAttack = null;
    /** Kleine Pause zwischen zwei Angriffen (attackPauseP1 / P2). */
    this.attackPause = 0;
    this.setState('stalk');
  }

  /** 1 oder 2 — haengt am verbleibenden Leben. */
  get phase() {
    return this.hp / this.maxHp > this.def.phaseThresholds[0] ? 1 : 2;
  }

  /**
   * Angreifbar ist sie nur aufgetaucht (P1 surfaced/attacking) und im offenen
   * Kampf von Phase 2. Abgetaucht (stalk/warn/lunge) UND waehrend der 3 s
   * Haeutung geht jeder Treffer daneben.
   */
  get invulnerable() {
    return this.state === 'stalk' || this.state === 'warn' || this.state === 'lunge'
      || this.state === 'shedding';
  }

  get isSubmerged() {
    return this.state === 'stalk' || this.state === 'warn';
  }

  /** Groessenfaktor: in Phase 2 ist sie groesser — auch leichter zu treffen. */
  get sizeFactor() {
    return this.phase === 2 && this.hasShed ? this.def.phase2SizeFactor : 1;
  }

  /** Schadenszuschlag von Phase 2 (+20 auf alle Angriffe). */
  get damageBonus() {
    return this.phase === 2 && this.hasShed ? this.def.phase2DamageBonus : 0;
  }

  get speedFactor() {
    return this.phase === 2 && this.hasShed ? this.def.phase2SpeedFactor : 1;
  }

  /** Pause zwischen zwei Angriffen — P1 2,0 s, P2 1,4 s. */
  get pauseTime() {
    return this.phase === 2 && this.hasShed
      ? this.def.attackPauseP2 : this.def.attackPauseP1;
  }

  think(dt, game) {
    const player = game.player;

    // --- Phasenwechsel: die Haeutung. Einmalig, bei 50 % Leben. ---
    if (this.phase === 2 && !this.hasShed && this.state !== 'shedding') {
      this.startShedding(game);
      return;
    }

    if (this.state === 'shedding') {
      // 3 Sekunden IMMUN (siehe invulnerable). Leichter Bildschirmwackler
      // waehrend der Haeutung — spuerbar, aber nicht stoerend.
      if (Math.floor(this.stateTime * 5) !== Math.floor((this.stateTime - dt) * 5)) {
        game.shake(3, 0.15);
      }
      if (this.stateTime >= this.def.sheddingTime) {
        this.hasShed = true;
        this.hw = (this.def.hitbox.w / 2) * this.def.phase2SizeFactor;
        this.hh = (this.def.hitbox.h / 2) * this.def.phase2SizeFactor;
        playSound('bossPhase');
        game.shake(8, 0.4);
        game.spawnDamageNumber(this.x, this.y - this.hh - 22, 'Gehaeutet!',
          COLORS.titanoboaAccent, true);
        this.setState('chase');
      }
      return;
    }

    this.facing = Math.atan2(player.y - this.y, player.x - this.x);

    if (this.phase === 2 && this.hasShed) {
      this.thinkOpen(dt, game, player);
    } else {
      this.thinkSubmerged(dt, game, player);
    }
  }

  startShedding(game) {
    this.setState('shedding');
    playSound('bossPhase');
    game.shake(6, 0.3);
    game.spawnDamageNumber(this.x, this.y - this.hh - 20, 'Sie haeutet sich',
      COLORS.titanoboaAccent, true);
  }

  // --- Phase 1: abtauchen / verschlingen + Angriff nach Abstand ---------

  thinkSubmerged(dt, game, player) {
    // Waehrend sie aufgetaucht ist: den Angriff-nach-Abstand-Zyklus fahren.
    if (this._inRangedAttackState()) {
      this.updateRangedAttacks(dt, game, player);
      return;
    }

    // Aufgetaucht: greift nach Abstand an, bis die Pause abgelaufen ist,
    // dann wieder abtauchen.
    if (this.state === 'surfaced') {
      if (this.attackPause > 0) {
        this.attackPause -= dt;
        return;
      }
      this.chooseAttack(game, player);
      return;
    }
    // Kurze Pause nach einem Angriff, dann zurueck ins Abtauchen (Phase 1).
    if (this.state === 'afterAttackP1') {
      this.attackPause -= dt;
      if (this.attackPause <= 0) this.setState('stalk');
      return;
    }

    // Schatten wandert dem Spieler nach.
    if (this.state === 'stalk') {
      const heading = this.steer(player, game.level, dt);
      swimMove(this,
        Math.cos(heading) * this.def.submergedSpeed * dt,
        Math.sin(heading) * this.def.submergedSpeed * dt,
        game.level);
      const d = dist(this.x, this.y, player.x, player.y);
      if (d <= this.def.swallowRadius || this.stateTime >= this.def.stalkTime) {
        this.targetX = this.x;
        this.targetY = this.y;
        this.setState('warn');
      }
      return;
    }
    if (this.state === 'warn') {
      if (this.stateTime >= this.def.lungeWarning) {
        this.swallow(game);
        this.setState('lunge');
      }
      return;
    }
    if (this.state === 'lunge') {
      if (this.stateTime >= 0.2) {
        // Nach dem Verschlingen: aufgetaucht — jetzt greift sie nach Abstand an.
        this.setState('surfaced');
        this.currentAttack = null;
        this.attackPause = this.pauseTime;
      }
    }
  }

  /** Das Verschlingen: trifft, wer noch auf dem festgenagelten Schatten steht. */
  swallow(game) {
    const player = game.player;
    game.shake(9, 0.35);
    if (player.dead) return;
    if (dist(this.targetX, this.targetY, player.x, player.y) > this.def.swallowRadius) return;
    const angle = Math.atan2(player.y - this.targetY, player.x - this.targetX);
    player.takeDamage(this.def.swallowDamage + this.damageBonus, angle, game);
  }

  // --- Phase 2: offener Kampf (kein Abtauchen mehr) ----------------------

  thinkOpen(dt, game, player) {
    // Angriff-Zyklus nach Abstand. Sie taucht nicht mehr ab.
    if (this._inRangedAttackState()) {
      this.updateRangedAttacks(dt, game, player);
      return;
    }

    // Pause zwischen Angriffen abwarten, dann naechsten Angriff waehlen.
    if (this.attackPause > 0) {
      this.attackPause -= dt;
    }
    if (this.attackPause <= 0) {
      this.chooseAttack(game, player);
      return;
    }

    // Waehrend der Pause: dem Spieler naeher kommen, wenn zu weit weg.
    const d = dist(this.x, this.y, player.x, player.y);
    if (d > this.def.bite.maxRange) {
      const heading = this.steer(player, game.level, dt);
      const speed = this.def.speed * this.speedFactor;
      swimMove(this, Math.cos(heading) * speed * dt, Math.sin(heading) * speed * dt, game.level);
    }
  }

  // --- Angriffswahl nach Abstand + gemeinsame State-Maschine -----------

  _inRangedAttackState() {
    const s = this.state;
    return s === 'tailWindup' || s === 'tailStrike'
      || s === 'biteWindup' || s === 'biteStrike'
      || s === 'spitWindup' || s === 'spitStrike';
  }

  chooseAttack(game, player) {
    const d = dist(this.x, this.y, player.x, player.y);
    // < 100: Schwanzfeger
    if (d < this.def.tailSweep.range) {
      this.currentAttack = 'tail';
      this.setState('tailWindup');
      return;
    }
    // 100-350: Biss
    if (d <= this.def.bite.maxRange) {
      this.currentAttack = 'bite';
      this.setState('biteWindup');
      return;
    }
    // > 350: Giftspucke
    this.currentAttack = 'spit';
    this.setState('spitWindup');
  }

  updateRangedAttacks(dt, game, player) {
    const inWindup = this.state.endsWith('Windup');
    // Waehrend Ausholphasen die Blickrichtung leicht nachfuehren — sonst
    // faellt der Angriff ins Leere, wenn der Spieler laeuft.
    if (inWindup) this.facing = this._turnTowards(player, dt, 2.5);

    if (this.state === 'tailWindup') {
      if (this.stateTime >= this.def.tailSweep.windupTime) {
        this.doTailSweep(game);
        this.setState('tailStrike');
      }
      return;
    }
    if (this.state === 'tailStrike') {
      if (this.stateTime >= this.def.tailSweep.strikeTime) this._finishAttack();
      return;
    }

    if (this.state === 'biteWindup') {
      if (this.stateTime >= this.def.bite.windupTime) {
        this.doBite(game);
        this.setState('biteStrike');
      }
      return;
    }
    if (this.state === 'biteStrike') {
      if (this.stateTime >= this.def.bite.strikeTime) this._finishAttack();
      return;
    }

    if (this.state === 'spitWindup') {
      if (this.stateTime >= this.def.spit.windupTime) {
        this.doSpit(game);
        this.setState('spitStrike');
      }
      return;
    }
    if (this.state === 'spitStrike') {
      if (this.stateTime >= this.def.spit.strikeTime) this._finishAttack();
    }
  }

  _finishAttack() {
    this.currentAttack = null;
    // In Phase 1 taucht sie wieder ab, sobald ihr Zeitfenster abgelaufen ist —
    // waehrend Phase 2 bleibt sie oben und macht nur eine Pause.
    if (this.phase === 1 && !this.hasShed) {
      // In P1: kurze Pause und dann wieder abtauchen.
      this.attackPause = this.pauseTime;
      this.setState('afterAttackP1');
    } else {
      this.attackPause = this.pauseTime;
      this.setState('chase');
    }
  }

  // --- Angriffs-Wirkungen ----------------------------------------------

  doTailSweep(game) {
    const t = this.def.tailSweep;
    game.shake(6, 0.25);
    // 360° AOE: alles im Radius trifft, kein Winkel-Check.
    const player = game.player;
    if (player.dead) return;
    if (dist(this.x, this.y, player.x, player.y) > t.radius) return;
    const angle = Math.atan2(player.y - this.y, player.x - this.x);
    player.takeDamage(t.damage + this.damageBonus, angle, game);
  }

  doBite(game) {
    const b = this.def.bite;
    const player = game.player;
    if (player.dead) return;
    if (dist(this.x, this.y, player.x, player.y) > b.radius) return;
    const angle = Math.atan2(player.y - this.y, player.x - this.x);
    player.takeDamage(this.def.damage + this.damageBonus, angle, game);
    game.shake(5, 0.18);
  }

  doSpit(game) {
    const s = this.def.spit;
    // 3 Geschosse in einem schmalen Kegel — bewusst kein perfektes Bogen,
    // damit gutes Ausweichen mit Abstand belohnt wird.
    const spread = degToRad(s.spreadDeg);
    const base = this.facing;
    for (let i = 0; i < s.count; i++) {
      const t = s.count === 1 ? 0 : (i / (s.count - 1)) - 0.5;
      const a = base + t * spread;
      const mx = this.x + Math.cos(a) * (this.hw + 6);
      const my = this.y + Math.sin(a) * (this.hh + 6);
      game.spawnPoisonSpit(mx, my, a, s.damage + this.damageBonus, {
        speed: s.speed,
        maxRange: s.maxRange,
      });
    }
    playSound('arrowHit', { volume: 0.35 });
  }

  // --- Darstellung ----------------------------------------------------

  drawShadow(ctx) {
    const warnt = this.state === 'warn';
    const t = warnt ? this.stateTime / this.def.lungeWarning : 0;
    const cx = warnt ? this.targetX : this.x;
    const cy = warnt ? this.targetY : this.y;
    const puls = warnt ? 1 + 0.16 * Math.sin(this.stateTime * (7 + 10 * t)) : 1;
    const r = this.def.shadowRadius * puls;

    ctx.save();
    ctx.fillStyle = COLORS.boaShadow;
    ctx.beginPath();
    ctx.ellipse(cx, cy, r * 1.4, r, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = warnt ? COLORS.boaShadowWarn : COLORS.lurkShadowEdge;
    ctx.lineWidth = warnt ? 3 : 1.5;
    ctx.setLineDash(warnt ? [] : [6, 5]);
    ctx.globalAlpha = warnt ? 0.55 + 0.45 * t : 0.8;
    ctx.beginPath();
    ctx.arc(cx, cy, this.def.swallowRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  /** Sichtbarer 360°-Ring beim Schwanzfeger. */
  drawTailTelegraph(ctx) {
    const p = clamp(this.stateTime / this.def.tailSweep.windupTime, 0, 1);
    ctx.save();
    ctx.globalAlpha = 0.18 + 0.35 * p;
    ctx.strokeStyle = COLORS.enemyWindup;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.def.tailSweep.radius * (0.5 + 0.5 * p), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  /** Sichtbarer Kegel-Warner beim Giftspucken. */
  drawSpitTelegraph(ctx) {
    const p = clamp(this.stateTime / this.def.spit.windupTime, 0, 1);
    const spread = degToRad(this.def.spit.spreadDeg);
    const len = this.def.spit.maxRange * p;
    ctx.save();
    ctx.globalAlpha = 0.15 + 0.35 * p;
    ctx.fillStyle = COLORS.titanoboaAccent ?? COLORS.enemyWindup;
    ctx.translate(this.x, this.y);
    ctx.rotate(this.facing);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, len, -spread / 2, spread / 2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  draw(ctx) {
    if (this.dead) {
      super.draw(ctx);
      return;
    }
    if (this.isSubmerged) {
      this.drawShadow(ctx);
      return;
    }
    if (this.state === 'tailWindup') this.drawTailTelegraph(ctx);
    if (this.state === 'spitWindup') this.drawSpitTelegraph(ctx);
    super.draw(ctx);
  }

  drawBody(ctx) {
    const s = this.def.sprite;
    const gross = this.sizeFactor;
    const cy = this.y + s.offsetY;

    if (hasSprite(this.sprite)) {
      const size = spriteSize(this.sprite, s, SPRITES.scale.titanoboa);
      const attacking = this.state.endsWith('Windup') || this.state.endsWith('Strike');
      const tint = this.hitFlash > 0
        ? COLORS.enemyHit
        : this.state === 'shedding'
          ? COLORS.titanoboaAccent
          : attacking ? COLORS.enemyWindup : null;
      drawSprite(ctx, this.sprite, this.x, cy, size.w * gross, size.h * gross,
        this.baseColor, { tint, tintAlpha: this.state === 'shedding' ? 0.7 : 0.6 });
      return;
    }

    let fill = this.baseColor;
    if (this.state === 'shedding') fill = COLORS.titanoboaAccent;
    if (this.state.endsWith('Windup') || this.state.endsWith('Strike')) fill = COLORS.enemyWindup;
    if (this.hitFlash > 0) fill = COLORS.enemyHit;

    ctx.save();
    ctx.translate(Math.round(this.x), Math.round(cy));
    ctx.rotate(this.facing);
    const w = s.w * gross;
    const h = s.h * gross;
    ctx.fillStyle = fill;
    ctx.fillRect(-w / 2, -h / 3, w, (h * 2) / 3);
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(-w / 2 + 0.5, -h / 3 + 0.5, w - 1, (h * 2) / 3 - 1);
    ctx.fillStyle = COLORS.titanoboaAccent;
    ctx.fillRect(w / 2 - 6, -8, 14, 16);
    ctx.restore();
  }

  drawHpBar(ctx) {
    super.drawHpBar(ctx);
    if (this.dead) return;
    ctx.save();
    ctx.fillStyle = COLORS.titanoboaAccent;
    ctx.font = '10px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(this.phase === 1 ? 'Phase 1' : 'Phase 2',
      Math.round(this.x), Math.round(this.y - this.hh - 16));
    ctx.restore();
  }

  drawDebug(ctx) {
    super.drawDebug(ctx);
    ctx.save();
    ctx.strokeStyle = 'rgba(217,86,63,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(this.isSubmerged ? this.targetX : this.x, this.isSubmerged ? this.targetY : this.y,
      this.def.swallowRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}
