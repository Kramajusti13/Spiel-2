/**
 * gorilla.js — erster Gegner des Urwalds (Erweiterung 2, Abschnitt 1).
 *
 * "Haelt 200 px Abstand und wirft alle 2 s einen Stein. Der Stein fliegt
 * sichtbar und langsam genug, um ihm auszuweichen. Trifft der Spieler ihn im
 * Nahkampf, weicht der Gorilla ein Stueck zurueck, statt stehen zu bleiben."
 *
 * Er ist absichtlich nah am Bogenschuetzen gebaut — dieselbe Abstandslogik,
 * dieselbe Ausholphase. Wer den Bogenschuetzen schlagen kann, versteht den
 * Gorilla sofort; neu zu lernen ist nur der Rueckzug, den er auf einen
 * Nahkampftreffer hin macht. Genau deshalb steht er als erster der fuenf
 * neuen Monster in der Umsetzungsreihenfolge.
 */

import { COLORS } from '../config.js';
import { hasSprite } from '../gfx.js';
import { dist, randRange } from '../util.js';
import { Enemy } from './enemy.js';

export class Gorilla extends Enemy {
  constructor(x, y) {
    super('gorilla', x, y);
    this.animTime = Math.random() * 3;
    // Nicht alle im Gleichtakt werfen — sonst kommt eine Salve statt Regen.
    this.throwTimer = randRange(0, this.def.throwInterval);
    this.strafeDir = Math.random() < 0.5 ? -1 : 1;
    this.strafeTimer = 0;
    this.hasLineOfSight = false;
    this.retreatAngle = 0;
  }

  think(dt, game) {
    const player = game.player;
    const level = game.level;
    const d = dist(this.x, this.y, player.x, player.y);

    if (this.state === 'idle' && d <= this.def.aggroRadius && !player.dead) {
      this.setState('chase');
    } else if (this.state !== 'idle' && (d > this.def.loseAggroRadius || player.dead)) {
      this.setState('idle');
    }
    if (this.state === 'idle') return;

    this.facing = Math.atan2(player.y - this.y, player.x - this.x);
    this.throwTimer -= dt;
    this.hasLineOfSight = level.isPathClear(this.x, this.y, player.x, player.y, 4, 4);

    // --- Rueckzug nach einem Nahkampftreffer (siehe takeDamage) ---
    if (this.state === 'retreat') {
      const speed = this.def.speed * this.def.retreatSpeedFactor;
      level.moveEntity(this,
        Math.cos(this.retreatAngle) * speed * dt,
        Math.sin(this.retreatAngle) * speed * dt);
      if (this.stateTime >= this.def.retreatTime || d >= this.def.retreatDistance) {
        this.setState('chase');
      }
      return;
    }

    // --- Wurfzyklus ---
    if (this.state === 'windup') {
      // Verlaesst der Spieler die Reichweite waehrend des Ausholens, wird der
      // Wurf abgebrochen — kein Schuss ins Leere (VERBESSERUNGEN_1 Abschnitt 2).
      if (d > this.def.range) {
        this.setState('chase');
        return;
      }
      // Die Ausholphase ist der Moment, in dem er stillsteht und angreifbar
      // ist — das ist der Preis fuer den Wurf.
      if (this.stateTime >= this.def.windupTime) {
        this.throwStone(game);
        this.setState('strike');
      }
      return;
    }
    if (this.state === 'strike') {
      if (this.stateTime >= this.def.strikeTime) this.setState('recover');
      return;
    }
    if (this.state === 'recover') {
      if (this.stateTime >= this.def.recoverTime) this.setState('chase');
      return;
    }

    // Wurfbereit, in Reichweite und freie Sicht? Dann ausholen.
    // Reichweite = die Angriffsreichweite aus config.js (VERBESSERUNGEN_1
    // Abschnitt 2). Wer ausserhalb steht, wird nicht ins Leere beworfen.
    const inRange = d <= this.def.range;
    if (this.throwTimer <= 0 && inRange && this.hasLineOfSight) {
      this.setState('windup');
      return;
    }

    this.reposition(dt, game, d);
  }

  /** Abstand halten: zu nah -> zurueck, zu weit -> nach, sonst seitlich. */
  reposition(dt, game, d) {
    const player = game.player;
    const want = this.def.keepDistance;
    const tol = this.def.distanceTolerance;
    const speed = this.def.speed;
    let vx = 0;
    let vy = 0;

    if (d < want - tol) {
      const away = Math.atan2(this.y - player.y, this.x - player.x);
      vx = Math.cos(away) * speed;
      vy = Math.sin(away) * speed;
    } else if (d > want + tol || !this.hasLineOfSight) {
      const heading = this.steer(player, game.level, dt);
      vx = Math.cos(heading) * speed;
      vy = Math.sin(heading) * speed;
    } else {
      this.strafeTimer -= dt;
      if (this.strafeTimer <= 0) {
        this.strafeTimer = this.def.strafeChangeTime;
        this.strafeDir = -this.strafeDir;
      }
      const side = this.facing + (Math.PI / 2) * this.strafeDir;
      vx = Math.cos(side) * speed * this.def.strafeSpeedFactor;
      vy = Math.sin(side) * speed * this.def.strafeSpeedFactor;
    }

    const hit = game.level.moveEntity(this, vx * dt, vy * dt);
    if (hit.hitX || hit.hitY) this.strafeDir = -this.strafeDir;
  }

  throwStone(game) {
    this.throwTimer = this.def.throwInterval;
    const mx = this.x + Math.cos(this.facing) * (this.hw + 8);
    const my = this.y + Math.sin(this.facing) * (this.hh + 8);
    game.spawnStone(mx, my, this.facing, this.def.damage, {
      speed: this.def.projectileSpeed,
      knockback: this.def.stoneKnockback,
      maxRange: this.def.stoneMaxRange,
    });
  }

  /**
   * Schaden nehmen — und bei einem NAHKAMPFtreffer ein Stueck zurueckweichen
   * (Abschnitt 1), statt stehen zu bleiben.
   *
   * Entschieden wird das am Abstand zum Spieler, nicht an der Waffe: ein
   * geworfener Speer aus 400 px meldet dieselbe Waffe wie ein Stoss aus 70 px,
   * ist aber offensichtlich kein Nahkampf. Am Abstand gemessen stimmt es fuer
   * Schwert, Speerstoss, Wurf und Pfeil gleichermassen.
   */
  takeDamage(amount, fromAngle, knockback, game, crit = false, weapon = null) {
    const vorher = this.dead;
    super.takeDamage(amount, fromAngle, knockback, game, crit, weapon);
    if (this.dead || vorher) return;

    const player = game.player;
    if (!player || player.dead) return;
    if (dist(this.x, this.y, player.x, player.y) > this.def.retreatTriggerRange) return;

    // Mitten im Ausholen bricht er nicht ab — sonst liesse er sich mit
    // schnellen Hieben endlos am Werfen hindern (dieselbe Ueberlegung wie
    // beim Stunlock in enemy.takeDamage).
    if (this.state === 'windup' || this.state === 'strike') return;

    this.retreatAngle = Math.atan2(this.y - player.y, this.x - player.x);
    this.setState('retreat');
  }

  /** Beim Ausholen eine Ziellinie zeigen — wie beim Bogenschuetzen. */
  drawTelegraph(ctx) {
    const p = this.windupProgress;
    const len = this.def.keepDistance + this.def.distanceTolerance * 2;
    ctx.save();
    ctx.globalAlpha = 0.15 + 0.4 * p;
    ctx.strokeStyle = COLORS.enemyWindup;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x + Math.cos(this.facing) * len * p, this.y + Math.sin(this.facing) * len * p);
    ctx.stroke();
    ctx.restore();
  }

  /**
   * Platzhalter: breite, gedrungene Gestalt. Beim Ausholen hebt er den Stein
   * ueber den Kopf — daran erkennt man den Wurf auch ohne die Ziellinie.
   */
  drawBody(ctx) {
    if (hasSprite(this.sprite)) {
      super.drawBody(ctx);
      return;
    }
    const s = this.def.sprite;
    const cy = this.y + s.offsetY;
    let fill = this.baseColor;
    if (this.state === 'windup' || this.state === 'strike') fill = COLORS.enemyWindup;
    if (this.hitFlash > 0) fill = COLORS.enemyHit;

    ctx.save();
    // Rumpf
    ctx.fillStyle = fill;
    ctx.fillRect(Math.round(this.x - s.w / 2), Math.round(cy - s.h / 2), s.w, s.h);
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.lineWidth = 1;
    ctx.strokeRect(Math.round(this.x - s.w / 2) + 0.5, Math.round(cy - s.h / 2) + 0.5,
      s.w - 1, s.h - 1);

    // Breite Schultern: das ist der Umriss, an dem man ihn vom Ork
    // unterscheidet, ohne die Farbe lesen zu muessen.
    ctx.fillStyle = COLORS.gorillaAccent;
    ctx.fillRect(Math.round(this.x - s.w / 2 - 3), Math.round(cy - s.h / 2 + 3), s.w + 6, 7);

    // Der erhobene Stein waehrend der Ausholphase.
    if (this.state === 'windup') {
      const lift = 4 + 6 * this.windupProgress;
      ctx.fillStyle = COLORS.stone;
      ctx.beginPath();
      ctx.arc(Math.round(this.x), Math.round(cy - s.h / 2 - lift), 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = COLORS.stoneDark;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    ctx.restore();
  }
}
