/**
 * deathScreen.js — Bildschirm nach dem Tod (Abschnitt 9).
 *
 * Zwei Moeglichkeiten:
 *   1. Wiederbeleben gegen Gold — man steht an derselben Stelle mit vollem Leben
 *      wieder auf, besiegte Monster bleiben besiegt.
 *      Kosten: 50 G beim ersten Tod pro Level, danach je 25 G mehr.
 *   2. Level neu starten — kostenlos, aber alle Monster leben wieder und das in
 *      diesem Durchgang gesammelte Gold ist weg.
 *
 * Gekaufte Ausruestung und vergebene Skillpunkte bleiben in beiden Faellen erhalten.
 */

import { COLORS, DEATH, UI, VIEW } from '../config.js';
import { drawText, fillRect } from '../gfx.js';
import { Button, Menu, drawPanel } from './menu.js';

export class DeathScreen {
  constructor(game) {
    this.game = game;
    this.age = 0;

    this.menu = new Menu([
      new Button({
        label: 'Wiederbeleben',
        keys: ['Digit1', 'Numpad1'],
        keyLabel: '1',
        enabled: () => game.gold >= game.reviveCost,
        onActivate: () => game.revive(),
      }),
      new Button({
        label: 'Level neu starten',
        keys: ['Digit2', 'Numpad2', 'KeyR'],
        keyLabel: '2 / R',
        enabled: () => true,
        onActivate: () => game.restartLevel(),
      }),
    ]);
  }

  open() {
    this.age = 0;
    this.refreshLabels();
    this.menu.selectFirstEnabled();
    this.menu.usingMouse = false;
  }

  /** Beschriftungen haengen von Gold und Todeszaehler ab — vor dem Anzeigen setzen. */
  refreshLabels() {
    const game = this.game;
    const cost = game.reviveCost;
    const [revive, restart] = this.menu.buttons;

    revive.hint = `${cost} Gold — du stehst hier wieder auf, volles Leben`;
    revive.note = `${cost} Gold noetig — du hast ${game.gold}`;

    restart.hint = game.runGold > 0
      ? `kostenlos — alle Monster leben wieder, ${game.runGold} Gold aus diesem Durchgang verfaellt`
      : 'kostenlos — alle Monster leben wieder';
  }

  update(dt, input) {
    this.age += dt;
    this.refreshLabels();
    // Kurze Sperre: ein Klick aus dem Kampf soll nicht sofort einen Knopf treffen.
    this.menu.update(input, this.age >= DEATH.screenInputDelay);
  }

  draw(ctx) {
    const game = this.game;
    const fade = Math.min(1, this.age / DEATH.fadeInTime);

    ctx.save();
    ctx.globalAlpha = fade;
    fillRect(ctx, 0, 0, VIEW.width, VIEW.height, COLORS.menuOverlay);

    const m = UI.menu;
    const panelW = m.buttonWidth + m.panelPadding * 2;
    const panelH = this.menu.height + m.panelPadding * 2 + 108;
    const panelX = Math.round((VIEW.width - panelW) / 2);
    const panelY = Math.round((VIEW.height - panelH) / 2 + 20);
    drawPanel(ctx, panelX, panelY, panelW, panelH);

    drawText(ctx, 'GEFALLEN', VIEW.width / 2, panelY - 46, COLORS.blood,
      m.titleFont, 'center', 'middle');

    const todNr = game.deathsThisLevel + 1;
    drawText(ctx, `${game.level.name} — ${todNr}. Tod in diesem Level`,
      VIEW.width / 2, panelY + 22, COLORS.textDim, UI.hud.fontSmall, 'center', 'middle');

    // Goldstand gut sichtbar: davon haengt die erste Entscheidung ab.
    const goldY = panelY + 50;
    ctx.beginPath();
    ctx.ellipse(VIEW.width / 2 - 34, goldY, 5, 5, 0, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.gold;
    ctx.fill();
    drawText(ctx, `${game.gold} Gold`, VIEW.width / 2 - 24, goldY,
      COLORS.gold, UI.hud.font, 'left', 'middle');

    this.menu.layout(VIEW.width / 2, panelY + 78);
    this.menu.draw(ctx);

    const footY = panelY + panelH - 30;
    drawText(ctx, 'Ausruestung und Skillpunkte bleiben in beiden Faellen erhalten.',
      VIEW.width / 2, footY, COLORS.textDim, UI.hud.fontSmall, 'center', 'middle');
    drawText(ctx, 'Pfeiltasten + Enter, Zifferntasten oder Maus',
      VIEW.width / 2, footY + 16, COLORS.menuTextDisabled, UI.hud.fontSmall, 'center', 'middle');

    ctx.restore();
  }
}
