/**
 * archer.js — Level 3 (Abschnitt 6).
 *
 * "Haelt 200 px Abstand, schiesst alle 2 s."
 * Er kommt nie in Schwertreichweite, solange man ihn laufen laesst — deshalb
 * wird hier der Bogen noetig oder ein beherzter Sturm mit Schild.
 *
 * Er schiesst nur mit freier Sicht; hinter einer Mauer rueckt er stattdessen nach.
 * Der Pfeil kommt aus derselben Klasse wie der des Spielers, nur `friendly: false`.
 */

import { COLORS } from '../config.js';
import { hasSprite } from '../gfx.js';
import { dist, randRange } from '../util.js';
import { Enemy } from './enemy.js';

export class Archer extends Enemy {
  constructor(x, y) {
    super('archer', x, y);
    this.animTime = Math.random() * 3;
    this.shootTimer = randRange(0, this.def.shootInterval);  // nicht alle im Gleichtakt
    this.strafeDir = Math.random() < 0.5 ? -1 : 1;
    this.strafeTimer = 0;
    this.hasLineOfSight = false;
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
    this.shootTimer -= dt;
    this.hasLineOfSight = level.isPathClear(this.x, this.y, player.x, player.y, 4, 4);

    // --- Schusszyklus ---
    if (this.state === 'windup') {
      if (this.stateTime >= this.def.windupTime) {
        this.shoot(game);
        this.setState('strike');
      }
      return;   // beim Zielen steht er still, das macht ihn angreifbar
    }
    if (this.state === 'strike') {
      if (this.stateTime >= this.def.strikeTime) this.setState('recover');
      return;
    }
    if (this.state === 'recover') {
      if (this.stateTime >= this.def.recoverTime) this.setState('chase');
      return;
    }

    // Schussbereit, in Reichweite und freie Sicht? Dann zielen.
    const inRange = d <= this.def.keepDistance + this.def.distanceTolerance * 2;
    if (this.shootTimer <= 0 && inRange && this.hasLineOfSight) {
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
      // Zu nah: rueckwaerts vom Spieler weg.
      const away = Math.atan2(this.y - player.y, this.x - player.x);
      vx = Math.cos(away) * speed;
      vy = Math.sin(away) * speed;
    } else if (d > want + tol || !this.hasLineOfSight) {
      // Zu weit oder keine Sicht: nachruecken (um Hindernisse herum).
      const heading = this.steer(player, game.level, dt);
      vx = Math.cos(heading) * speed;
      vy = Math.sin(heading) * speed;
    } else {
      // Passender Abstand: seitlich ausweichen, damit er kein stehendes Ziel ist.
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
    // An einer Wand die Ausweichrichtung wechseln, statt dagegen zu schieben.
    if (hit.hitX || hit.hitY) this.strafeDir = -this.strafeDir;
  }

  shoot(game) {
    this.shootTimer = this.def.shootInterval;
    const mx = this.x + Math.cos(this.facing) * (this.hw + 6);
    const my = this.y + Math.sin(this.facing) * (this.hh + 6);
    game.spawnArrow(mx, my, this.facing, this.def.damage, {
      friendly: false,
      speed: this.def.projectileSpeed,
      knockback: this.def.arrowKnockback,
    });
  }

  /** Beim Zielen eine Ziellinie zeigen — das ist seine Ausholphase. */
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

  /** Platzhalter: schlanke Gestalt mit angedeutetem Bogen. */
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
    ctx.fillStyle = fill;
    ctx.fillRect(Math.round(this.x - s.w / 2), Math.round(cy - s.h / 2), s.w, s.h);
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.lineWidth = 1;
    ctx.strokeRect(Math.round(this.x - s.w / 2) + 0.5, Math.round(cy - s.h / 2) + 0.5,
      s.w - 1, s.h - 1);

    // Bogen in Blickrichtung — beim Zielen gespannt.
    const pull = this.state === 'windup' ? 3 * this.windupProgress : 0;
    ctx.translate(Math.round(this.x), Math.round(cy));
    ctx.rotate(this.facing);
    ctx.strokeStyle = COLORS.archerAccent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(6, 0, 9, -1.2, 1.2);
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(6 + Math.cos(-1.2) * 9, Math.sin(-1.2) * 9);
    ctx.lineTo(6 - pull, 0);
    ctx.lineTo(6 + Math.cos(1.2) * 9, Math.sin(1.2) * 9);
    ctx.stroke();
    ctx.restore();
  }
}
