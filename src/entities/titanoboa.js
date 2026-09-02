/**
 * titanoboa.js — Endboss des Urwalds (Erweiterung 2, Abschnitt 1).
 *
 * PHASE 1 (100 % - 50 % HP) — abgetaucht, verschlingt:
 *   stalk    Der Schatten wandert sichtbar ueber den Boden auf den Spieler zu.
 *   warn     1,5 s lang bleibt der Schatten STEHEN und pulsiert.
 *   lunge    Sie schiesst hoch. Wer noch auf dem Schatten steht: 100 Schaden.
 *   surfaced 3 s ueber der Erde, angreifbar. Das ist das Zeitfenster.
 *
 * PHASE 2 (unter 50 % HP) — offener Kampf:
 *   shedding Sie haeutet sich. Kurze Pause, in der sie wehrlos ist und der
 *            Spieler frei Schaden macht. Der Moment belohnt die halbe Leiste
 *            und kuendigt an, dass es jetzt ernster wird.
 *   Danach taucht sie nicht mehr ab: +20 Schaden, 30 % schneller, groesser.
 *
 * DIE 1,5 SEKUNDEN SIND KEINE VERHANDLUNGSSACHE.
 * Das Verschlingen macht 100 Schaden — bei 200-400 HP ein Viertel bis die
 * Haelfte des Lebens in einem Treffer. Deshalb steht der Schatten die letzte
 * eineinhalb Sekunden still: nur ein Angriff, dem man sicher entkommen kann,
 * ist ein Kampf. Sonst waere der Endkampf ein Gluecksspiel.
 *
 * Der Schatten wandert dem Spieler NUR in der stalk-Phase nach. Sobald die
 * Vorwarnung laeuft, ist der Zielpunkt festgenagelt — ein Schatten, der bis
 * zuletzt mitzieht, waere keine Warnung, sondern eine Ankuendigung.
 */

import { COLORS, SPRITES } from '../config.js';
import { hasSprite, drawSprite, spriteSize } from '../gfx.js';
import { playSound } from '../audio.js';
import { dist } from '../util.js';
import { Enemy } from './enemy.js';

export class Titanoboa extends Enemy {
  constructor(x, y) {
    super('titanoboa', x, y);
    this.lastPhase = 1;
    /** Festgenagelter Einschlagpunkt, sobald die Vorwarnung laeuft. */
    this.targetX = x;
    this.targetY = y;
    /** true = die Haeutung ist gelaufen, Phase 2 kaempft offen. */
    this.hasShed = false;
    // Titanoboa insgesamt staerker: mehr HP/Schaden/Tempo (Kopie des def,
    // damit die Werte in config.js unberuehrt bleiben).
    this.def = {
      ...this.def,
      maxHp: Math.round(this.def.maxHp * 1.4),
      damage: Math.round(this.def.damage * 1.3),
      speed: this.def.speed * 1.15,
      swallowDamage: Math.round(this.def.swallowDamage * 1.2),
      phase2DamageBonus: Math.round(this.def.phase2DamageBonus * 1.5),
    };
    this.maxHp = this.def.maxHp;
    this.hp = this.maxHp;
    /** Cooldown zwischen den schnellen Bissen waehrend der Haeutung. */
    this.shedBiteTimer = 0;
    this.setState('stalk');
  }

  /** 1 oder 2 — haengt am verbleibenden Leben. */
  get phase() {
    return this.hp / this.maxHp > this.def.phaseThresholds[0] ? 1 : 2;
  }

  /**
   * Angreifbar ist sie nur aufgetaucht, waehrend der Haeutung und im offenen
   * Kampf von Phase 2. Abgetaucht (stalk/warn/lunge) geht jeder Treffer daneben.
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

  think(dt, game) {
    const player = game.player;

    // --- Phasenwechsel: die Haeutung. Einmalig, bei 50 % Leben. ---
    if (this.phase === 2 && !this.hasShed && this.state !== 'shedding') {
      this.startShedding(game);
      return;
    }

    if (this.state === 'shedding') {
      // Waehrend der Haeutung: immun (siehe invulnerable), sehr schnell und mit
      // kurzem Angriffsmuster — jagt den Spieler und beisst in schnellen
      // Intervallen, wechselt Winkel unvorhersehbar.
      this.shedBiteTimer -= dt;
      const heading = this.steer(player, game.level, dt);
      const shedSpeed = this.def.speed * 1.9;
      game.level.moveEntity(this,
        Math.cos(heading) * shedSpeed * dt,
        Math.sin(heading) * shedSpeed * dt);
      this.facing = Math.atan2(player.y - this.y, player.x - this.x);
      if (this.shedBiteTimer <= 0
          && dist(this.x, this.y, player.x, player.y) <= this.def.biteRadius + 10) {
        if (!player.dead) {
          const angle = Math.atan2(player.y - this.y, player.x - this.x);
          player.takeDamage(this.def.damage + this.damageBonus, angle, game);
          game.shake(4, 0.15);
        }
        // Nachladen leicht variabel — macht das Muster unvorhersehbar.
        this.shedBiteTimer = 0.35 + Math.random() * 0.25;
      }
      if (this.stateTime >= this.def.sheddingTime) {
        this.hasShed = true;
        // Hitbox waechst mit — "groessere Trefferflaeche" ist woertlich gemeint.
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

    if (this.phase === 2 && this.hasShed) this.thinkOpen(dt, game, player);
    else this.thinkSubmerged(dt, game, player);
  }

  startShedding(game) {
    this.setState('shedding');
    playSound('bossPhase');
    game.shake(6, 0.3);
    game.spawnDamageNumber(this.x, this.y - this.hh - 20, 'Sie haeutet sich',
      COLORS.titanoboaAccent, true);
  }

  // --- Phase 1 -------------------------------------------------------------

  /**
   * Abgetaucht: Schatten wandert heran, bleibt stehen, dann schiesst sie hoch.
   */
  thinkSubmerged(dt, game, player) {
    // Schatten wandert dem Spieler nach.
    if (this.state === 'stalk') {
      const heading = this.steer(player, game.level, dt);
      game.level.moveEntity(this,
        Math.cos(heading) * this.def.submergedSpeed * dt,
        Math.sin(heading) * this.def.submergedSpeed * dt);
      // Nah genug oder lange genug gepirscht? Dann Ziel festnageln.
      const d = dist(this.x, this.y, player.x, player.y);
      if (d <= this.def.swallowRadius || this.stateTime >= this.def.stalkTime) {
        this.targetX = this.x;
        this.targetY = this.y;
        this.setState('warn');
      }
      return;
    }

    // Vorwarnung: der Schatten steht still und pulsiert. Hier entscheidet
    // sich alles — und der Spieler hat volle 1,5 s dafuer.
    if (this.state === 'warn') {
      if (this.stateTime >= this.def.lungeWarning) {
        this.swallow(game);
        this.setState('lunge');
      }
      return;
    }

    if (this.state === 'lunge') {
      if (this.stateTime >= 0.2) this.setState('surfaced');
      return;
    }

    // Aufgetaucht: 3 s angreifbar, dann wieder abtauchen.
    if (this.state === 'surfaced') {
      if (this.stateTime >= this.def.surfaceTime) this.setState('stalk');
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

  // --- Phase 2 -------------------------------------------------------------

  /** Offener Kampf: hinterher und beissen, mit sichtbarer Ausholphase. */
  thinkOpen(dt, game, player) {
    const d = dist(this.x, this.y, player.x, player.y);

    if (this.state === 'windup') {
      if (this.stateTime >= this.def.windupTime) {
        this.bite(game);
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

    if (d <= this.def.biteRange) {
      this.setState('windup');
      return;
    }
    const heading = this.steer(player, game.level, dt);
    const speed = this.def.speed * this.speedFactor;
    game.level.moveEntity(this, Math.cos(heading) * speed * dt, Math.sin(heading) * speed * dt);
  }

  /** Biss: Grundschaden 50, mit dem Phase-2-Bonus also 70. */
  bite(game) {
    const player = game.player;
    if (player.dead) return;
    if (dist(this.x, this.y, player.x, player.y) > this.def.biteRadius) return;
    const angle = Math.atan2(player.y - this.y, player.x - this.x);
    player.takeDamage(this.def.damage + this.damageBonus, angle, game);
    game.shake(6, 0.2);
  }

  // --- Darstellung ---------------------------------------------------------

  /**
   * Der wandernde Schatten. In der Vorwarnung steht er still, pulsiert und
   * wechselt auf die Warnfarbe — drei Signale fuer dieselbe Aussage, weil ein
   * verpasstes Signal hier 100 Schaden kostet.
   */
  drawShadow(ctx) {
    const warnt = this.state === 'warn';
    const t = warnt ? this.stateTime / this.def.lungeWarning : 0;
    const cx = warnt ? this.targetX : this.x;
    const cy = warnt ? this.targetY : this.y;
    // Der Puls wird zum Schluss schneller — die Zeit laeuft ab.
    const puls = warnt ? 1 + 0.16 * Math.sin(this.stateTime * (7 + 10 * t)) : 1;
    const r = this.def.shadowRadius * puls;

    ctx.save();
    ctx.fillStyle = COLORS.boaShadow;
    ctx.beginPath();
    ctx.ellipse(cx, cy, r * 1.4, r, 0, 0, Math.PI * 2);
    ctx.fill();

    // Der Trefferbereich als Ring: er zeigt genau, wovon man weg muss.
    ctx.strokeStyle = warnt ? COLORS.boaShadowWarn : COLORS.lurkShadowEdge;
    ctx.lineWidth = warnt ? 3 : 1.5;
    ctx.setLineDash(warnt ? [] : [6, 5]);
    ctx.globalAlpha = warnt ? 0.55 + 0.45 * t : 0.8;
    ctx.beginPath();
    ctx.arc(cx, cy, this.def.swallowRadius, 0, Math.PI * 2);
    ctx.stroke();
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
    super.draw(ctx);
  }

  drawBody(ctx) {
    const s = this.def.sprite;
    const gross = this.sizeFactor;
    const cy = this.y + s.offsetY;

    if (hasSprite(this.sprite)) {
      const size = spriteSize(this.sprite, s, SPRITES.scale.titanoboa);
      // Waehrend der Haeutung blitzt sie hell — der sichtbare Belohnungsmoment.
      const tint = this.hitFlash > 0
        ? COLORS.enemyHit
        : this.state === 'shedding'
          ? COLORS.titanoboaAccent
          : this.state === 'windup' || this.state === 'strike' ? COLORS.enemyWindup : null;
      drawSprite(ctx, this.sprite, this.x, cy, size.w * gross, size.h * gross,
        this.baseColor, { tint, tintAlpha: this.state === 'shedding' ? 0.7 : 0.6 });
      return;
    }

    let fill = this.baseColor;
    if (this.state === 'shedding') fill = COLORS.titanoboaAccent;
    if (this.state === 'windup' || this.state === 'strike') fill = COLORS.enemyWindup;
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
    // Kopf in Blickrichtung
    ctx.fillStyle = COLORS.titanoboaAccent;
    ctx.fillRect(w / 2 - 6, -8, 14, 16);
    ctx.restore();
  }

  /** Der Lebensbalken des Bosses zeigt zusaetzlich die Phase. */
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
