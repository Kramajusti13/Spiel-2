/**
 * characterWindow.js — das Charakterfenster (Erweiterung, Schritt 4).
 *
 * Loest ui/characterScreen.js ab: derselbe Inhalt, aber als HTML-Fenster statt
 * auf dem Canvas gezeichnet. Es ist kein eigenes Feld im Dashboard, sondern
 * legt sich ueber das, woraus es geoeffnet wurde (Abschnitt 2) — vom Dashboard
 * ueber das Dashboard, mit TAB im Level ueber die eingefrorene Welt.
 *
 * Links die Grundwerte samt dem, was Skills und Stufen beitragen; rechts der
 * Skillbaum, in dem freie Punkte vergeben werden. Zuruecksetzen kostet Gold und
 * passiert im Shop — hier steht nur der Hinweis darauf.
 */

import { PLAYER, SKILLS } from '../config.js';
import { SKILL_ORDER, effectText, perRankText, rank, isMaxed, spentPoints } from '../skills.js';
import { isMaxLevel } from '../xp.js';

export class CharacterWindow {
  constructor(game) {
    this.game = game;
    this.el = {
      root: document.getElementById('character-window'),
      free: document.getElementById('char-free'),
      close: document.getElementById('char-close'),
      stats: document.getElementById('char-stat-list'),
      skills: document.getElementById('char-skill-list'),
      hint: document.getElementById('char-hint'),
    };

    /** Skill-ID -> Elemente seiner Zeile. Einmal gebaut, danach beschriftet. */
    this.skillRows = new Map();
    /** Zuletzt verbesserter Skill, leuchtet kurz. */
    this.flashId = null;
    this.flash = 0;
    /** Zuletzt geschriebene Werte — sonst schreibt jedes Bild ins DOM. */
    this.last = {};

    this.buildSkills();
    this.bind();
  }

  bind() {
    this.el.close.addEventListener('click', () => this.game.closeCharacterScreen());

    // Klick auf den dunklen Rand schliesst — wie bei jedem Fenster.
    this.el.root.addEventListener('mousedown', (e) => {
      if (e.target === this.el.root) this.game.closeCharacterScreen();
    });

    // TAB und Esc schliessen. Solange das Fenster offen ist, hoert das Spiel
    // nicht auf die Tastatur (siehe input.js), also braucht es das hier.
    window.addEventListener('keydown', (e) => {
      if (this.game.state !== 'character') return;
      if (e.code === 'Escape' || e.code === 'Tab') {
        e.preventDefault();
        this.game.closeCharacterScreen();
      }
    });
  }

  /** Skillzeilen anlegen. Der Baum ist fest, nur die Stufen aendern sich. */
  buildSkills() {
    this.el.skills.replaceChildren();
    this.skillRows.clear();

    for (const id of SKILL_ORDER) {
      const def = SKILLS.tree[id];

      const row = document.createElement('div');
      row.className = 'skill-row';

      const main = document.createElement('div');
      main.className = 'skill-main';

      const name = document.createElement('span');
      name.className = 'skill-name';
      name.textContent = def.name;

      const effect = document.createElement('span');
      effect.className = 'skill-effect';
      main.append(name, effect);

      // Stufenpunkte: gefuellt = vergeben. Zeigt auf einen Blick, wie weit
      // ein Skill noch geht. Bei 15 Stufen (Erweiterung 2, Abschnitt 5) sind
      // sie in Fuenferbloecke gruppiert — sonst muesste man zaehlen.
      const pips = document.createElement('span');
      pips.className = 'skill-pips';
      const pipEls = [];
      for (let i = 0; i < def.maxRank; i++) {
        const pip = document.createElement('span');
        pip.className = 'skill-pip';
        if ((i + 1) % 5 === 0 && i + 1 < def.maxRank) pip.classList.add('group-end');
        pips.append(pip);
        pipEls.push(pip);
      }

      const buy = document.createElement('button');
      buy.type = 'button';
      buy.className = 'dash-btn skill-buy';
      buy.textContent = '+';
      buy.addEventListener('click', () => this.spend(id));

      row.append(main, pips, buy);
      this.el.skills.append(row);
      this.skillRows.set(id, { row, effect, pipEls, buy });
    }
  }

  spend(id) {
    if (!this.game.spendSkillPoint(id)) return;
    this.flashId = id;
    this.flash = 0.4;
    this.refresh();
  }

  /** Beim Oeffnen: Werte sofort setzen, nicht erst im naechsten Bild. */
  open() {
    this.last = {};
    this.flash = 0;
    this.flashId = null;
    this.refresh();
    // Damit Esc und Leertaste sofort wirken, ohne erst irgendwo hinklicken zu
    // muessen.
    this.el.close.focus({ preventScroll: true });
  }

  /** Laeuft im Spieltakt, solange das Fenster offen ist. */
  update(dt) {
    this.flash = Math.max(0, this.flash - dt);
    this.refresh();
  }

  refresh() {
    const game = this.game;
    // `hero` statt `player`: vom Dashboard aus ist kein Level geladen.
    const p = game.hero;
    const progress = game.progress;

    const free = progress.skillPoints;
    this.set('free', this.el.free, free > 0
      ? `${free} Skillpunkt${free === 1 ? '' : 'e'} frei`
      : 'keine freien Skillpunkte');
    this.el.free.classList.toggle('has-free', free > 0);

    this.refreshStats(p, progress);
    this.refreshSkills(progress, free);

    // Woher der naechste Punkt kommt — seit der Erweiterung ausschliesslich
    // aus Stufenaufstiegen (Abschnitt 1).
    this.set('hint', this.el.hint, isMaxLevel(game.heroLevel)
      ? '1 Skillpunkt pro Stufe · Maximalstufe erreicht'
      : `1 Skillpunkt pro Stufe · noch ${game.xpNeeded - game.xp} XP bis Stufe ${game.heroLevel + 1}`);
  }

  /** Linke Spalte: Grundwerte, der Zugewinn aus Skills und Stufen daneben. */
  refreshStats(p, progress) {
    const game = this.game;
    const plus = (base, now) => (now > base ? `+${Math.round(now - base)}` : '');

    const rows = [
      ['Leben', `${Math.ceil(p.hp)} / ${p.maxHp}`, plus(PLAYER.maxHp, p.maxHp)],
      ['Angriffskraft', `${p.attack}`, plus(PLAYER.attack, p.attack)],
      ['Verteidigung', `${p.defense}`, plus(PLAYER.defense, p.defense)],
      ['Bewegungstempo', `${Math.round(p.speed)} px/s`, plus(PLAYER.speed, p.speed)],
      ['Ausdauer', `${Math.round(p.stamina)} / ${p.maxStamina}`, ''],
      ['Kritische Chance', `${Math.round(PLAYER.critChance * 100)} %`, ''],
      [null],
      // Reihenfolge wie im Ausruestungsfenster. Der Vermerk "dabei" sagt, was
      // mit ins Level kommt — sonst waere unerklaerlich, warum sich eine
      // gekaufte Waffe im Level nicht ziehen laesst (Erweiterung 2, Abschn. 4).
      // Der Schmiede-Bonus steht bei der Waffe, auf die er wirkt — als eigene
      // Zeile unter "Angriffskraft" laese er sich als Teil davon (Erweiterung 2,
      // Abschnitt 7: er erhoeht den WAFFENschaden, nicht die Angriffskraft).
      ['Schwert', geschaerft(p, 'sword', p.swordName), p.carries('sword') ? 'dabei' : ''],
      ['Speer', geschaerft(p, 'spear', p.hasSpear ? p.spearName : 'keiner'),
        p.carries('spear') ? 'dabei' : ''],
      ['Bogen', geschaerft(p, 'bow', p.hasBow ? p.bow.name : 'keiner'),
        p.carries('bow') ? 'dabei' : ''],
      ['Schild', p.hasShield ? `${p.shield.name} (${Math.round(p.blockValue * 100)} %)` : 'keines', ''],
      // Vierter Ausruestungsslot (Erweiterung 2, Abschnitt 7).
      ['Ruestung', p.hasArmor ? `${p.armor.name} (+${p.armor.defense})` : 'keine', ''],
      ['Heiltraenke', `${progress.potions} / ${p.maxPotions}`, ''],
      [null],
      ['Stufe', `${game.heroLevel}`, ''],
      ['Monster besiegt', `${game.kills}`, ''],
      ['Punkte vergeben', `${spentPoints(progress)}`, ''],
    ];

    // Zeilenzahl und -reihenfolge sind fest, also einmal anlegen und danach
    // nur noch beschriften.
    if (this.statRows?.length !== rows.length) this.buildStats(rows.length);

    rows.forEach(([label, value, extra], i) => {
      const el = this.statRows[i];
      if (label === null) {
        el.row.className = 'stat-row stat-gap';
        return;
      }
      el.row.className = 'stat-row';
      setText(el.label, label);
      setText(el.value, value);
      setText(el.extra, extra);
      el.value.classList.toggle('boosted', Boolean(extra));
    });
  }

  buildStats(count) {
    this.el.stats.replaceChildren();
    this.statRows = [];
    for (let i = 0; i < count; i++) {
      const row = document.createElement('div');
      row.className = 'stat-row';
      const label = document.createElement('span');
      label.className = 'stat-label';
      const value = document.createElement('span');
      value.className = 'stat-value';
      const extra = document.createElement('span');
      extra.className = 'stat-extra';
      row.append(label, value, extra);
      this.el.stats.append(row);
      this.statRows.push({ row, label, value, extra });
    }
  }

  /** Rechte Spalte: Wirkung, Stufenpunkte und der Vergabe-Knopf. */
  refreshSkills(progress, free) {
    for (const id of SKILL_ORDER) {
      const el = this.skillRows.get(id);
      const r = rank(progress, id);
      const maxed = isMaxed(progress, id);

      setText(el.effect, r > 0 ? effectText(id, r) : perRankText(id));
      el.pipEls.forEach((pip, i) => {
        pip.classList.toggle('filled', i < r);
        pip.classList.toggle('flash', i === r - 1 && this.flash > 0 && this.flashId === id);
      });

      el.buy.disabled = maxed || free === 0;
      el.buy.title = maxed
        ? 'Maximum erreicht'
        : free === 0 ? 'kein Skillpunkt frei' : `Punkt in ${SKILLS.tree[id].name} vergeben`;
      el.row.classList.toggle('maxed', maxed);
    }
  }

  /** Schreibt nur, wenn sich der Wert geaendert hat. */
  set(key, el, value) {
    if (this.last[key] === value) return;
    this.last[key] = value;
    el.textContent = value;
  }
}

function setText(el, text) {
  if (el.textContent !== text) el.textContent = text;
}

/**
 * Waffenname mit Schmiede-Bonus, z. B. "Rostiges Schwert +10".
 * Ohne Schaerfung bleibt der Name, wie er ist.
 */
function geschaerft(player, weapon, name) {
  const bonus = player.smithBonus(weapon);
  return bonus > 0 ? `${name} +${bonus}` : name;
}
