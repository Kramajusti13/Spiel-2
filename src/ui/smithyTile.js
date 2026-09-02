/**
 * smithyTile.js — die Schmied-Kachel im Dashboard (VERBESSERUNGEN_1
 * Abschnitt 1).
 *
 * Kurzfassung ("Waffenschaerfung + Trankguertel"). Klick oeffnet ein
 * einfaches Overlay, in dem nur diese zwei Angebote stehen — die restlichen
 * Kaeufe bleiben im Shop, damit die Schmied-Kachel wirklich schmal bleibt.
 */

import { smithOffer, nextBeltOffer, buy as buyOffer } from '../shop.js';

export class SmithyTile {
  /**
   * @param {import('../game.js').Game} game
   */
  constructor(game) {
    this.game = game;
    this.root = document.getElementById('tile-smithy');
    this.summaryEl = this.root?.querySelector('[data-role="smithy-summary"]');
    this.window = document.getElementById('smithy-window');
    this.listEl = document.getElementById('smithy-list');
    this.msgEl = document.getElementById('smithy-message');
    this.closeBtn = document.getElementById('smithy-close');
    this.lastSummary = null;
    this.message = '';

    this.root?.addEventListener('click', () => this.open());
    this.closeBtn?.addEventListener('click', () => this.close());
    // Klick auf Backdrop schliesst.
    this.window?.addEventListener('click', (e) => {
      if (e.target === this.window) this.close();
    });
  }

  open() {
    document.body.dataset.modal = 'smithy';
    this.message = '';
    this.buildList();
  }

  close() {
    if (document.body.dataset.modal === 'smithy') delete document.body.dataset.modal;
  }

  /**
   * Zeigt Schmied + Trankguertel als kaufbare Zeilen. Fehlt eines (weil bereits
   * maximal), steht dort eine kurze Meldung.
   */
  buildList() {
    if (!this.listEl) return;
    this.listEl.replaceChildren();

    const offers = [smithOffer(this.game.progress), nextBeltOffer(this.game.progress)]
      .filter(Boolean);

    for (const offer of offers) {
      const row = document.createElement('div');
      row.className = 'buy-row';

      const text = document.createElement('span');
      text.innerHTML = `<b>${escape(offer.slot)}</b> — ${escape(offer.name)}<br>`
        + `<span style="color:#8b8577; font-size:12px">${escape(offer.detail)}</span>`;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'dash-btn';
      if (offer.sold) {
        btn.textContent = 'fertig';
        btn.disabled = true;
      } else {
        btn.textContent = `${offer.price} G`;
        btn.disabled = this.game.gold < offer.price;
        btn.addEventListener('click', () => {
          const ok = buyOffer(offer.id, this.game.progress, this.game);
          if (ok) {
            this.message = `${offer.name} gekauft`;
          } else {
            this.message = 'Nicht genug Gold';
          }
          this.buildList();
          this.refresh();
        });
      }

      row.append(text, btn);
      this.listEl.append(row);
    }

    if (this.msgEl) this.msgEl.textContent = this.message;
  }

  refresh() {
    if (!this.summaryEl) return;
    const smith = smithOffer(this.game.progress);
    const belt = nextBeltOffer(this.game.progress);
    const kaufbar = [smith, belt].filter((o) => o && !o.sold).length;
    const text = kaufbar === 0
      ? 'nichts mehr zu tun'
      : `${kaufbar} Verbesserung${kaufbar === 1 ? '' : 'en'} moeglich`;
    if (text === this.lastSummary) return;
    this.lastSummary = text;
    this.summaryEl.textContent = text;
    this.summaryEl.classList.toggle('has-free', kaufbar > 0);
  }
}

function escape(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
