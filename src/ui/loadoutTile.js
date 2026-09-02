/**
 * loadoutTile.js — die Ausruestungs-Kachel im Dashboard
 * (VERBESSERUNGEN_1 Abschnitt 1).
 *
 * Kurzfassung ("Speer + Bogen dabei"). Klick oeffnet das bestehende
 * LoadoutWindow — es liegt schon fertig da, hier steht nur die Anzeige.
 */

import { loadout, ownedWeapons } from '../weapons.js';

const NAMES = { sword: 'Schwert', spear: 'Speer', bow: 'Bogen' };

export class LoadoutTile {
  /**
   * @param {import('../game.js').Game} game
   * @param {import('./dashboard.js').Dashboard} dashboard
   */
  constructor(game, dashboard) {
    this.game = game;
    this.dashboard = dashboard;
    this.root = document.getElementById('tile-loadout');
    this.summaryEl = this.root?.querySelector('[data-role="loadout-summary"]') ?? null;
    this.lastSummary = null;

    if (this.root) {
      this.root.addEventListener('click', () => {
        // Nur oeffnen, wenn ueberhaupt mehr als eine Waffe da ist — sonst
        // gibt es nichts zu waehlen.
        if (ownedWeapons(this.game.progress).length < 2) return;
        this.dashboard.loadout?.open?.();
      });
    }
  }

  refresh() {
    if (!this.summaryEl) return;
    const owned = ownedWeapons(this.game.progress);
    let text;
    if (owned.length < 2) {
      text = `${owned.length} von 3 Waffen (noch keine Wahl)`;
    } else {
      const dabei = loadout(this.game.progress).map((id) => NAMES[id] ?? id);
      text = `${dabei.join(' + ')} dabei`;
    }
    if (text === this.lastSummary) return;
    this.lastSummary = text;
    this.summaryEl.textContent = text;
  }
}
