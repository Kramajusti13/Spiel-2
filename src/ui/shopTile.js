/**
 * shopTile.js — der Shop als Kachel im Dashboard (Erweiterung, Schritt 3).
 *
 * Loest ui/shopScreen.js ab: derselbe Shop, nur nicht mehr als eigener
 * Canvas-Bildschirm, sondern oben links im Dashboard. Die Kauf-Logik ist
 * unveraendert — sie stand schon immer getrennt in shop.js, hier haengen nur
 * Zeilen und Knoepfe daran.
 *
 * Jede Zeile ist ein Ausruestungsslot: was steckt drin, was waere das naechste
 * Upgrade, was kostet es. Nicht bezahlbare Upgrades werden ausgegraut und
 * nicht versteckt — der Spieler soll sehen, worauf er hinspart (Abschnitt 2).
 */

import { offers } from '../shop.js';

export class ShopTile {
  /**
   * @param {import('../game.js').Game} game
   * @param {HTMLElement} listEl   Container fuer die Zeilen
   * @param {HTMLElement} msgEl    Zeile fuer "… gekauft"
   */
  constructor(game, listEl, msgEl) {
    this.game = game;
    this.listEl = listEl;
    this.msgEl = msgEl;

    /** Waren-ID -> die Elemente ihrer Zeile. Einmal gebaut, danach beschriftet. */
    this.rows = new Map();
    this.message = '';
    /** Restzeit des Aufleuchtens nach einem Kauf, in Sekunden. */
    this.flash = 0;
    this.flashId = null;
  }

  /**
   * Zeilen anlegen. Die Warenliste ist fest (Schwert, Speer, Bogen, Schild,
   * Trank, Reset), nur ihr Inhalt wechselt — also einmal bauen und danach nur
   * noch beschriften, statt bei jedem Kauf neu.
   */
  build() {
    this.listEl.replaceChildren();
    this.rows.clear();
    // Die Kaufmeldung des letzten Besuchs soll nicht ueber ein ganzes Level
    // hinweg stehen bleiben.
    this.message = '';
    this.flash = 0;
    this.flashId = null;

    for (const offer of offers(this.game.progress)) {
      const row = document.createElement('div');
      row.className = 'shop-row';

      // Slot und aktueller Stand stehen untereinander in einer Spalte —
      // sonst laufen sie ineinander.
      const slotCol = document.createElement('div');
      slotCol.className = 'shop-slot-col';

      const slot = document.createElement('span');
      slot.className = 'shop-slot';

      const current = document.createElement('span');
      current.className = 'shop-current';
      slotCol.append(slot, current);

      const name = document.createElement('span');
      name.className = 'shop-name';

      const detail = document.createElement('span');
      detail.className = 'shop-detail';

      const buy = document.createElement('button');
      buy.type = 'button';
      buy.className = 'dash-btn shop-buy';
      buy.addEventListener('click', () => this.buy(offer.id));

      row.append(slotCol, name, detail, buy);
      this.listEl.append(row);
      this.rows.set(offer.id, { row, slot, current, name, detail, buy });
    }
  }

  buy(id) {
    const offer = this.offerFor(id);
    if (!offer) return;
    // game.buy() prueft Gold und Grenzen selbst, spielt den Ton und speichert.
    if (!this.game.buy(id)) return;
    this.message = `${offer.name} gekauft — ${offer.price} Gold`;
    this.flashId = id;
    this.flash = 0.5;
    this.refresh();
  }

  offerFor(id) {
    return offers(this.game.progress).find((o) => o.id === id);
  }

  /**
   * Beschriftungen und Sperren an den aktuellen Stand anpassen.
   * Laeuft im Spieltakt, schreibt aber nur, was sich geaendert hat.
   */
  refresh(dt = 0) {
    this.flash = Math.max(0, this.flash - dt);
    const gold = this.game.gold;

    for (const offer of offers(this.game.progress)) {
      const el = this.rows.get(offer.id);
      if (!el) continue;

      setText(el.slot, offer.slot);
      setText(el.current, offer.current);
      setText(el.name, offer.name);
      setText(el.detail, offer.detail);

      const affordable = gold >= offer.price;
      setText(el.buy, offer.sold ? '—' : `${offer.price} G`);
      el.buy.disabled = offer.sold || !affordable;
      // Ausgegraut statt versteckt: der Fortschritt zum naechsten Upgrade
      // bleibt sichtbar.
      el.row.classList.toggle('sold', offer.sold);
      el.row.classList.toggle('too-expensive', !offer.sold && !affordable);
      el.buy.title = offer.sold
        ? (offer.note || 'nichts mehr zu kaufen')
        : affordable ? `${offer.name} kaufen` : `${offer.price - gold} Gold fehlen`;
      el.row.classList.toggle('flash', this.flash > 0 && this.flashId === offer.id);
    }

    setText(this.msgEl, this.message);
  }
}

/** Schreibt nur, wenn sich der Text geaendert hat. */
function setText(el, text) {
  if (el.textContent !== text) el.textContent = text;
}
