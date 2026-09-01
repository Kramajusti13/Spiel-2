/**
 * mainMenu.js — Bildschirm beim Programmstart (Abschnitt 9).
 *
 * "Weiterspielen" gibt es nur mit vorhandenem Spielstand. "Neues Spiel" fragt
 * nach, wenn ein Stand da ist — sonst waere ein Fehlklick der Verlust von
 * Stunden Spielzeit.
 */

import { COLORS, LEVELS, UI, VIEW } from '../config.js';
import { drawText, fillRect } from '../gfx.js';
import { Button, Menu, drawPanel } from './menu.js';
import { hasSave, saveSummary } from '../save.js';

const PANEL_W = 420;
const ROW_H = 52;
const ROW_GAP = 10;

export class MainMenu {
  constructor(game) {
    this.game = game;
    this.age = 0;
    /** true = "Neues Spiel" wartet auf Bestaetigung. */
    this.confirming = false;
    this.menu = new Menu([]);
    this.summary = null;
    this.panelY = 0;
  }

  open() {
    this.age = 0;
    this.confirming = false;
    this.summary = saveSummary();
    this.build();
    this.layout();
    this.menu.selectFirstEnabled();
    this.menu.usingMouse = false;
  }

  build() {
    const game = this.game;
    const buttons = [];

    if (this.confirming) {
      // Sicherheitsabfrage: der gefaehrliche Knopf ist NICHT vorausgewaehlt.
      buttons.push(this.makeButton({
        label: 'Abbrechen',
        hint: 'Spielstand behalten',
        keys: ['Escape'],
        keyLabel: 'Esc',
        onActivate: () => { this.confirming = false; this.build(); this.layout(); this.menu.selected = 0; },
      }));
      buttons.push(this.makeButton({
        label: 'Ja, alles loeschen',
        hint: this.summary ? `weg waere: ${this.summary}` : '',
        onActivate: () => game.newGame(),
      }));
    } else {
      if (hasSave()) {
        buttons.push(this.makeButton({
          label: 'Weiterspielen',
          hint: this.summary ?? '',
          onActivate: () => game.continueGame(),
        }));
      }
      buttons.push(this.makeButton({
        label: 'Neues Spiel',
        hint: hasSave() ? 'loescht den vorhandenen Spielstand' : 'im Wald geht es los',
        onActivate: () => {
          if (hasSave()) {
            this.confirming = true;
            this.build();
            this.layout();
            this.menu.selected = 0;   // auf "Abbrechen"
          } else {
            game.newGame();
          }
        },
      }));
    }

    this.menu.buttons = buttons;
    this.menu.selected = 0;
  }

  makeButton(opt) {
    const b = new Button(opt);
    b.w = PANEL_W - UI.menu.panelPadding * 2;
    b.h = ROW_H;
    return b;
  }

  layout() {
    const panelH = this.menu.buttons.length * (ROW_H + ROW_GAP) + 60;
    this.panelY = Math.round(VIEW.height / 2 - 10);
    const x = Math.round((VIEW.width - PANEL_W) / 2) + UI.menu.panelPadding;
    let y = this.panelY + 24;
    for (const b of this.menu.buttons) {
      b.x = x;
      b.y = Math.round(y);
      y += ROW_H + ROW_GAP;
    }
    this.panelH = panelH;
  }

  update(dt, input) {
    this.age += dt;
    this.layout();
    this.menu.update(input, this.age >= 0.15);
  }

  draw(ctx) {
    fillRect(ctx, 0, 0, VIEW.width, VIEW.height, COLORS.background);

    // Titel
    drawText(ctx, 'LOOT & BLADE', VIEW.width / 2, 150, COLORS.text,
      '52px "Segoe UI", system-ui, sans-serif', 'center', 'middle');
    drawText(ctx, 'Top-Down-Pixel-Action', VIEW.width / 2, 190, COLORS.textDim,
      UI.hud.font, 'center', 'middle');

    const panelX = Math.round((VIEW.width - PANEL_W) / 2);
    drawPanel(ctx, panelX, this.panelY, PANEL_W, this.panelH);

    if (this.confirming) {
      drawText(ctx, 'Spielstand wirklich loeschen?', VIEW.width / 2, this.panelY - 16,
        COLORS.blood, UI.hud.font, 'center', 'middle');
    }

    this.menu.buttons.forEach((b, i) => b.draw(ctx, i === this.menu.selected && !this.menu.usingMouse));

    // Steuerung kurz erklaeren — es gibt kein Tutorial.
    const lines = [
      'WASD laufen · Maus zielen · Linksklick angreifen',
      'Rechtsklick blocken · Leertaste rollen · 1/2 Waffe',
      'TAB Charakter · E Ausgang · R Trank · Esc Pause · M Ton',
    ];
    lines.forEach((line, i) => {
      drawText(ctx, line, VIEW.width / 2, VIEW.height - 74 + i * 16,
        COLORS.menuTextDisabled, UI.hud.fontSmall, 'center', 'middle');
    });

    drawText(ctx, `${LEVELS.length} Level · Ork-Haeuptling als Boss`,
      VIEW.width / 2, this.panelY + this.panelH + 22,
      COLORS.textDim, UI.hud.fontSmall, 'center', 'middle');
  }
}
