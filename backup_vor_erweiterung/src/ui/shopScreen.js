/**
 * shopScreen.js — der Bildschirm zwischen den Leveln (Abschnitt 5).
 *
 * Kein NPC in der Spielwelt: nach dem Verlassen eines Levels landet der Spieler
 * hier, kauft Ausruestung und startet von hier ins naechste Level (oder wiederholt
 * das alte, um Gold zu farmen — Abschnitt 6).
 *
 * Die Knoepfe werden EINMAL beim Oeffnen gebaut und danach nur noch beschriftet.
 * Neu bauen pro Bild waere fatal: die Maus trifft dann Knoepfe, deren Position
 * erst beim Zeichnen gesetzt wird.
 */

import { COLORS, LEVELS, UI, VIEW } from '../config.js';
import { drawText, fillRect } from '../gfx.js';
import { Button, Menu, drawPanel } from './menu.js';
import { offers } from '../shop.js';

const ROW_HEIGHT = 46;
const ROW_GAP = 8;
const PANEL_WIDTH = 560;
const OFFER_IDS = ['sword', 'bow', 'shield', 'potion', 'respec'];

export class ShopScreen {
  constructor(game) {
    this.game = game;
    this.age = 0;
    this.flash = 0;        // kurzes Aufleuchten nach einem Kauf
    this.lastMessage = '';
    this.menu = new Menu([]);
    this.panelY = 0;
  }

  /** Aktuelles Angebot zu einer Waren-ID (aendert sich nach jedem Kauf). */
  offerFor(id) {
    return offers(this.game.progress).find((o) => o.id === id);
  }

  open() {
    this.age = 0;
    this.flash = 0;
    this.lastMessage = '';
    this.build();
    this.refresh();
    this.layout();
    this.menu.selectFirstEnabled();
    this.menu.usingMouse = false;
  }

  /** Knopf-Geruest anlegen. Die Beschriftung kommt aus refresh(). */
  build() {
    const game = this.game;
    const width = PANEL_WIDTH - UI.menu.panelPadding * 2;
    const buttons = [];

    OFFER_IDS.forEach((id, i) => {
      const b = new Button({
        label: id,
        keys: [`Digit${i + 1}`, `Numpad${i + 1}`],
        keyLabel: String(i + 1),
        enabled: () => {
          const o = this.offerFor(id);
          return !o.sold && game.gold >= o.price;
        },
        onActivate: () => this.buy(this.offerFor(id)),
      });
      b.w = width;
      b.h = ROW_HEIGHT;
      b.offerId = id;
      buttons.push(b);
    });

    const current = LEVELS[game.levelIndex];
    const repeat = new Button({
      label: `${current.name} wiederholen`,
      hint: 'alle Monster leben wieder — zum Gold farmen',
      keys: ['KeyR'],
      keyLabel: 'R',
      onActivate: () => game.startLevel(game.levelIndex),
    });
    repeat.w = width;
    repeat.h = ROW_HEIGHT;
    buttons.push(repeat);

    const next = LEVELS[game.levelIndex + 1];
    if (next) {
      const go = new Button({
        label: `Weiter: ${next.name}`,
        hint: 'naechstes Level betreten',
        note: 'erst das aktuelle Level abschliessen',
        // Freigeschaltet wird ein Level erst, wenn das vorige abgeschlossen ist.
        enabled: () => next.built && game.levelIndex + 1 <= game.unlockedLevel,
        onActivate: () => game.startLevel(game.levelIndex + 1),
      });
      go.w = width;
      go.h = ROW_HEIGHT;
      buttons.push(go);
    }

    this.menu.buttons = buttons;
    this.menu.selected = 0;
  }

  /** Beschriftungen und Preise an den aktuellen Stand anpassen. */
  refresh() {
    const gold = this.game.gold;
    for (const b of this.menu.buttons) {
      if (!b.offerId) continue;
      const o = this.offerFor(b.offerId);
      b.label = o.name;
      b.hint = o.detail;
      b.note = o.sold ? (o.note || 'bereits beste Stufe') : `${o.price} Gold noetig — du hast ${gold}`;
      b.price = o.sold ? null : o.price;
    }
  }

  /** Knopfpositionen setzen — noetig vor der Mausauswertung, nicht erst beim Zeichnen. */
  layout() {
    const panelH = this.panelHeight;
    const panelX = Math.round((VIEW.width - PANEL_WIDTH) / 2);
    this.panelY = Math.round((VIEW.height - panelH) / 2);
    const x = panelX + UI.menu.panelPadding;
    let y = this.panelY + 86;
    for (const b of this.menu.buttons) {
      b.x = x;
      b.y = y;
      y += ROW_HEIGHT + ROW_GAP;
    }
  }

  get panelHeight() {
    return this.menu.buttons.length * (ROW_HEIGHT + ROW_GAP) + 150;
  }

  buy(offer) {
    if (this.game.buy(offer.id)) {
      this.flash = 0.35;
      this.lastMessage = `${offer.name} gekauft — ${offer.price} Gold`;
      this.refresh();
    }
  }

  update(dt, input) {
    this.age += dt;
    this.flash = Math.max(0, this.flash - dt);
    this.refresh();
    this.layout();
    // Kurze Sperre, damit ein Klick aus dem Level nicht sofort etwas kauft.
    this.menu.update(input, this.age >= 0.2);
  }

  draw(ctx) {
    const game = this.game;
    fillRect(ctx, 0, 0, VIEW.width, VIEW.height, COLORS.background);

    const panelH = this.panelHeight;
    const panelX = Math.round((VIEW.width - PANEL_WIDTH) / 2);
    const panelY = this.panelY;
    drawPanel(ctx, panelX, panelY, PANEL_WIDTH, panelH);

    drawText(ctx, 'SHOP', VIEW.width / 2, panelY + 30, COLORS.text,
      '30px "Segoe UI", system-ui, sans-serif', 'center', 'middle');

    // Goldstand — die wichtigste Zahl auf diesem Bildschirm.
    ctx.beginPath();
    ctx.ellipse(VIEW.width / 2 - 46, panelY + 60, 6, 6, 0, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.gold;
    ctx.fill();
    drawText(ctx, `${game.gold} Gold`, VIEW.width / 2 - 34, panelY + 60,
      this.flash > 0 ? '#f4d67a' : COLORS.gold, UI.hud.font, 'left', 'middle');

    this.menu.buttons.forEach((b, i) => {
      b.draw(ctx, i === this.menu.selected && !this.menu.usingMouse);
      if (b.price != null) {
        const affordable = game.gold >= b.price;
        drawText(ctx, `${b.price} G`, b.x + b.w - 44, b.y + b.h / 2,
          affordable ? COLORS.gold : COLORS.menuTextDisabled, UI.hud.font, 'right', 'middle');
      }
    });

    const footY = panelY + panelH - 34;
    drawText(ctx, this.lastMessage || 'Waffen sind Upgrades — ein Kauf ersetzt die bisherige Stufe.',
      VIEW.width / 2, footY,
      this.lastMessage ? COLORS.gold : COLORS.textDim, UI.hud.fontSmall, 'center', 'middle');
    drawText(ctx, 'Zifferntasten kaufen · Pfeiltasten + Enter · Maus',
      VIEW.width / 2, footY + 16, COLORS.menuTextDisabled, UI.hud.fontSmall, 'center', 'middle');

    // Ausruestungsstand oben rechts, damit man sieht, was man schon hat.
    const p = game.player;
    const lines = [
      `Schwert: ${p ? p.swordName : '—'}`,
      `Bogen: ${game.progress.bowTier >= 0 ? p.bow.name : 'keiner'}`,
      `Schild: ${game.progress.shieldTier > 0 ? p.shield.name : 'keines'}`,
      `Heiltraenke: ${game.progress.potions}`,
      `Monster besiegt: ${game.kills}`,
    ];
    lines.forEach((line, i) => {
      drawText(ctx, line, VIEW.width - 20, 20 + i * 16, COLORS.textDim, UI.hud.fontSmall, 'right');
    });
  }
}
