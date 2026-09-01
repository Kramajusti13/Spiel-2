/**
 * pauseMenu.js — Esc waehrend des Spiels (Abschnitt 3).
 *
 * Die Welt steht still; das Level bleibt im Hintergrund sichtbar, damit klar
 * ist, dass nur pausiert und nicht abgebrochen wurde.
 */

import { COLORS, LEVELS, UI, VIEW } from '../config.js';
import { drawText, fillRect } from '../gfx.js';
import { Button, Menu, drawPanel } from './menu.js';

const PANEL_W = 380;
const ROW_H = 46;
const ROW_GAP = 8;

export class PauseMenu {
  constructor(game) {
    this.game = game;
    this.age = 0;
    this.confirmingMenu = false;
    this.menu = new Menu([]);
    this.panelY = 0;
    this.panelH = 0;
  }

  open() {
    this.age = 0;
    this.confirmingMenu = false;
    this.build();
    this.layout();
    this.menu.selected = 0;
    this.menu.usingMouse = false;
  }

  build() {
    const game = this.game;
    const make = (opt) => {
      const b = new Button(opt);
      b.w = PANEL_W - UI.menu.panelPadding * 2;
      b.h = ROW_H;
      return b;
    };

    if (this.confirmingMenu) {
      this.menu.buttons = [
        make({ label: 'Doch weiterspielen', keys: ['Escape'], keyLabel: 'Esc',
          onActivate: () => { this.confirmingMenu = false; this.build(); this.layout(); } }),
        make({ label: 'Ja, zum Hauptmenue',
          hint: 'der Fortschritt seit dem letzten Level geht verloren',
          onActivate: () => game.toMainMenu() }),
      ];
    } else {
      this.menu.buttons = [
        make({ label: 'Weiter', hint: 'zurueck ins Level', keys: ['Escape'], keyLabel: 'Esc',
          onActivate: () => game.resumeFromPause() }),
        make({ label: 'Charakter', hint: 'Werte ansehen, Skillpunkte vergeben',
          keys: ['Tab'], keyLabel: 'TAB',
          onActivate: () => game.openCharacterScreen('playing') }),
        make({ label: 'Level aufgeben', hint: 'zurueck aufs Dashboard — Gold dieses Durchgangs ist weg',
          onActivate: () => game.giveUpLevel() }),
        make({ label: 'Level neu starten', hint: 'alle Monster leben wieder',
          keys: ['KeyR'], keyLabel: 'R',
          // Dieselbe Stufe wie im laufenden Durchgang — ein Neustart darf
          // nicht heimlich auf Normal zurueckfallen.
          // Dieselbe Stufe wie im laufenden Durchgang — ein Neustart darf
          // nicht heimlich auf Normal zurueckfallen.
          onActivate: () => game.startLevel(game.levelIndex, game.difficulty) }),
        make({ label: 'Hauptmenue',
          onActivate: () => { this.confirmingMenu = true; this.build(); this.layout(); this.menu.selected = 0; } }),
      ];
    }
    this.menu.selected = 0;
  }

  layout() {
    this.panelH = this.menu.buttons.length * (ROW_H + ROW_GAP) + 90;
    this.panelY = Math.round((VIEW.height - this.panelH) / 2);
    const x = Math.round((VIEW.width - PANEL_W) / 2) + UI.menu.panelPadding;
    let y = this.panelY + 62;
    for (const b of this.menu.buttons) {
      b.x = x;
      b.y = Math.round(y);
      y += ROW_H + ROW_GAP;
    }
  }

  update(dt, input) {
    this.age += dt;
    this.layout();
    this.menu.update(input, this.age >= 0.15);
  }

  draw(ctx) {
    const game = this.game;
    fillRect(ctx, 0, 0, VIEW.width, VIEW.height, COLORS.menuOverlay);

    const panelX = Math.round((VIEW.width - PANEL_W) / 2);
    drawPanel(ctx, panelX, this.panelY, PANEL_W, this.panelH);

    drawText(ctx, this.confirmingMenu ? 'Level verlassen?' : 'PAUSE',
      VIEW.width / 2, this.panelY + 28,
      this.confirmingMenu ? COLORS.blood : COLORS.text,
      '26px "Segoe UI", system-ui, sans-serif', 'center', 'middle');

    if (!this.confirmingMenu) {
      const left = game.enemies.filter((e) => !e.dead).length;
      drawText(ctx, `${LEVELS[game.levelIndex].name} · ${left} Gegner uebrig · ${game.gold} Gold`,
        VIEW.width / 2, this.panelY + 48, COLORS.textDim, UI.hud.fontSmall, 'center', 'middle');
    }

    this.menu.buttons.forEach((b, i) => b.draw(ctx, i === this.menu.selected && !this.menu.usingMouse));

    drawText(ctx, 'Gespeichert wird nach jedem Level und nach jedem Kauf.',
      VIEW.width / 2, this.panelY + this.panelH - 22,
      COLORS.menuTextDisabled, UI.hud.fontSmall, 'center', 'middle');
  }
}
