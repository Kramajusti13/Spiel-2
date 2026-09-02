/**
 * statsTile.js — die Statistik-Kachel im Dashboard (VERBESSERUNGEN_1
 * Abschnitt 1).
 *
 * Kurzfassung ("237 Kills · 4 Tode"). Klick oeffnet ein Overlay mit einer
 * ausfuehrlichen Liste (Kills nach Typ, Tode, Gold, Spielzeit).
 */

export class StatsTile {
  /**
   * @param {import('../game.js').Game} game
   */
  constructor(game) {
    this.game = game;
    this.root = document.getElementById('tile-stats');
    this.summaryEl = this.root?.querySelector('[data-role="stats-summary"]');
    this.window = document.getElementById('stats-window');
    this.body = document.getElementById('stats-body');
    this.closeBtn = document.getElementById('stats-close');
    this.lastSummary = null;

    this.root?.addEventListener('click', () => this.open());
    this.closeBtn?.addEventListener('click', () => this.close());
    this.window?.addEventListener('click', (e) => {
      if (e.target === this.window) this.close();
    });
  }

  open() {
    document.body.dataset.modal = 'stats';
    this.build();
  }

  close() {
    if (document.body.dataset.modal === 'stats') delete document.body.dataset.modal;
  }

  build() {
    if (!this.body) return;
    const s = this.game.stats;
    const rows = [];
    const push = (k, v) => rows.push([k, v]);

    push('Kills insgesamt', num(s.killsTotal));
    push('davon Bogen', num(s.killsByWeapon?.bow));
    push('davon Speer', num(s.killsByWeapon?.spear));
    push('davon Schwert', num(s.killsByWeapon?.sword));
    push('Tode', num(s.deaths));
    push('Wiederbelebungen', num(s.revives));
    push('Traenke benutzt', num(s.potionsUsed));
    push('Blocks', num(s.blocks));
    push('Kaeufe', num(s.purchases));
    push('Gold gesammelt', num(s.goldEarned).toLocaleString('de-DE'));
    push('Gold ausgegeben', num(s.goldSpent).toLocaleString('de-DE'));
    push('Level-Durchgaenge', num(s.levelsCleared));
    push('davon ohne Tod', num(s.cleanRuns));

    this.body.replaceChildren();
    for (const [k, v] of rows) {
      const row = document.createElement('div');
      row.className = 'row';
      const kEl = document.createElement('span');
      kEl.className = 'k';
      kEl.textContent = k;
      const vEl = document.createElement('span');
      vEl.className = 'v';
      vEl.textContent = String(v);
      row.append(kEl, vEl);
      this.body.append(row);
    }
  }

  refresh() {
    if (!this.summaryEl) return;
    const s = this.game.stats;
    const text = `${num(s.killsTotal)} Kills · ${num(s.deaths)} Tode`;
    if (text === this.lastSummary) return;
    this.lastSummary = text;
    this.summaryEl.textContent = text;
  }
}

function num(v) {
  return Number.isFinite(v) ? v : 0;
}
