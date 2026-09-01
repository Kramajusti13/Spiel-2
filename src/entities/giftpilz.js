/**
 * giftpilz.js — Debuff-Gegner des Urwalds (Erweiterung 2, Abschnitt 1).
 *
 * "Rennt auf den Spieler zu und versprueht in Reichweite eine Giftwolke."
 *
 * Viel Leben, wenig direkter Schaden — ein Ausdauer-Gegner, kein
 * Bedrohungs-Gegner. Einer allein zwingt nur zum Ausweichen; mehrere
 * zusammen teilen den Boden in begehbare und verbotene Flaechen auf. Deshalb
 * steht er im Dokument als Gruppengegner.
 *
 * Er ist der einzige, dessen Angriff ihn ueberdauert: die Wolke liegt ihre
 * vollen 3 s, auch wenn er selbst dabei faellt. Wer ihn im Nahkampf toetet,
 * steht danach oft in seinem Gift — das ist Absicht und der Preis dafuer,
 * ihn schnell erledigen zu wollen.
 */

import { POISON, COLORS } from '../config.js';
import { hasSprite } from '../gfx.js';
import { dist, randRange } from '../util.js';
import { Enemy } from './enemy.js';

export class Giftpilz extends Enemy {
  constructor(x, y) {
    super('giftpilz', x, y);
    this.animTime = Math.random() * 3;
    // Nicht alle gleichzeitig verspruehen.
    this.sprayTimer = randRange(0, this.def.sprayCooldown);
  }

  think(dt, game) {
    const player = game.player;
    const d = dist(this.x, this.y, player.x, player.y);

    if (this.state === 'idle' && d <= this.def.aggroRadius && !player.dead) {
      this.setState('chase');
    } else if (this.state !== 'idle' && (d > this.def.loseAggroRadius || player.dead)) {
      this.setState('idle');
    }
    if (this.state === 'idle') return;

    this.facing = Math.atan2(player.y - this.y, player.x - this.x);
    this.sprayTimer = Math.max(0, this.sprayTimer - dt);

    // --- Ausholphase: er blaeht sich sichtbar auf, bevor die Wolke kommt ---
    if (this.state === 'windup') {
      if (this.stateTime >= this.def.windupTime) {
        this.spray(game);
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

    // In Reichweite und bereit? Dann aufblaehen.
    if (this.sprayTimer <= 0 && d <= this.def.attackRange) {
      this.setState('windup');
      return;
    }

    // Sonst hinterherlaufen.
    const heading = this.steer(player, game.level, dt);
    game.level.moveEntity(this,
      Math.cos(heading) * this.def.speed * dt,
      Math.sin(heading) * this.def.speed * dt);
  }

  /**
   * Wolke ablassen. Sie entsteht an SEINER Stelle, nicht an der des Spielers:
   * er verspruecht sie um sich herum, er wirft sie nicht. Wer die Ausholphase
   * sieht und weggeht, wird gar nicht erst getroffen.
   *
   * Der direkte Schaden aus der Tabelle (20) trifft nur, wer im Moment des
   * Ablassens in der Wolke steht — das Gift danach kommt aus der Wolke selbst.
   */
  spray(game) {
    this.sprayTimer = this.def.sprayCooldown;
    game.spawnPoisonCloud(this.x, this.y);

    const player = game.player;
    if (player.dead) return;
    if (dist(this.x, this.y, player.x, player.y) > POISON.cloudRadius) return;

    const angle = Math.atan2(player.y - this.y, player.x - this.x);
    player.takeDamage(this.def.damage, angle, game);
    // Die Vergiftung selbst uebernimmt die Wolke in ihrem naechsten Bild —
    // so gibt es genau eine Stelle, an der vergiftet wird.
  }

  /** Beim Aufblaehen einen wachsenden Ring zeigen: das ist die Vorwarnung. */
  drawTelegraph(ctx) {
    const p = this.windupProgress;
    ctx.save();
    ctx.globalAlpha = 0.20 + 0.35 * p;
    ctx.strokeStyle = COLORS.poison;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.arc(this.x, this.y, POISON.cloudRadius * (0.35 + 0.65 * p), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  /**
   * Platzhalter: Stiel mit breitem Hut. Beim Aufblaehen wird der Hut groesser
   * — daran sieht man den Angriff auch ohne den Ring.
   */
  drawBody(ctx) {
    const s = this.def.sprite;
    const cy = this.y + s.offsetY;
    const bloat = this.state === 'windup' ? 1 + 0.3 * this.windupProgress : 1;

    // Mit Sprite uebernimmt die Basisklasse: sie faerbt beim Ausholen rot wie
    // bei JEDEM Gegner und laesst ihn dabei wachsen. "Ausholen ist rot" ist
    // die Sprache des ganzen Spiels — der Giftpilz darf sie nicht brechen,
    // nur weil sein Angriff gruen ist. Das Gift zeigt der Ring.
    if (hasSprite(this.sprite)) {
      super.drawBody(ctx);
      return;
    }

    let fill = this.baseColor;
    if (this.state === 'windup') fill = COLORS.enemyWindup;
    if (this.hitFlash > 0) fill = COLORS.enemyHit;

    ctx.save();
    // Stiel
    ctx.fillStyle = COLORS.giftpilzAccent;
    ctx.fillRect(Math.round(this.x - 4), Math.round(cy - 2), 8, Math.round(s.h / 2));
    // Hut
    const hutW = s.w * bloat;
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.ellipse(Math.round(this.x), Math.round(cy - 3), hutW / 2, s.h / 3, 0, Math.PI, 0);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.lineWidth = 1;
    ctx.stroke();
    // Punkte auf dem Hut
    ctx.fillStyle = COLORS.poison;
    ctx.fillRect(Math.round(this.x - hutW / 4), Math.round(cy - 9), 3, 3);
    ctx.fillRect(Math.round(this.x + hutW / 5), Math.round(cy - 11), 3, 3);
    ctx.restore();
  }

  /** Debug: Reichweite des Verspruehens und Ausdehnung der Wolke. */
  drawDebug(ctx) {
    super.drawDebug(ctx);
    ctx.save();
    ctx.strokeStyle = 'rgba(127,191,74,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(this.x, this.y, POISON.cloudRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(57,208,255,0.3)';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.def.attackRange, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}
