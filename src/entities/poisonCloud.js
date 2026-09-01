/**
 * poisonCloud.js — die Giftwolke des Giftpilzes (Erweiterung 2, Abschnitt 1).
 *
 * "Wolkenradius 80 px, bleibt 3 s liegen. Wer sie beruehrt, ist 2 s vergiftet."
 *
 * Sie ist bewusst KEIN Flugkoerper und liegt deshalb nicht bei den Pfeilen,
 * sondern in einer eigenen Liste (game.clouds): sie bewegt sich nicht, sie
 * verschwindet nicht beim ersten Treffer, und sie wirkt weiter, wenn der
 * Giftpilz laengst tot ist. Das ist ihr eigentlicher Sinn — sie verwandelt
 * Boden in Flaeche, die man meiden muss, statt einen Schlag auszuteilen.
 *
 * Gezeichnet wird sie unter den Figuren, damit man sich selbst im Nebel noch
 * sieht. Eine Wolke, in der man den eigenen Helden verliert, waere kein
 * Hindernis, sondern ein Sichtfehler.
 */

import { POISON, COLORS } from '../config.js';
import { dist } from '../util.js';

export class PoisonCloud {
  /**
   * @param {number} x Mittelpunkt
   * @param {number} y
   * @param {number} [radius]
   */
  constructor(x, y, radius = POISON.cloudRadius) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.age = 0;
    this.spent = false;

    /**
     * Feste Schwaden, damit die Wolke nicht bei jedem Bild neu flimmert.
     * Sie kreisen langsam — das reicht, damit sie lebt.
     */
    this.puffs = [];
    for (let i = 0; i < 7; i++) {
      this.puffs.push({
        angle: Math.random() * Math.PI * 2,
        dist: Math.random() * radius * 0.55,
        size: radius * (0.30 + Math.random() * 0.22),
        drift: (Math.random() - 0.5) * 0.5,
      });
    }
  }

  /** Deckkraft: kurz einblenden, am Ende ausblenden. */
  get alpha() {
    const rest = POISON.cloudLife - this.age;
    if (this.age < POISON.cloudFadeIn) return this.age / POISON.cloudFadeIn;
    if (rest < POISON.cloudFadeOut) return Math.max(0, rest / POISON.cloudFadeOut);
    return 1;
  }

  update(dt, game) {
    this.age += dt;
    if (this.age >= POISON.cloudLife) {
      this.spent = true;
      return;
    }

    const p = game.player;
    if (!p || p.dead) return;
    // Beruehrung: Mittelpunkt des Spielers im Wolkenradius. Gemessen wird
    // nicht die Hitbox — eine Wolke hat keine Kante, an der man haengen bleibt.
    if (dist(this.x, this.y, p.x, p.y) <= this.radius) {
      p.applyPoison(game);
    }
  }

  draw(ctx) {
    const a = this.alpha;
    if (a <= 0) return;

    ctx.save();
    // Grundflaeche: zeigt die Ausdehnung, in der man vergiftet wird.
    ctx.globalAlpha = 0.22 * a;
    ctx.fillStyle = COLORS.poison;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();

    // Schwaden darueber, damit es nach Gas aussieht und nicht nach Teppich.
    ctx.globalAlpha = 0.18 * a;
    ctx.fillStyle = COLORS.poisonDark;
    for (const puff of this.puffs) {
      const ang = puff.angle + this.age * puff.drift;
      ctx.beginPath();
      ctx.arc(this.x + Math.cos(ang) * puff.dist, this.y + Math.sin(ang) * puff.dist,
        puff.size, 0, Math.PI * 2);
      ctx.fill();
    }

    // Kante: ohne sie waere im Gewusel nicht zu erkennen, wo die Wolke aufhoert.
    ctx.globalAlpha = 0.5 * a;
    ctx.strokeStyle = COLORS.poison;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}
