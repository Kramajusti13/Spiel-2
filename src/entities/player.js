/**
 * player.js — Held: Bewegung (WASD), Blickrichtung zur Maus, Schwerthieb.
 *
 * Schritt 7/8 haengen hier Schild und Ausweichrolle an; die Zustandsmaschine
 * (state) ist dafuer schon vorbereitet.
 */

import { PLAYER, SWORD, SHIELD, BOW, SPEAR, ROLL, SKILLS, XP, COMBAT, CONSUMABLES, POISON, COLORS, SPRITES, TILE } from '../config.js';
import { drawSprite, hasSprite, spriteSize } from '../gfx.js';
import { playSound } from '../audio.js';
import { carries, loadout as loadoutOf, defaultLoadout, owns } from '../weapons.js';
import { armorDef, armorDefense, hasArmor, maxPotions, smithBonus } from '../gear.js';
import { clamp, degToRad, angleDiff, dist } from '../util.js';

/**
 * Dauerhafter Fortschritt des Helden: ueberlebt Tod und Level-Neustart
 * (Abschnitt 9: "Gekaufte Ausruestung und vergebene Skillpunkte bleiben in
 * beiden Faellen erhalten"). Wird von game.js gehalten und in Schritt 14
 * im localStorage gespeichert.
 */
export function createProgress() {
  return {
    swordTier: 0,   // Index in SWORD.tiers
    shieldTier: 0,  // Index in SHIELD.tiers, 0 = kein Schild   (Schritt 7)
    bowTier: -1,    // -1 = noch kein Bogen gekauft             (Schritt 10)
    spearTier: -1,  // -1 = noch kein Speer gekauft   (Erweiterung 2, Abschn. 3)
    /** 'sword' | 'bow' | 'spear' — gefuehrte Waffe (Tasten 1 und 2). */
    weapon: 'sword',
    /**
     * Welche zwei der drei Waffen mit ins Level gehen
     * (Erweiterung 2, Abschnitt 4). Reihenfolge = Tastenbelegung:
     * loadout[0] liegt auf Taste 1, loadout[1] auf Taste 2.
     */
    loadout: defaultLoadout(),
    potions: 0,     // Heiltraenke im Gepaeck                   (Schritt 9)
    // --- Neue Gold-Ausgaben (Erweiterung 2, Abschnitt 7) ---
    armorTier: 0,       // Index in ARMOR.tiers, 0 = keine Ruestung
    potionBeltTier: 0,  // Index in POTION_BELT.tiers, 0 = Startguertel
    /** Waffe -> wie oft beim Schmied geschaerft (0…SMITH.maxPerWeapon). */
    smith: {},
    skillPoints: 0, // noch nicht vergebene Punkte              (Schritt 11)
    skills: {},     // Skillname -> Stufe                       (Schritt 11)
    level: 1,       // Stufe des Helden          (Erweiterung, Abschnitt 1)
    xp: 0,          // XP innerhalb der aktuellen Stufe, nicht insgesamt
  };
}

export class Player {
  /**
   * @param {number} x
   * @param {number} y
   * @param {ReturnType<typeof createProgress>} [progress]
   *   Fortschritt, der einen Tod ueberlebt. Wird als Referenz gehalten, nicht kopiert.
   */
  constructor(x, y, progress = createProgress()) {
    this.progress = progress;
    this.x = x;
    this.y = y;
    this.hw = PLAYER.hitbox.w / 2;
    this.hh = PLAYER.hitbox.h / 2;

    // maxHp, attack, defense und speed sind Getter: sie rechnen die Skillstufen
    // aus dem Fortschritt mit ein (Schritt 11) und aendern sich sofort, wenn ein
    // Punkt vergeben wird.
    this.hp = this.maxHp;

    this.maxStamina = PLAYER.maxStamina;
    this.stamina = this.maxStamina;

    /** Blickrichtung in Radiant — folgt immer der Maus. */
    this.aim = 0;
    this.dead = false;

    /** Angriff. Die Waffenstufe steckt im Fortschritt, nicht in dieser Instanz. */
    this.attackCooldown = 0;
    this.swingTimer = 0;         // > 0, solange der Hieb sichtbar ist
    this.swingHits = new Set();  // Gegner, die dieser Hieb schon getroffen hat

    /** Schild: wird gehalten, solange die rechte Maustaste unten ist. */
    this.blocking = false;
    this.blockFlash = 0;         // > 0 direkt nach einem geblockten Treffer

    /** Bogen: kurzer sichtbarer Rueckstoss nach dem Schuss. */
    this.bowRecoil = 0;

    /**
     * Speer (Erweiterung 2, Abschnitt 3). Die Abklingzeit des Wurfs laeuft
     * getrennt vom normalen Angriffs-Cooldown: 3 s ohne jeden Nahkampf waeren
     * eine Strafe fuers Werfen, und dann wuerde niemand werfen.
     */
    this.throwCooldown = 0;
    this.throwAnim = 0;          // > 0, solange die Wurfbewegung sichtbar ist

    /** Ausweichrolle. */
    this.rollTimer = 0;          // > 0, solange die Rolle laeuft
    this.rollInvulnTimer = 0;    // > 0 = unverwundbar durch die Rolle
    this.rollAngle = 0;
    this.rollTrailTimer = 0;
    this.staminaDelay = 0;       // Wartezeit, bis die Ausdauer wieder steigt
    this.staminaFlash = 0;       // > 0 nach einem Rollversuch ohne Ausdauer

    /**
     * Vergiftung (Erweiterung 2, Abschnitt 1). Restdauer in Sekunden;
     * 0 = nicht vergiftet.
     */
    this.poisonTimer = 0;
    /** Sammelt die Zeit bis zum naechsten Giftschaden. */
    this.poisonTick = 0;

    /** Treffer-Rueckmeldung. */
    this.invulnTimer = 0;
    this.hitFlash = 0;
    this.knockX = 0;
    this.knockY = 0;

    /** Sprite-Schluessel — hier spaeter Animationen einhaengen. */
    this.sprite = 'player';
    this.animTime = 0;
    this.moving = false;
  }

  // --- Grundwerte inkl. Skillstufen (Abschnitt 4) --------------------------

  /** Stufe eines Skills, 0 wenn nie vergeben. */
  skillRank(id) {
    return this.progress.skills?.[id] ?? 0;
  }

  /** Stufe des Helden (Erweiterung, Abschnitt 1). */
  get level() {
    return this.progress.level ?? 1;
  }

  /** Leben: 100 + 20 pro Stufe Vitalitaet + 5 pro Heldenstufe. */
  get maxHp() {
    return PLAYER.maxHp
      + this.skillRank('vitality') * SKILLS.tree.vitality.perRank
      + (this.level - 1) * XP.hpPerLevel;
  }

  /** Angriffskraft: 10 + 3 pro Stufe Staerke. */
  get attack() {
    return PLAYER.attack + this.skillRank('strength') * SKILLS.tree.strength.perRank;
  }

  /**
   * Verteidigung: Grundwert + 2 pro Skillstufe "Ruestung" + der Wert der
   * getragenen Ruestung (Erweiterung 2, Abschnitt 7).
   *
   * Der Skill heisst wie der neue Slot, ist aber etwas anderes: der eine
   * kostet Skillpunkte, der andere Gold. Sie addieren sich.
   */
  get defense() {
    return PLAYER.defense
      + this.skillRank('armor') * SKILLS.tree.armor.perRank
      + armorDefense(this.progress);
  }

  // --- Ruestung (Erweiterung 2, Abschnitt 7) ------------------------------

  get armorTier() {
    return this.progress.armorTier;
  }

  get armor() {
    return armorDef(this.progress);
  }

  get hasArmor() {
    return hasArmor(this.progress);
  }

  /** Wie viele Heiltraenke ins Gepaeck passen — haengt am Trankguertel. */
  get maxPotions() {
    return maxPotions(this.progress);
  }

  /** Dauerhafter Schadensbonus einer Waffe aus der Schmiede. */
  smithBonus(weapon) {
    return smithBonus(this.progress, weapon);
  }

  /**
   * Bewegungstempo: 120 px/s + 8 % pro Stufe Geschwindigkeit, hoechstens
   * +80 % (Erweiterung 2, Abschnitt 5).
   *
   * Der Deckel ist kein Balance-Feinschliff: bei 15 Stufen waeren es +120 %,
   * und damit laeuft der Spieler an Gegnern vorbei, bevor deren Ausholphase
   * ueberhaupt sichtbar wird — die Fairness-Regel liefe ins Leere.
   */
  get speed() {
    const bonus = Math.min(
      SKILLS.caps.speedBonus,
      this.skillRank('speed') * SKILLS.tree.speed.perRank,
    );
    return PLAYER.speed * (1 + bonus);
  }

  /** Waffenstufe — liegt im Fortschritt, damit sie einen Tod ueberlebt. */
  get swordTier() {
    return this.progress.swordTier;
  }

  set swordTier(tier) {
    this.progress.swordTier = tier;
  }

  /** Schwertschaden inkl. Schmiede-Bonus (Erweiterung 2, Abschnitt 7). */
  get swordDamage() {
    return SWORD.tiers[this.swordTier].damage + this.smithBonus('sword');
  }

  get swordName() {
    return SWORD.tiers[this.swordTier].name;
  }

  get potions() {
    return this.progress.potions;
  }

  /**
   * Heiltrank trinken (Taste R, Abschnitt 5). Heilt 40 HP.
   * @returns {boolean} true, wenn wirklich getrunken wurde
   */
  drinkPotion(game) {
    if (this.dead || this.isRolling) return false;
    if (this.progress.potions <= 0) {
      game?.spawnDamageNumber(this.x, this.y - 30, 'Kein Trank', COLORS.textDim);
      return false;
    }
    if (this.hp >= this.maxHp) {
      game?.spawnDamageNumber(this.x, this.y - 30, 'Volles Leben', COLORS.textDim);
      return false;
    }
    playSound('potion');
    if (game) game.stats.potionsUsed += 1;
    // Die Obergrenze des Gepaecks steckt in this.maxPotions (Trankguertel);
    // beim Trinken zaehlt nur, dass ueberhaupt einer da ist.
    this.progress.potions -= 1;
    this.heal(CONSUMABLES.potion.heal);
    game?.spawnDamageNumber(this.x, this.y - 24, `+${CONSUMABLES.potion.heal}`, COLORS.staminaFill);
    return true;
  }

  /**
   * Grundschaden eines Nahkampfangriffs, ohne Kritischen Treffer
   * (Formel: COMBAT.damageFormula). Welche Waffe gerade in der Hand ist,
   * entscheidet der Fortschritt — Schwert oder Speer.
   */
  meleeDamage() {
    return this.weapon === 'spear' ? this.spearDamage() : this.combineDamage(this.swordDamage);
  }

  /**
   * Kennwerte des aktuellen Nahkampfangriffs. Schwert und Speer teilen sich
   * Trefferpruefung und Cooldown-Logik, unterscheiden sich aber in jedem
   * einzelnen Wert — Reichweite, Oeffnungswinkel, Tempo, Rueckstoss.
   */
  get meleeDef() {
    return this.weapon === 'spear'
      ? {
        id: 'spear',
        range: SPEAR.range,
        arc: SPEAR.arc,
        knockback: SPEAR.knockback,
        swingTime: SPEAR.thrustTime,
        cooldown: SPEAR.cooldown,
      }
      : {
        id: 'sword',
        range: SWORD.range,
        arc: SWORD.arc,
        knockback: SWORD.knockback,
        swingTime: SWORD.swingTime,
        cooldown: SWORD.cooldown,
      };
  }

  /** Angriffskraft und Waffenschaden nach der eingestellten Formel verrechnen. */
  combineDamage(weaponDamage) {
    return COMBAT.damageFormula === 'scale'
      ? weaponDamage * (1 + this.attack / 100)
      : this.attack + weaponDamage;
  }

  // --- Bogen (Abschnitt 3 und 5) ------------------------------------------

  get bowTier() {
    return this.progress.bowTier;
  }

  set bowTier(tier) {
    this.progress.bowTier = tier;
  }

  get hasBow() {
    return this.progress.bowTier >= 0;
  }

  get bow() {
    return this.hasBow ? BOW.tiers[this.progress.bowTier] : null;
  }

  // --- Speer (Erweiterung 2, Abschnitt 3) ---------------------------------

  get spearTier() {
    return this.progress.spearTier;
  }

  set spearTier(tier) {
    this.progress.spearTier = tier;
  }

  get hasSpear() {
    return this.progress.spearTier >= 0;
  }

  get spear() {
    return this.hasSpear ? SPEAR.tiers[this.progress.spearTier] : null;
  }

  get spearName() {
    return this.hasSpear ? this.spear.name : 'keiner';
  }

  /**
   * Speerschaden im Nahkampf, inkl. Skill "Speermeister" (+10 % pro Stufe,
   * Abschnitt 5). Ohne Kritischen Treffer — der wird beim Treffer gewuerfelt.
   */
  spearDamage() {
    if (!this.hasSpear) return 0;
    const rank = this.skillRank('spearMaster');
    const waffe = this.spear.damage + this.smithBonus('spear');
    return this.combineDamage(waffe) * (1 + rank * SKILLS.tree.spearMaster.perRank);
  }

  /** Wurfschaden: 100 % des Speerschadens (Abschnitt 3). */
  throwDamage() {
    return this.spearDamage() * SPEAR.throwDamageFactor;
  }

  /** Ist der Speer geworfen bzw. die Abklingzeit noch nicht abgelaufen? */
  get canThrowSpear() {
    return this.hasSpear
      && this.weapon === 'spear'
      && this.throwCooldown <= 0
      && !this.isRolling
      && !this.dead
      && (!this.blocking || SHIELD.canAttackWhileBlocking);
  }

  /** Besitzt der Spieler diese Waffe ueberhaupt? (gekauft, nicht: dabei) */
  owns(w) {
    return owns(this.progress, w);
  }

  /**
   * Die zwei Waffen, die mit ins Level gekommen sind (Abschnitt 4).
   * loadout[0] liegt auf Taste 1, loadout[1] auf Taste 2.
   */
  get loadout() {
    return loadoutOf(this.progress);
  }

  /** Hat der Spieler diese Waffe dabei? Nur damit laesst sich kaempfen. */
  carries(w) {
    return carries(this.progress, w);
  }

  /**
   * Gefuehrte Waffe: 'sword', 'bow' oder 'spear'.
   *
   * Sie muss nicht nur gekauft, sondern auch MITGENOMMEN sein — sonst stuende
   * der Spieler nach einem Wechsel auf dem Dashboard mit einer Waffe im Level,
   * die er zu Hause gelassen hat.
   */
  get weapon() {
    const w = this.progress.weapon ?? 'sword';
    return this.carries(w) ? w : this.loadout[0];
  }

  set weapon(w) {
    this.progress.weapon = w;
  }

  /**
   * Pfeilschaden, inkl. Skill "Bogenschuetze" (+15 % pro Stufe, Schritt 11).
   * Ohne Kritischen Treffer — der wird beim Einschlag gewuerfelt.
   */
  arrowDamage() {
    if (!this.hasBow) return 0;
    const rank = this.skillRank('archery');
    // Der Schmiede-Bonus zaehlt zum Waffenschaden, wird also VOR dem
    // Skill-Faktor addiert — genau wie eine hoehere Waffenstufe.
    const waffe = this.bow.damage + this.smithBonus('bow');
    return this.combineDamage(waffe) * (1 + rank * SKILLS.tree.archery.perRank);
  }

  /** Cooldown der aktuellen Waffe — auch fuer die Anzeige im HUD. */
  get attackCooldownMax() {
    if (this.weapon === 'bow') return BOW.cooldown / this.bow.fireRateFactor;
    return this.meleeDef.cooldown;
  }

  /**
   * Waffe wechseln (Tasten 1 und 2).
   * @returns {boolean} true, wenn gewechselt wurde
   */
  setWeapon(w, game) {
    if (!this.carries(w)) {
      // Gewechselt wird nur zwischen den Leveln (Abschnitt 4) — im Level ist
      // das hier eine Sackgasse und soll das auch sagen.
      const grund = this.owns(w) ? 'Nicht dabei' : 'Nicht gekauft';
      game?.spawnDamageNumber(this.x, this.y - 30, grund, COLORS.textDim);
      return false;
    }
    if (this.weapon === w) return false;
    this.weapon = w;
    // Der angefangene Hieb gilt nicht weiter, der Cooldown schon.
    this.swingTimer = 0;
    return true;
  }

  /**
   * Speer werfen (Taste F, Abschnitt 3). Danach 3 s Abklingzeit.
   *
   * Der Wurf setzt zusaetzlich den normalen Angriffs-Cooldown: man kann nicht
   * im selben Moment werfen und zustossen. Die 3 s betreffen aber nur den
   * naechsten Wurf — nahkaempfen geht sofort weiter.
   * @returns {boolean} true, wenn wirklich geworfen wurde
   */
  throwSpear(game) {
    if (!this.carries('spear')) {
      game?.spawnDamageNumber(this.x, this.y - 30,
        this.hasSpear ? 'Speer nicht dabei' : 'Kein Speer', COLORS.textDim);
      return false;
    }
    if (this.weapon !== 'spear') {
      game?.spawnDamageNumber(this.x, this.y - 30, 'Speer nicht gewaehlt', COLORS.textDim);
      return false;
    }
    if (!this.canThrowSpear) {
      if (this.throwCooldown > 0) {
        game?.spawnDamageNumber(this.x, this.y - 30,
          `Wurf ${this.throwCooldown.toFixed(1)} s`, COLORS.textDim);
      }
      return false;
    }

    playSound('bow');
    this.throwCooldown = SPEAR.throwCooldown;
    this.attackCooldown = Math.max(this.attackCooldown, SPEAR.cooldown);
    this.throwAnim = SPEAR.throwWindup;
    this.swingTimer = 0;

    const mx = this.x + Math.cos(this.aim) * SPEAR.muzzleOffset;
    const my = this.y + Math.sin(this.aim) * SPEAR.muzzleOffset;
    game.spawnThrownSpear(mx, my, this.aim, this.throwDamage());
    return true;
  }

  /** Pfeil abschiessen (Linksklick mit Bogen). */
  shootArrow(game) {
    playSound('bow');
    this.attackCooldown = this.attackCooldownMax;
    this.bowRecoil = BOW.recoilTime;
    const mx = this.x + Math.cos(this.aim) * BOW.muzzleOffset;
    const my = this.y + Math.sin(this.aim) * BOW.muzzleOffset;
    game.spawnArrow(mx, my, this.aim, this.arrowDamage());
  }

  /** Schildstufe — liegt wie die Waffenstufe im Fortschritt. */
  get shieldTier() {
    return this.progress.shieldTier;
  }

  set shieldTier(tier) {
    this.progress.shieldTier = clamp(tier, 0, SHIELD.tiers.length - 1);
  }

  get shield() {
    return SHIELD.tiers[this.shieldTier];
  }

  get hasShield() {
    return this.shieldTier > 0;
  }

  /**
   * Schadensreduktion beim Blocken: Schildwert plus Skill "Blockmeister"
   * (+10 % pro Stufe), gedeckelt durch SHIELD.maxBlock.
   *
   * Die Obergrenze gilt fuer die Summe aus beidem (Erweiterung 2,
   * Abschnitt 5: 90 % inklusive Schild). Bei 15 Stufen braechte der Skill
   * allein 150 % — ein geblockter Treffer wuerde sonst heilen.
   */
  get blockValue() {
    const fromSkill = this.skillRank('blockMaster') * SKILLS.tree.blockMaster.perRank;
    return Math.min(SHIELD.maxBlock, this.shield.block + fromSkill);
  }

  /** Bewegungstempo inklusive Schildgewicht und erhobenem Schild. */
  get moveSpeed() {
    let speed = this.speed * (1 - this.shield.speedPenalty);
    if (this.blocking) speed *= SHIELD.moveSpeedFactor;
    return speed;
  }

  get canAttack() {
    return this.attackCooldown <= 0
      && !this.isRolling
      && (!this.blocking || SHIELD.canAttackWhileBlocking);
  }

  get isSwinging() {
    return this.swingTimer > 0;
  }

  get isRolling() {
    return this.rollTimer > 0;
  }

  /** Rollen geht nur mit genug Ausdauer und nicht mitten in einer Rolle. */
  get canRoll() {
    return !this.dead && !this.isRolling && this.stamina >= PLAYER.rollCost;
  }

  /** Wirkt das Gift gerade? */
  get isPoisoned() {
    return this.poisonTimer > 0;
  }

  /**
   * Phase des gruenen Blinkens. Getrennt vom Treffer-Blinken, das die Figur
   * ganz ausblendet — hier bleibt sie sichtbar und wird nur eingefaerbt,
   * sonst waere man waehrend der ganzen Vergiftung schlecht zu sehen.
   */
  get poisonBlink() {
    return this.isPoisoned
      && Math.floor(this.poisonTimer / POISON.blinkInterval) % 2 === 0;
  }

  /**
   * Vergiften (Erweiterung 2, Abschnitt 1).
   *
   * Die Dauer wird GESETZT, nicht addiert: "Vergiftung stapelt nicht, aber die
   * Dauer wird bei erneuter Beruehrung auf 2 s zurueckgesetzt." Wer in der
   * Wolke stehen bleibt, verliert also stetig Leben, aber nie schneller.
   */
  applyPoison(game) {
    const neu = !this.isPoisoned;
    this.poisonTimer = POISON.duration;
    // Fuer die Quest "Schaffe ein Level, ohne vergiftet zu werden"
    // (Erweiterung 2, Abschnitt 8). Einmal vergiftet zaehlt der Durchgang
    // nicht mehr — auch wenn das Gift laengst abgeklungen ist.
    if (game) game.poisonedThisRun = true;
    if (neu) {
      this.poisonTick = 0;
      game?.spawnDamageNumber(this.x, this.y - 34, 'Vergiftet', COLORS.poison);
    }
  }

  /**
   * Giftschaden ueber die Zeit.
   *
   * Er geht ABSICHTLICH an Verteidigung, Schild und Treffer-Gnadenfrist
   * vorbei. Wuerde er wie ein Treffer verrechnet, zoege eine Drachenschuppe
   * (+18 Verteidigung) die 8 Schaden auf das Minimum von 1 herunter — die
   * Ruestung waere ein Totalgegenmittel und der Giftpilz als Gegner erledigt.
   * Gift ist kein Schlag, den man abwehrt, sondern ein Zustand.
   */
  updatePoison(dt, game) {
    if (!this.isPoisoned || this.dead) return;
    this.poisonTimer = Math.max(0, this.poisonTimer - dt);
    this.poisonTick += dt;

    // Winzige Toleranz: 15 Bilder a 1/60 s ergeben 0,24999999… und damit
    // knapp NICHT die 0,25 des Intervalls. Ohne sie faellt ueber eine
    // 2-Sekunden-Vergiftung gelegentlich ein Tick weg (14 statt 16 Schaden).
    while (this.poisonTick >= POISON.tickInterval - 1e-9) {
      this.poisonTick -= POISON.tickInterval;
      const schaden = Math.max(1, Math.round(POISON.damagePerSecond * POISON.tickInterval));
      this.hp = clamp(this.hp - schaden, 0, this.maxHp);
      game?.spawnDamageNumber(this.x + randTiny(), this.y - 20, schaden, COLORS.poison);
      if (this.hp <= 0) {
        this.hp = 0;
        this.dead = true;
        this.blocking = false;
        this.rollTimer = 0;
        this.rollInvulnTimer = 0;
        this.poisonTimer = 0;
        playSound('playerDeath');
        game?.onPlayerDeath();
        return;
      }
    }
  }

  /**
   * Unverwundbar durch Treffer-Gnadenfrist ODER Ausweichrolle.
   * Getrennt gehalten, weil nur die Treffer-Variante blinkt.
   */
  get isInvulnerable() {
    return this.invulnTimer > 0 || this.rollInvulnTimer > 0;
  }

  update(dt, input, camera, level, game) {
    if (this.dead) return;

    // --- Blickrichtung: immer zur Maus, unabhaengig von der Laufrichtung ---
    const world = camera.screenToWorld(input.mouse.x, input.mouse.y);
    this.aim = Math.atan2(world.y - this.y, world.x - this.x);

    const mv = input.moveVector();

    // --- Ausweichrolle: Leertaste (Abschnitt 3) ---
    if (input.wasPressed('Space')) this.tryRoll(mv, game);

    // --- Heiltrank: Taste R (Abschnitt 5) ---
    if (input.wasPressed('KeyR')) this.drinkPotion(game);

    // --- Waffenwechsel: Taste 1 und 2 (Erweiterung 2, Abschnitt 4) ---
    // Welche Waffe auf welcher Taste liegt, entscheidet die Ausruestungswahl
    // auf dem Dashboard. Die Steuerung im Level bleibt damit unveraendert:
    // zwei Waffen, zwei Tasten — egal welche drei man besitzt.
    const dabei = this.loadout;
    if (input.wasPressed('Digit1', 'Numpad1') && dabei[0]) this.setWeapon(dabei[0], game);
    if (input.wasPressed('Digit2', 'Numpad2') && dabei[1]) this.setWeapon(dabei[1], game);

    // --- Speerwurf: Taste F (Erweiterung 2, Abschnitt 3) ---
    // Nicht auf Rechtsklick: der haelt seit Schritt 7 das Schild, und ein
    // Speerkaempfer soll den Block nicht aufgeben muessen.
    if (input.wasPressed('KeyF')) this.throwSpear(game);

    // --- Schild: Rechtsklick halten (Abschnitt 3). Waehrend der Rolle unten. ---
    this.blocking = this.hasShield && input.mouseDown[2] && !this.isRolling;

    // --- Bewegung ---
    let dx;
    let dy;
    if (this.isRolling) {
      // Waehrend der Rolle zaehlt nur die Rollrichtung — kein Lenken, kein Rueckstoss.
      this.moving = true;
      const rollSpeed = ROLL.distance / ROLL.duration;
      // Nur den Rest der Rolle abarbeiten, damit ROLL.distance exakt eingehalten
      // wird und nicht vom Bildtakt abhaengt.
      const rollDt = Math.min(dt, this.rollTimer);
      dx = Math.cos(this.rollAngle) * rollSpeed * rollDt;
      dy = Math.sin(this.rollAngle) * rollSpeed * rollDt;
    } else {
      this.moving = mv.x !== 0 || mv.y !== 0;
      const speed = this.moveSpeed;
      dx = mv.x * speed * dt;
      dy = mv.y * speed * dt;

      // Rueckstoss nach einem Treffer klingt ab.
      if (this.knockX !== 0 || this.knockY !== 0) {
        dx += this.knockX * dt;
        dy += this.knockY * dt;
        const decay = Math.exp(-PLAYER.knockbackDecay * dt);
        this.knockX *= decay;
        this.knockY *= decay;
        if (Math.abs(this.knockX) < 1) this.knockX = 0;
        if (Math.abs(this.knockY) < 1) this.knockY = 0;
      }
    }

    level.moveEntity(this, dx, dy);
    if (this.moving) this.animTime += dt;

    this.updateStamina(dt, game);
    this.updatePoison(dt, game);

    // --- Timer ---
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    this.swingTimer = Math.max(0, this.swingTimer - dt);
    this.invulnTimer = Math.max(0, this.invulnTimer - dt);
    this.hitFlash = Math.max(0, this.hitFlash - dt);
    this.blockFlash = Math.max(0, this.blockFlash - dt);
    this.rollTimer = Math.max(0, this.rollTimer - dt);
    this.rollInvulnTimer = Math.max(0, this.rollInvulnTimer - dt);
    this.staminaFlash = Math.max(0, this.staminaFlash - dt);
    this.bowRecoil = Math.max(0, this.bowRecoil - dt);
    this.throwCooldown = Math.max(0, this.throwCooldown - dt);
    this.throwAnim = Math.max(0, this.throwAnim - dt);

    // --- Angriff: Linksklick — Hieb oder Pfeil, je nach Waffe ---
    if (input.mousePressed[0] && this.canAttack) {
      if (this.weapon === 'bow') this.shootArrow(game);
      else this.startSwing(game);   // Schwerthieb oder Speerstoss
    }
    // Waehrend des Schwungs weiter Treffer pruefen (Gegner koennen hineinlaufen).
    if (this.isSwinging) this.resolveSwingHits(game);
  }

  /**
   * Rolle starten. Gerollt wird in Laufrichtung; steht der Spieler,
   * rollt er in Blickrichtung (also dorthin, wo die Maus ist).
   *
   * @param {{x: number, y: number}} mv Laufrichtung aus WASD
   */
  tryRoll(mv, game) {
    if (!this.canRoll) {
      // Sichtbare Rueckmeldung statt stillem Nichts.
      if (!this.dead && !this.isRolling) {
        this.staminaFlash = 0.3;
        game?.spawnDamageNumber(this.x, this.y - 30, 'Ausdauer', COLORS.staminaEmpty);
      }
      return false;
    }

    this.rollAngle = mv.x !== 0 || mv.y !== 0 ? Math.atan2(mv.y, mv.x) : this.aim;
    this.rollTimer = ROLL.duration;
    this.rollInvulnTimer = ROLL.invulnTime;
    this.rollTrailTimer = 0;
    this.blocking = false;
    this.knockX = 0;
    this.knockY = 0;

    playSound('roll');
    this.stamina = clamp(this.stamina - PLAYER.rollCost, 0, this.maxStamina);
    this.staminaDelay = PLAYER.staminaRegenDelay;
    return true;
  }

  /** Ausdauer: erst nach einer Pause von 1 s regeneriert sie mit 20/s. */
  updateStamina(dt, game) {
    if (this.staminaDelay > 0) {
      this.staminaDelay = Math.max(0, this.staminaDelay - dt);
    } else if (this.stamina < this.maxStamina) {
      this.stamina = clamp(this.stamina + PLAYER.staminaRegen * dt, 0, this.maxStamina);
    }

    // Nachbilder waehrend der Rolle.
    if (this.isRolling && game) {
      this.rollTrailTimer -= dt;
      if (this.rollTrailTimer <= 0) {
        this.rollTrailTimer = ROLL.trailInterval;
        game.spawnRollTrail(this.x, this.y);
      }
    }
  }

  /**
   * Nahkampfangriff starten — Schwerthieb oder Speerstoss. Beide laufen durch
   * dieselbe Trefferpruefung, nur mit anderen Werten (meleeDef).
   */
  startSwing(game) {
    const def = this.meleeDef;
    playSound('swing');
    this.attackCooldown = def.cooldown;
    this.swingTimer = def.swingTime;
    this.swingHits.clear();
    this.resolveSwingHits(game);
  }

  /**
   * Trifft alles im Kegel (Reichweite + Oeffnungswinkel) vor dem Spieler.
   *
   * Der Speer hat hier den weiten, aber schmalen Kegel, das Schwert den
   * kurzen und breiten — daher kommt der Unterschied im Spielgefuehl, ohne
   * dass es zwei getrennte Trefferroutinen braucht.
   */
  resolveSwingHits(game) {
    const def = this.meleeDef;
    const halfArc = degToRad(def.arc) / 2;
    for (const enemy of game.enemies) {
      // Unverwundbare Gegner (springender Frosch, abgetauchtes Krokodil)
      // werden uebersprungen — der Hieb gilt fuer sie nicht als verbraucht.
      if (enemy.dead || enemy.invulnerable || this.swingHits.has(enemy)) continue;

      // Reichweite bis zum Rand der Gegner-Hitbox messen, nicht bis zur Mitte —
      // sonst fuehlen sich grosse Gegner unfair weit weg an.
      const d = dist(this.x, this.y, enemy.x, enemy.y) - Math.max(enemy.hw, enemy.hh);
      if (d > def.range) continue;

      const angleToEnemy = Math.atan2(enemy.y - this.y, enemy.x - this.x);
      if (Math.abs(angleDiff(this.aim, angleToEnemy)) > halfArc) continue;

      this.swingHits.add(enemy);
      const crit = Math.random() < PLAYER.critChance;
      const raw = this.meleeDamage();
      const damage = Math.round(crit ? raw * PLAYER.critMultiplier : raw);
      enemy.takeDamage(damage, this.aim, def.knockback, game, crit, def.id);
    }
  }

  /**
   * Kommt der Angriff von vorne, also im Blockwinkel?
   * @param {number} fromAngle Richtung, in die der Treffer schiebt
   *                           (zeigt vom Angreifer zum Spieler)
   */
  isBlockedFrom(fromAngle) {
    if (!this.blocking) return false;
    // Der Angreifer steht genau entgegengesetzt zur Schubrichtung.
    const toAttacker = fromAngle + Math.PI;
    return Math.abs(angleDiff(this.aim, toAttacker)) <= degToRad(SHIELD.blockArc) / 2;
  }

  /**
   * Schaden vom Gegner. Gibt true zurueck, wenn der Treffer gezaehlt hat.
   *
   * @param {number} amount    Rohschaden des Angreifers
   * @param {number} fromAngle Schubrichtung des Treffers (Angreifer -> Spieler)
   */
  takeDamage(amount, fromAngle, game) {
    if (this.dead || this.isInvulnerable) return false;

    // Schild zuerst: prozentuale Reduktion, aber nur von vorne (Abschnitt 3).
    const blocked = this.isBlockedFrom(fromAngle);
    const afterBlock = blocked ? amount * (1 - this.blockValue) : amount;

    // Verteidigung zieht ab, mindestens 1 Schaden bleibt (Abschnitt 4).
    const damage = Math.max(1, Math.round(afterBlock - this.defense));
    this.hp = clamp(this.hp - damage, 0, this.maxHp);

    this.invulnTimer = PLAYER.invulnTime;
    this.hitFlash = 0.12;

    const knockback = PLAYER.knockback * (blocked ? SHIELD.blockedKnockbackFactor : 1);
    this.knockX = Math.cos(fromAngle) * knockback;
    this.knockY = Math.sin(fromAngle) * knockback;

    if (blocked) {
      // Zaehler fuer die Quest "Blocke 15 Angriffe" (Erweiterung, Schritt 7).
      game.stats.blocks += 1;
      playSound('block');
      this.blockFlash = 0.18;
      game.spawnDamageNumber(this.x, this.y - 30, 'Geblockt', COLORS.shieldRim);
      game.spawnHitSpark(this.x + Math.cos(this.aim) * 16, this.y + Math.sin(this.aim) * 16,
        fromAngle + Math.PI);
      game.shake(2, 0.1);
    } else {
      playSound('playerHit');
      game.shake(4, 0.16);
    }
    game.spawnDamageNumber(this.x, this.y - 18, damage, COLORS.blood);

    if (this.hp <= 0) {
      this.hp = 0;
      this.dead = true;
      // Weder erhobenes Schild noch laufende Rolle an einer gefallenen Figur.
      this.blocking = false;
      this.rollTimer = 0;
      this.rollInvulnTimer = 0;
      playSound('playerDeath');
      game.onPlayerDeath();
    }
    return true;
  }

  heal(amount) {
    this.hp = clamp(this.hp + amount, 0, this.maxHp);
  }

  draw(ctx) {
    const s = PLAYER.sprite;
    const cy = this.y + s.offsetY;

    // Nach einem Treffer blinken (Abschnitt 6). Die Rolle blinkt nicht —
    // dort soll man die Bewegung sehen.
    if (this.invulnTimer > 0 && !this.dead) {
      const phase = Math.floor(this.invulnTimer / PLAYER.blinkInterval) % 2;
      if (phase === 1) return;
    }

    // Weicher Schatten am Boden — macht die Figur auf dem Boden "aufliegend".
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    ctx.ellipse(Math.round(this.x), Math.round(this.y + this.hh), 9, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Treffer-Aufblitzen geht vor; sonst der gruene Puls der Vergiftung
    // ("Der Spieler blinkt gruen, solange er vergiftet ist", Abschnitt 1).
    //
    // Das Gift faerbt schwaecher ein als ein Treffer: der Blitz dauert 0,12 s
    // und darf die Figur ueberstrahlen, die Vergiftung dauert 2 s. Bei voller
    // Deckkraft waere der Held zwei Sekunden lang ein gruener Klotz statt
    // einer erkennbaren Figur.
    const vergiftet = this.hitFlash <= 0 && this.poisonBlink;
    const tint = this.hitFlash > 0
      ? COLORS.playerHit
      : vergiftet ? COLORS.poison : null;
    const tintAlpha = vergiftet ? 0.5 : 0.85;
    // Leichtes Wippen beim Laufen (faellt weg, sobald ein Sprite mit Animation da ist).
    const bob = !hasSprite(this.sprite) && this.moving && !this.isRolling
      ? Math.sin(this.animTime * 12) * 1.5
      : 0;

    if (this.isRolling) {
      // Rolle: die Figur ueberschlaegt sich einmal und duckt sich dabei.
      const t = 1 - this.rollTimer / ROLL.duration;   // 0 -> 1
      const duck = 1 - 0.35 * Math.sin(t * Math.PI);
      const rs = spriteSize(this.sprite, s, SPRITES.scale.player);
      drawSprite(ctx, this.sprite, this.x, cy + (rs.h * (1 - duck)) / 2,
        rs.w * (1 + 0.25 * Math.sin(t * Math.PI)), rs.h * duck, COLORS.player, {
          tint,
          tintAlpha,
          rotation: this.rollAngle + t * Math.PI * 2,
        });
      if (this.isSwinging) this._drawSwing(ctx);
      return;
    }

    const size = spriteSize(this.sprite, s, SPRITES.scale.player);
    drawSprite(ctx, this.sprite, this.x, cy + bob, size.w, size.h, COLORS.player, {
      tint,
      tintAlpha,
      frame: Math.floor(this.animTime * 8),
      // Sprites zeigen nach rechts; nach links wird gespiegelt.
      flipX: Math.cos(this.aim) < 0,
    });

    // Die Blickrichtung ist spielrelevant (Blockwinkel, Trefferkegel), deshalb
    // wird die Marke auch mit Sprite gezeichnet — nur kleiner.
    this._drawAimMarker(ctx, cy + bob);
    if (this.weapon === 'bow') this._drawBow(ctx, cy + bob);
    if (this.weapon === 'spear') this._drawSpear(ctx, cy + bob);
    if (this.blocking) this._drawShield(ctx, cy + bob);
    if (this.isSwinging) this._drawSwing(ctx);
  }

  /**
   * Speer in der Hand, in Blickrichtung. Zeigt zugleich an, welche Waffe
   * gewaehlt ist — und ob der Wurf bereit ist: solange die Abklingzeit laeuft,
   * ist die Spitze stumpf eingefaerbt.
   */
  _drawSpear(ctx, cy) {
    // Waehrend des Stosses steckt der Speer im _drawSwing-Teil, hier nur die
    // Ruhehaltung; die kurze Wurfbewegung zieht ihn nach hinten.
    if (this.isSwinging) return;
    const pull = this.throwAnim > 0 ? -8 : 0;
    const ready = this.throwCooldown <= 0;
    const length = SPEAR.range * 0.42;

    ctx.save();
    ctx.translate(Math.round(this.x), Math.round(cy));
    ctx.rotate(this.aim);
    // Schaft
    ctx.strokeStyle = COLORS.spear;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(pull - 6, 3);
    ctx.lineTo(pull + length, 3);
    ctx.stroke();
    // Spitze — stumpf, solange kein Wurf drin ist
    ctx.fillStyle = ready ? COLORS.spearTip : COLORS.textDim;
    ctx.beginPath();
    ctx.moveTo(pull + length + 6, 3);
    ctx.lineTo(pull + length - 1, 0);
    ctx.lineTo(pull + length - 1, 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  /**
   * Bogen in Blickrichtung: gespannter Bogen, der nach dem Schuss kurz
   * zurueckschnellt. Zeigt zugleich an, welche Waffe gewaehlt ist.
   */
  _drawBow(ctx, cy) {
    const recoil = this.bowRecoil / BOW.recoilTime;   // 1 -> 0
    const ready = this.attackCooldown <= 0;
    const radius = 13 - recoil * 3;

    ctx.save();
    ctx.translate(Math.round(this.x), Math.round(cy));
    ctx.rotate(this.aim);
    // Bogenholz
    ctx.strokeStyle = COLORS.bow;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(4, 0, radius, -1.1, 1.1);
    ctx.stroke();
    // Sehne — gespannt, solange nachgeladen wird
    ctx.strokeStyle = ready ? COLORS.arrow : COLORS.textDim;
    ctx.lineWidth = 1;
    const pull = ready ? 0 : 4;
    ctx.beginPath();
    ctx.moveTo(4 + Math.cos(-1.1) * radius, Math.sin(-1.1) * radius);
    ctx.lineTo(4 - pull, 0);
    ctx.lineTo(4 + Math.cos(1.1) * radius, Math.sin(1.1) * radius);
    ctx.stroke();
    ctx.restore();
  }

  /**
   * Erhobenes Schild: Bogen ueber den geschuetzten Winkel, in Blickrichtung.
   * Der Spieler sieht damit unmittelbar, welche Seite gedeckt ist.
   */
  _drawShield(ctx, cy) {
    const half = degToRad(SHIELD.blockArc) / 2;
    const radius = 17;
    const flash = this.blockFlash > 0;

    ctx.save();
    // Gefuellter Sektor, damit die geschuetzte Seite auf einen Blick klar ist.
    ctx.globalAlpha = flash ? 0.55 : 0.22;
    ctx.fillStyle = flash ? COLORS.shieldBlock : COLORS.shield;
    ctx.beginPath();
    ctx.moveTo(this.x, cy);
    ctx.arc(this.x, cy, radius + 4, this.aim - half, this.aim + half);
    ctx.closePath();
    ctx.fill();

    // Kraeftige Kante = das eigentliche Schild.
    ctx.globalAlpha = 1;
    ctx.strokeStyle = flash ? COLORS.shieldBlock : COLORS.shieldRim;
    ctx.lineWidth = flash ? 5 : 3;
    ctx.beginPath();
    ctx.arc(this.x, cy, radius, this.aim - half, this.aim + half);
    ctx.stroke();
    ctx.restore();
  }

  /**
   * Marke in Blickrichtung, damit das Zielen ablesbar ist.
   * Ohne Sprite ist sie die "Nase" der Platzhalterfigur, mit Sprite ein
   * kleiner Punkt am Rand — dort, wo Schwert und Schild wirken.
   */
  _drawAimMarker(ctx, cy) {
    const withSprite = hasSprite(this.sprite);
    const radius = withSprite ? 15 : 9;
    const size = withSprite ? 3 : 6;
    const nx = this.x + Math.cos(this.aim) * radius;
    const ny = cy + Math.sin(this.aim) * radius;
    ctx.save();
    if (withSprite) ctx.globalAlpha = 0.75;
    ctx.fillStyle = COLORS.playerAccent;
    ctx.fillRect(Math.round(nx) - size / 2, Math.round(ny) - size / 2, size, size);
    ctx.restore();
  }

  /**
   * Sichtbarer Angriff. Das Schwert schwingt als Bogen durch den Kegel, der
   * Speer stoesst geradeaus vor und wieder zurueck — die Bewegung erklaert
   * dem Spieler den Unterschied zwischen den beiden Waffen ohne ein Wort.
   */
  _drawSwing(ctx) {
    if (this.weapon === 'spear') {
      this._drawThrust(ctx);
      return;
    }
    const t = 1 - this.swingTimer / SWORD.swingTime; // 0 -> 1
    const halfArc = degToRad(SWORD.arc) / 2;
    const angle = this.aim - halfArc + halfArc * 2 * t;

    ctx.save();
    ctx.globalAlpha = 0.85 * (1 - t * 0.6);
    ctx.strokeStyle = COLORS.swing;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(this.x, this.y, SWORD.range * 0.82, angle - 0.35, angle + 0.35);
    ctx.stroke();

    // Klinge als kurzer Strich am Bogenende.
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(this.x + Math.cos(angle) * 12, this.y + Math.sin(angle) * 12);
    ctx.lineTo(this.x + Math.cos(angle) * SWORD.range, this.y + Math.sin(angle) * SWORD.range);
    ctx.stroke();
    ctx.restore();
  }

  /**
   * Speerstoss: der Schaft faehrt bis zur vollen Reichweite aus und kommt
   * zurueck. Die Spitze markiert genau die Reichweite, die auch trifft —
   * was man sieht, ist was zaehlt.
   */
  _drawThrust(ctx) {
    const t = 1 - this.swingTimer / SPEAR.thrustTime;   // 0 -> 1
    // Hin und zurueck in einer Bewegung: bei t = 0,5 ist der Speer ganz vorn.
    const reach = Math.sin(t * Math.PI);
    const tip = SPEAR.range * (0.42 + 0.58 * reach);
    const cos = Math.cos(this.aim);
    const sin = Math.sin(this.aim);

    ctx.save();
    ctx.globalAlpha = 0.9;
    // Schaft
    ctx.strokeStyle = COLORS.spear;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(this.x + cos * (tip - SPEAR.range * 0.55), this.y + sin * (tip - SPEAR.range * 0.55));
    ctx.lineTo(this.x + cos * tip, this.y + sin * tip);
    ctx.stroke();
    // Spitze
    ctx.strokeStyle = COLORS.spearTip;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(this.x + cos * (tip - 7), this.y + sin * (tip - 7));
    ctx.lineTo(this.x + cos * (tip + 3), this.y + sin * (tip + 3));
    ctx.stroke();
    ctx.restore();
  }

  /** Debug: Hitbox, Reichweite und Trefferkegel. */
  drawDebug(ctx) {
    ctx.strokeStyle = COLORS.debug;
    ctx.lineWidth = 1;
    ctx.strokeRect(
      Math.round(this.x - this.hw) + 0.5,
      Math.round(this.y - this.hh) + 0.5,
      this.hw * 2 - 1,
      this.hh * 2 - 1,
    );
    // Trefferkegel der aktuell gefuehrten Nahkampfwaffe — beim Speer weit und
    // schmal, beim Schwert kurz und breit.
    const def = this.meleeDef;
    const halfArc = degToRad(def.arc) / 2;
    ctx.strokeStyle = 'rgba(57,208,255,0.5)';
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.arc(this.x, this.y, def.range, this.aim - halfArc, this.aim + halfArc);
    ctx.closePath();
    ctx.stroke();

    // Blockwinkel (120°) — zeigt, was das Schild gerade deckt.
    if (this.hasShield) {
      const halfBlock = degToRad(SHIELD.blockArc) / 2;
      ctx.strokeStyle = this.blocking ? 'rgba(185,190,201,0.9)' : 'rgba(185,190,201,0.25)';
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.arc(this.x, this.y, 30, this.aim - halfBlock, this.aim + halfBlock);
      ctx.closePath();
      ctx.stroke();
    }
  }
}

/** Kleine Streuung, damit aufeinanderfolgende Giftzahlen nicht uebereinander liegen. */
function randTiny() {
  return (Math.random() - 0.5) * 14;
}

/** Sucht einen freien Startpunkt, falls die Karte am Startpunkt zugebaut wurde. */
export function findFreeSpot(level, x, y, hw, hh) {
  if (!level.isBoxBlocked(x, y, hw, hh)) return { x, y };
  for (let radius = 1; radius <= 8; radius++) {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const nx = x + dx * TILE;
        const ny = y + dy * TILE;
        if (!level.isBoxBlocked(nx, ny, hw, hh)) return { x: nx, y: ny };
      }
    }
  }
  return { x, y };
}
