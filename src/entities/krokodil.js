/**
 * krokodil.js — Hinterhalt-Gegner des Sumpfes (Erweiterung 2, Abschnitt 1).
 *
 * Kreislauf:
 *   submerged (3 s, unangreifbar, 180 px/s, Schatten wandert)
 *   -> windup (0,5 s, Schatten haelt an und waechst)
 *   -> strike  (springt heraus, 45 Schaden im Umkreis)
 *   -> surfaced (4 s an der Oberflaeche — das einzige Fenster, in dem es
 *      Schaden nehmen kann)
 *   -> wieder abtauchen
 *
 * DIE BEIDEN PFLICHTTEILE (Dokument: "Beides ist Pflicht, kein Detail"):
 *
 *   Der Schatten laeuft die GANZE Tauchzeit mit und zeigt, wo das Krokodil
 *   gerade ist. Er ist die einzige Information, die der Spieler in diesen
 *   3 Sekunden hat. Ohne ihn kaeme der Biss aus dem Nichts, und 45 Schaden
 *   ohne Vorwarnung sind kein Gegner, sondern ein Wuerfelwurf.
 *
 *   Das 4-Sekunden-Fenster an der Oberflaeche ist die einzige Gelegenheit,
 *   ihm ueberhaupt Schaden zuzufuegen. Ohne es waere es unbesiegbar. Deshalb
 *   haengt `invulnerable` hier an genau einer Bedingung: "nicht aufgetaucht".
 */

import { COLORS } from '../config.js';
import { hasSprite } from '../gfx.js';
import { dist } from '../util.js';
import { Enemy } from './enemy.js';

export class Krokodil extends Enemy {
  constructor(x, y) {
    super('krokodil', x, y);
    this.animTime = Math.random() * 3;
    // Beginnt abgetaucht: der Spieler sieht zuerst den Schatten, nicht das Tier.
    this.setState('submerged');
  }

  /**
   * Nur an der Oberflaeche verwundbar (Abschnitt 1). Waehrend des Ausholens
   * steckt es noch im Boden — auch dann trifft man es nicht.
   */
  get invulnerable() {
    return this.state !== 'surfaced' && this.state !== 'idle';
  }

  /** Steckt es gerade im Boden? Dann wird nur der Schatten gezeichnet. */
  get isSubmerged() {
    return this.state === 'submerged' || this.state === 'windup';
  }

  think(dt, game) {
    const player = game.player;
    const d = dist(this.x, this.y, player.x, player.y);

    if (this.state === 'idle') {
      if (d <= this.def.aggroRadius && !player.dead) this.setState('submerged');
      return;
    }
    // Den Spieler nur verlieren, wenn es gerade nicht mitten im Angriff steckt.
    if (this.state === 'submerged' && (d > this.def.loseAggroRadius || player.dead)) {
      this.setState('idle');
      return;
    }

    this.facing = Math.atan2(player.y - this.y, player.x - this.x);

    // --- Abgetaucht: schnell hinterher, Schatten wandert mit ---
    if (this.state === 'submerged') {
      const heading = this.steer(player, game.level, dt);
      game.level.moveEntity(this,
        Math.cos(heading) * this.def.submergedSpeed * dt,
        Math.sin(heading) * this.def.submergedSpeed * dt);

      // Nah genug ODER Tauchzeit um: herausspringen. Der zweite Teil ist
      // wichtig — ohne ihn bliebe ein Krokodil, das den Spieler nie erreicht,
      // fuer immer unangreifbar unter der Erde.
      if (d <= this.def.attackRange || this.stateTime >= this.def.submergeTime) {
        this.setState('windup');
      }
      return;
    }

    // --- Ausholen: der Schatten haelt an und wird groesser ---
    if (this.state === 'windup') {
      if (this.stateTime >= this.def.windupTime) {
        this.bite(game);
        this.setState('strike');
      }
      return;
    }

    if (this.state === 'strike') {
      if (this.stateTime >= this.def.strikeTime) this.setState('surfaced');
      return;
    }

    // --- Aufgetaucht: langsam, sichtbar, angreifbar. Das Zeitfenster. ---
    if (this.state === 'surfaced') {
      // Es kriecht traege weiter, damit es kein Stillleben ist — aber langsam
      // genug, dass man es sicher trifft.
      const heading = this.steer(player, game.level, dt);
      game.level.moveEntity(this,
        Math.cos(heading) * this.def.speed * dt,
        Math.sin(heading) * this.def.speed * dt);
      if (this.stateTime >= this.def.surfaceTime) this.setState('submerged');
    }
  }

  /** Der Biss: trifft alles im Umkreis, nicht nur genau vor der Schnauze. */
  bite(game) {
    const player = game.player;
    if (player.dead) return;
    if (dist(this.x, this.y, player.x, player.y) > this.def.strikeRadius) return;
    const angle = Math.atan2(player.y - this.y, player.x - this.x);
    player.takeDamage(this.def.damage, angle, game);
    game.shake(6, 0.2);
  }

  /**
   * Der Schatten am Boden. Waehrend des Tauchens wandert er mit, beim
   * Ausholen steht er still und waechst — das ist die Ausholphase, die man
   * sehen MUSS, bevor der Biss kommt.
   */
  drawShadow(ctx) {
    const wachstum = this.state === 'windup'
      ? 1 + (this.def.shadowGrowth - 1) * this.windupProgress
      : 1;
    const r = this.def.shadowRadius * wachstum;
    // Beim Tauchen atmet er leicht, damit er lebendig wirkt.
    const puls = this.state === 'submerged' ? 1 + 0.06 * Math.sin(this.animTime * 6) : 1;

    ctx.save();
    ctx.fillStyle = COLORS.lurkShadow;
    ctx.beginPath();
    ctx.ellipse(this.x, this.y, r * 1.35 * puls, r * puls, 0, 0, Math.PI * 2);
    ctx.fill();

    // Helle Kante: auf dunklem Sumpfboden waere ein reiner Schattenfleck
    // kaum zu sehen — und dann waere die Vorwarnung keine.
    ctx.strokeStyle = COLORS.lurkShadowEdge;
    ctx.lineWidth = this.state === 'windup' ? 2.5 : 1.5;
    ctx.setLineDash(this.state === 'windup' ? [] : [5, 4]);
    ctx.beginPath();
    ctx.ellipse(this.x, this.y, r * 1.35 * puls, r * puls, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Beim Ausholen zusaetzlich zwei Augen ueber der Oberflaeche — das
    // klassische Krokodil-Bild und ein zweiter, unmissverstaendlicher Hinweis.
    if (this.state === 'windup') {
      const p = this.windupProgress;
      ctx.globalAlpha = 0.4 + 0.6 * p;
      ctx.fillStyle = COLORS.enemyWindup;
      const ax = Math.cos(this.facing) * 5;
      const ay = Math.sin(this.facing) * 5;
      const nx = -Math.sin(this.facing) * 5;
      const ny = Math.cos(this.facing) * 5;
      ctx.fillRect(Math.round(this.x + ax + nx) - 1, Math.round(this.y + ay + ny) - 1, 3, 3);
      ctx.fillRect(Math.round(this.x + ax - nx) - 1, Math.round(this.y + ay - ny) - 1, 3, 3);
    }
    ctx.restore();
  }

  /**
   * Abgetaucht wird nur der Schatten gezeichnet — kein Koerper, kein
   * HP-Balken. Der HP-Balken haette dort ohnehin keinen Sinn: treffen kann
   * man es nicht.
   */
  draw(ctx) {
    if (this.dead) {
      super.draw(ctx);
      return;
    }
    if (this.isSubmerged) {
      this.drawShadow(ctx);
      return;
    }
    super.draw(ctx);
  }

  /**
   * Platzhalter: langgestreckter Koerper mit Schnauze. Beim Herausspringen
   * kurz gestreckt, damit der Biss auch ohne Sprite Wucht hat.
   */
  drawBody(ctx) {
    if (hasSprite(this.sprite)) {
      super.drawBody(ctx);
      return;
    }
    const s = this.def.sprite;
    const cy = this.y + s.offsetY;
    let fill = this.baseColor;
    if (this.state === 'strike') fill = COLORS.enemyWindup;
    if (this.hitFlash > 0) fill = COLORS.enemyHit;

    const stretch = this.state === 'strike' ? 1.25 : 1;

    ctx.save();
    ctx.translate(Math.round(this.x), Math.round(cy));
    ctx.rotate(this.facing);
    // Rumpf
    ctx.fillStyle = fill;
    ctx.fillRect(-s.w / 2, -s.h / 3, s.w * stretch * 0.75, (s.h * 2) / 3);
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.lineWidth = 1;
    ctx.strokeRect(-s.w / 2 + 0.5, -s.h / 3 + 0.5, s.w * stretch * 0.75 - 1, (s.h * 2) / 3 - 1);
    // Schnauze in Blickrichtung
    ctx.fillStyle = COLORS.krokodilAccent;
    ctx.fillRect(s.w * 0.25 * stretch, -4, 10 * stretch, 8);
    // Rueckenkamm
    ctx.fillStyle = COLORS.krokodilAccent;
    for (let i = 0; i < 3; i++) ctx.fillRect(-s.w / 4 + i * 6, -s.h / 3 - 2, 3, 3);
    ctx.restore();
  }

  /** Debug: Trefferradius des Bisses und die Reichweite, ab der es hochkommt. */
  drawDebug(ctx) {
    super.drawDebug(ctx);
    ctx.save();
    ctx.strokeStyle = 'rgba(217,86,63,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.def.strikeRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}
