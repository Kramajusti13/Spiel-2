/**
 * burnCloud.js  Verbrennungsschaden ueber Zeit (Etappe 1: Magier/Drache).
 *
 * Spiegelt das Gift-System (poisonCloud.js), aber als FEUER-Effekt, der dem
 * Spieler folgt: der Feuerball erzeugt eine Brenn-Wolke, die sich an den
 * Spieler heftet und ueber 3 s Schaden pro Sekunde macht.
 *
 * Da sie in game.clouds liegt (dieselbe Liste wie Giftwolken), laeuft sie im
 * bestehenden Update-/Draw-Zyklus mit  kein Eingriff in game.js noetig.
 */

import { COLORS } from '../config.js';
import { clamp } from '../util.js';
import { playSound } from '../audio.js';

export const BURN = {
  /** Brenndauer in Sekunden. */
  duration: 3.0,
  /** Schaden pro Sekunde. */
  damagePerSecond: 10,
  /** Wie oft der Schaden verrechnet wird (4 Ticks/s). */
  tickInterval: 0.25,
};

export class BurnCloud {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.age = 0;
    this.spent = false;
    this.burnTick = 0;

    /** Feste Flammen-Schwaden, die aufsteigen. */
    this.puffs = [];
    for (let i = 0; i < 6; i++) {
      this.puffs.push({
        angle: Math.random() * Math.PI * 2,
        dist: Math.random() * 12,
        size: 4 + Math.random() * 6,
        drift: (Math.random() - 0.5) * 0.8,
      });
    }
  }

  get alpha() {
    const rest = BURN.duration - this.age;
    if (this.age < 0.2) return this.age / 0.2;
    if (rest < 0.4) return Math.max(0, rest / 0.4);
    return 1;
  }

  update(dt, game) {
    this.age += dt;
    if (this.age >= BURN.duration) {
      this.spent = true;
      return;
    }

    const p = game.player;
    if (!p || p.dead) return;

    // Dem Spieler folgen  die Flame brent auf der Figur, nicht am Ort des Treffers.
    this.x = p.x;
    this.y = p.y;

    // Schaden ueber Zeit P geht an Verteidigung und Schild vorbei (wie Gift).
    this.burnTick += dt;
    while (this.burnTick >= BURN.tickInterval - 1e-9) {
      this.burnTick -= BURN.tickInterval;
      const schaden = Math.max(1, Math.round(BURN.damagePerSecond * BURN.tickInterval));
      p.hp = clamp(p.hp - schaden, 0, p.maxHp);
      game.spawnDamageNumber(p.x, p.y - 30, schaden, COLORS.burn ?? '#ff6600');
      if (p.hp <= 0) {
        p.dead = true;
        p.blocking = false;
        playSound('playerDeath');
        game.onPlayerDeath();
        return;
      }
    }
  }

  draw(ctx) {
    const a = this.alpha;
    if (a <= 0) return;

    ctx.save();
    // Grund-Glut: kleiner roter Schein um den Spieler.
    ctx.globalAlpha = 0.22 * a;
    ctx.fillStyle = COLORS.burn ?? '#ff6600';
    ctx.beginPath();
    ctx.arc(this.x, this.y - 2, 14, 0, Math.PI * 2);
    ctx.fill();

    // Aufsteigende Flammen-Schwaden.
    ctx.globalAlpha = 0.20 * a;
    ctx.fillStyle = COLORS.burnDark ?? '#cc3300';
    for (const puff of this.puffs) {
      const ang = puff.angle + this.age * puff.drift;
      const rise = this.age * 12;
      const cx = this.x + Math.cos(ang) * puff.dist;
      const cy = this.y - 2 - rise + Math.sin(ang) * puff.dist * 0.5;
      const sz = puff.size * (1 - this.age / BURN.duration * 0.3);
      ctx.beginPath();
      ctx.arc(cx, cy, sz, 0, Math.PI * 2);
      ctx.fill();
    }

    // Heller Kern.
    ctx.globalAlpha = 0.30 * a;
    ctx.fillStyle = COLORS.burnBright ?? '#ffaa00';
    ctx.beginPath();
    ctx.arc(this.x, this.y - 2, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
