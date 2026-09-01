/**
 * characterScreen.js — Charakterfenster auf TAB (Abschnitt 3 und 4).
 *
 * Links die Grundwerte inkl. dessen, was die Skills beitragen; rechts der
 * Skillbaum, in dem freie Punkte vergeben werden. Das Spiel pausiert solange.
 *
 * Zuruecksetzen (Respec) kostet 100 Gold und passiert im Shop — hier steht nur
 * der Hinweis darauf.
 */

import { COLORS, PLAYER, SKILLS, UI, VIEW } from '../config.js';
import { drawText, fillRect, strokeRect } from '../gfx.js';
import { Button, Menu, drawPanel } from './menu.js';
import { SKILL_ORDER, effectText, perRankText, rank, isMaxed, spentPoints, killsToNextPoint } from '../skills.js';

const PANEL_W = 720;
const PANEL_H = 420;
const ROW_H = 44;
const ROW_GAP = 6;

export class CharacterScreen {
  constructor(game) {
    this.game = game;
    this.age = 0;
    this.flashId = null;    // zuletzt verbesserter Skill, leuchtet kurz
    this.flash = 0;
    this.menu = new Menu([]);
    this.panelX = 0;
    this.panelY = 0;
  }

  open() {
    this.age = 0;
    this.flash = 0;
    this.build();
    this.layout();
    this.menu.selectFirstEnabled();
    this.menu.usingMouse = false;
  }

  build() {
    const progress = this.game.progress;
    this.menu.buttons = SKILL_ORDER.map((id, i) => {
      const b = new Button({
        label: SKILLS.tree[id].name,
        keys: [`Digit${i + 1}`, `Numpad${i + 1}`],
        keyLabel: String(i + 1),
        enabled: () => progress.skillPoints > 0 && !isMaxed(progress, id),
        onActivate: () => this.spend(id),
      });
      b.w = PANEL_W / 2 - 40;
      b.h = ROW_H;
      b.skillId = id;
      return b;
    });
    this.menu.selected = 0;
  }

  layout() {
    this.panelX = Math.round((VIEW.width - PANEL_W) / 2);
    this.panelY = Math.round((VIEW.height - PANEL_H) / 2);
    const x = this.panelX + PANEL_W / 2 + 16;
    let y = this.panelY + 74;
    for (const b of this.menu.buttons) {
      b.x = Math.round(x);
      b.y = Math.round(y);
      y += ROW_H + ROW_GAP;
    }
  }

  refresh() {
    const progress = this.game.progress;
    for (const b of this.menu.buttons) {
      const id = b.skillId;
      const r = rank(progress, id);
      b.hint = r > 0 ? effectText(id, r) : perRankText(id);
      b.note = isMaxed(progress, id) ? 'Maximum erreicht' : 'kein Skillpunkt frei';
    }
  }

  spend(id) {
    if (this.game.spendSkillPoint(id)) {
      this.flashId = id;
      this.flash = 0.35;
    }
  }

  update(dt, input) {
    this.age += dt;
    this.flash = Math.max(0, this.flash - dt);
    this.refresh();
    this.layout();
    this.menu.update(input, this.age >= 0.15);
  }

  draw(ctx) {
    const game = this.game;
    const p = game.player;
    const progress = game.progress;

    fillRect(ctx, 0, 0, VIEW.width, VIEW.height, COLORS.menuOverlay);
    drawPanel(ctx, this.panelX, this.panelY, PANEL_W, PANEL_H);

    drawText(ctx, 'CHARAKTER', this.panelX + 24, this.panelY + 26, COLORS.text,
      '24px "Segoe UI", system-ui, sans-serif', 'left', 'middle');

    // Freie Punkte — die Zahl, auf die es hier ankommt.
    const free = progress.skillPoints;
    drawText(ctx, free > 0 ? `${free} Skillpunkt${free === 1 ? '' : 'e'} frei` : 'keine freien Skillpunkte',
      this.panelX + PANEL_W - 24, this.panelY + 26,
      free > 0 ? COLORS.menuAccent : COLORS.textDim, UI.hud.font, 'right', 'middle');

    this.drawStats(ctx, p, progress);
    this.drawSkills(ctx, progress);

    const footY = this.panelY + PANEL_H - 26;
    drawText(ctx, `1 Punkt pro ${SKILLS.killsPerPoint} Monster · noch ${killsToNextPoint(game.kills)} bis zum naechsten`,
      this.panelX + 24, footY, COLORS.textDim, UI.hud.fontSmall);
    drawText(ctx, 'TAB oder Esc schliesst · Zuruecksetzen im Shop',
      this.panelX + PANEL_W - 24, footY, COLORS.menuTextDisabled, UI.hud.fontSmall, 'right');
  }

  /** Linke Spalte: aktuelle Grundwerte, Skillanteil in Klammern. */
  drawStats(ctx, p, progress) {
    const x = this.panelX + 24;
    let y = this.panelY + 74;
    const bonus = (base, now, unit = '') => {
      const diff = now - base;
      return diff > 0 ? `  (+${unit === '%' ? Math.round(diff) : Math.round(diff)}${unit})` : '';
    };

    const rows = [
      ['Leben', `${Math.ceil(p.hp)} / ${p.maxHp}`, bonus(PLAYER.maxHp, p.maxHp)],
      ['Angriffskraft', `${p.attack}`, bonus(PLAYER.attack, p.attack)],
      ['Verteidigung', `${p.defense}`, bonus(PLAYER.defense, p.defense)],
      ['Bewegungstempo', `${Math.round(p.speed)} px/s`, bonus(PLAYER.speed, p.speed)],
      ['Ausdauer', `${Math.round(p.stamina)} / ${p.maxStamina}`, ''],
      ['Kritische Chance', `${Math.round(PLAYER.critChance * 100)} %`, ''],
      ['', '', ''],
      ['Schwert', p.swordName, ''],
      ['Bogen', p.hasBow ? p.bow.name : 'keiner', ''],
      ['Schild', p.hasShield ? `${p.shield.name} (${Math.round(p.blockValue * 100)} %)` : 'keines', ''],
      ['Heiltraenke', `${progress.potions}`, ''],
      ['', '', ''],
      ['Monster besiegt', `${this.game.kills}`, ''],
      ['Punkte vergeben', `${spentPoints(progress)}`, ''],
    ];

    for (const [label, value, extra] of rows) {
      if (label) {
        drawText(ctx, label, x, y, COLORS.textDim, UI.hud.fontSmall);
        drawText(ctx, value + extra, x + PANEL_W / 2 - 56, y,
          extra ? COLORS.menuAccent : COLORS.text, UI.hud.fontSmall, 'right');
      }
      y += 18;
    }
  }

  /** Rechte Spalte: Skills mit Stufenanzeige. */
  drawSkills(ctx, progress) {
    this.menu.buttons.forEach((b, i) => {
      b.draw(ctx, i === this.menu.selected && !this.menu.usingMouse);

      // Stufenpunkte rechts im Knopf: gefuellt = vergeben.
      const id = b.skillId;
      const def = SKILLS.tree[id];
      const r = rank(progress, id);
      const pipSize = 8;
      const gap = 4;
      const totalW = def.maxRank * (pipSize + gap) - gap;
      const px = b.x + b.w - totalW - 34;
      const py = b.y + b.h / 2 - pipSize / 2;
      for (let s = 0; s < def.maxRank; s++) {
        const filled = s < r;
        const cx = px + s * (pipSize + gap);
        fillRect(ctx, cx, py, pipSize, pipSize,
          filled ? (this.flashId === id && this.flash > 0 ? '#f4d67a' : COLORS.menuAccent) : COLORS.hpBack);
        strokeRect(ctx, cx, py, pipSize, pipSize, COLORS.hpBorder, 1);
      }
    });
  }
}
