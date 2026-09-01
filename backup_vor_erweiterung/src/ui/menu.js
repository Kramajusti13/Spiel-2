/**
 * menu.js — kleine Knopf-/Menuebasis fuer alle Bildschirme ausserhalb des Spiels.
 *
 * Bedienbar mit Maus (Zeigen + Klicken), Pfeiltasten/WS + Enter und mit
 * Direkttasten (1, 2, …). Wird ab hier vom Todesbildschirm benutzt und spaeter
 * vom Shop (Schritt 9), Charakterfenster (11) und Pause-Menue (14).
 *
 * Alle Koordinaten sind Bildschirmkoordinaten — also nach camera.restore().
 */

import { COLORS, UI } from '../config.js';
import { drawText, fillRect, strokeRect } from '../gfx.js';

/** Tasten, die immer den AUSGEWAEHLTEN Knopf ausloesen. */
const ACTIVATE_KEYS = ['Enter', 'NumpadEnter', 'Space'];

export class Button {
  /**
   * @param {object} opt
   * @param {string} opt.label     Beschriftung
   * @param {string} [opt.hint]    Zeile darunter (Kosten, Folgen …)
   * @param {string} [opt.note]    Zeile darunter, wenn der Knopf gesperrt ist
   * @param {string[]} [opt.keys]  Direkttasten (KeyboardEvent.code)
   * @param {string} [opt.keyLabel] Anzeige der Direkttaste, z. B. "1"
   * @param {() => void} opt.onActivate
   * @param {() => boolean} [opt.enabled] Wird jeden Frame neu ausgewertet
   */
  constructor(opt) {
    this.label = opt.label;
    this.hint = opt.hint ?? '';
    this.note = opt.note ?? '';
    this.keys = opt.keys ?? [];
    this.keyLabel = opt.keyLabel ?? '';
    this.onActivate = opt.onActivate;
    this._enabled = opt.enabled ?? (() => true);

    this.x = 0;
    this.y = 0;
    this.w = UI.menu.buttonWidth;
    this.h = UI.menu.buttonHeight;
    this.hovered = false;
  }

  get enabled() {
    return this._enabled();
  }

  contains(mx, my) {
    return mx >= this.x && mx <= this.x + this.w && my >= this.y && my <= this.y + this.h;
  }

  draw(ctx, selected) {
    const enabled = this.enabled;
    const active = enabled && (selected || this.hovered);

    fillRect(ctx, this.x, this.y, this.w, this.h,
      !enabled ? COLORS.menuButtonDisabled : active ? COLORS.menuButtonHover : COLORS.menuButton);
    strokeRect(ctx, this.x, this.y, this.w, this.h,
      active ? COLORS.menuAccent : COLORS.menuBorder, 1);

    // Auswahlmarke links, damit die Tastaturauswahl sichtbar ist.
    if (active) fillRect(ctx, this.x, this.y, 3, this.h, COLORS.menuAccent);

    const textColor = enabled ? (active ? COLORS.text : COLORS.textDim) : COLORS.menuTextDisabled;
    const cx = this.x + 16;
    const hasSecondLine = this.hint || (!enabled && this.note);

    drawText(ctx, this.label, cx, hasSecondLine ? this.y + 13 : this.y + this.h / 2 - 8,
      textColor, UI.menu.font);

    if (hasSecondLine) {
      const second = !enabled && this.note ? this.note : this.hint;
      drawText(ctx, second, cx, this.y + 34,
        !enabled ? COLORS.menuTextDisabled : COLORS.textDim, UI.hud.fontSmall);
    }

    if (this.keyLabel) {
      drawText(ctx, this.keyLabel, this.x + this.w - 16, this.y + this.h / 2,
        enabled ? COLORS.menuAccent : COLORS.menuTextDisabled, UI.hud.fontSmall, 'right', 'middle');
    }
  }
}

export class Menu {
  constructor(buttons) {
    this.buttons = buttons;
    this.selected = 0;
    this.usingMouse = false;
  }

  /** Knoepfe untereinander zentrieren, beginnend bei topY. */
  layout(centerX, topY) {
    const gap = UI.menu.gap;
    this.buttons.forEach((b, i) => {
      b.x = Math.round(centerX - b.w / 2);
      b.y = Math.round(topY + i * (b.h + gap));
    });
  }

  get height() {
    const gap = UI.menu.gap;
    return this.buttons.reduce((h, b) => h + b.h + gap, -gap);
  }

  /** Auswahl auf den ersten benutzbaren Knopf setzen. */
  selectFirstEnabled() {
    const i = this.buttons.findIndex((b) => b.enabled);
    this.selected = i >= 0 ? i : 0;
  }

  _move(step) {
    const n = this.buttons.length;
    for (let i = 1; i <= n; i++) {
      const next = (this.selected + step * i + n * n) % n;
      if (this.buttons[next].enabled) {
        this.selected = next;
        this.usingMouse = false;
        return;
      }
    }
  }

  /** @returns {Button|null} der ausgeloeste Knopf, falls einer aktiviert wurde */
  update(input, acceptInput = true) {
    const { x: mx, y: my } = input.mouse;
    this.buttons.forEach((b, i) => {
      b.hovered = b.enabled && b.contains(mx, my);
      if (b.hovered) {
        this.selected = i;
        this.usingMouse = true;
      }
    });

    if (!acceptInput) return null;

    if (input.wasPressed('ArrowDown', 'KeyS')) this._move(1);
    if (input.wasPressed('ArrowUp', 'KeyW')) this._move(-1);

    // Direkttasten. Enter/Leertaste sind hier ausgenommen: sie loesen IMMER den
    // ausgewaehlten Knopf aus. Haette ein einzelner Knopf sie als Direkttaste,
    // wuerde er die Auswahl uebergehen — genau der Fehler, bei dem Enter im
    // Shop ins naechste Level ging, statt das markierte Angebot zu kaufen.
    for (const b of this.buttons) {
      const hotkeys = b.keys.filter((k) => !ACTIVATE_KEYS.includes(k));
      if (hotkeys.length && input.wasPressed(...hotkeys)) return this._activate(b);
    }

    if (input.wasPressed(...ACTIVATE_KEYS)) {
      return this._activate(this.buttons[this.selected]);
    }
    if (input.mousePressed[0]) {
      const hit = this.buttons.find((b) => b.contains(mx, my));
      if (hit) return this._activate(hit);
    }
    return null;
  }

  _activate(button) {
    if (!button || !button.enabled) return null;
    button.onActivate();
    return button;
  }

  draw(ctx) {
    this.buttons.forEach((b, i) => b.draw(ctx, i === this.selected && !this.usingMouse));
  }
}

/** Abgedunkelter Hintergrund + Rahmen fuer Vollbild-Bildschirme. */
export function drawPanel(ctx, x, y, w, h) {
  fillRect(ctx, x, y, w, h, COLORS.menuPanel);
  strokeRect(ctx, x, y, w, h, COLORS.menuBorder, 1);
}
