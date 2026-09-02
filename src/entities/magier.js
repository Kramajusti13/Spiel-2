/**
 * magier.js  Fernkaempfer mit Feuerball (Etappe 1).
 *
 * "Wirft von einer Reichweite von 200 px einen Feuerball, der
 * Verbrennungsschaden verursacht. Der Magier rennt nicht weg."
 *
 * Wie der Bogenschuetze, aber mit zwei Unterschieden:
 *   1. Er wirft Feuerbaelle statt Pfeile â diese verrursachen zusaetzlich
 *      Verbrennung (BurnCloud, Schaden ueber Zeit).
 *   2. Er flieht nicht: kommt der Spieler nah, weicht er nicht aus.
 *      Er steht und wirft weiter.
 */

import { COLORS } from '../config.js';
import { hasSprite } from '../gfx.js';
import { dist, randRange } from '../util.js';
import { Enemy } from './enemy.js';
import { Fireball } from './fireball.js';

export class Magier extends Enemy {
  constructor(x, y) {
    super('magier', x, y);
    this.animTime = Math.random() * 3;
    this.baseColor = COLORS.magier ?? '#6a3a8a';
    this.shootTimer = randRange(0, this.def.shootInterval);
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

    // --- Wurfzyklus ---
    if (this.state === 'windup') {
      if (d > this.def.range) {
        this.setState('chase');
        return;
      }
      if (this.stateTime >= this.def.windupTime) {
        this.shootFireball(game);
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
    const inRange = d <= this.def.range;
    if (this.shootTimer <= 0 && inRange && this.hasLineOfSight) {
      this.setState('windup');
      return;
    }

    // Magier flieht nicht. Ist der Spieler zu nah, bleibt er stehen und
    // wirft weiter. Ist er zu weit, rueckt er nach.
    if (d > this.def.range) {
      const heading = this.steer(player, game.level, dt);
      game.level.moveEntity(this,
        Math.cos(heading) * this.def.speed * dt,
        Math.sin(heading) * this.def.speed * dt);
    }
    // In Reichweite aber nicht bereit oder keine Sicht: stehen bleiben.
  }

  shootFireball(game) {
    this.shootTimer = this.def.shootInterval;
    const mx = this.x + Math.cos(this.facing) * (this.hw + 8);
    const my = this.y + Math.sin(this.facing) * (this.hh + 8);
    // Direkt in game.arrows legen  dieselbe Liste wie alle Flugkoerper.
    game.arrows.push(new Fireball(mx, my, this.facing, this.def.damage, {
      speed: this.def.projectileSpeed,
      maxRange: this.def.fireballMaxRange ?? this.def.range,
    }));
  }

  /** Beim Zielen eine Ziellinie zeigen  das ist seine Ausholphase. */
  drawTelegraph(ctx) {
    const p = this.windupProgress;
    const len = this.def.range;
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

  /** Platzhalter: schlanke Gestalt mit Kapuze und Stab. */
  drawBody(ctx) {
    if (hasSprite(this.facing) * 12),
        Math.round(cy + Math.sin(this.facing) * 12), glow, 0, Math.PI * 2);
        ctx.fill();
      }
    ctx.restore();
    }
  }
}
