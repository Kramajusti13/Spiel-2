/**
 * settingsTile.js — die Einstellungs-Kachel im Dashboard (VERBESSERUNGEN_1
 * Abschnitt 1).
 *
 * Kurzfassung ("Ton an"). Klick oeffnet ein Overlay mit Ton-Toggle,
 * Speichern, "Neues Spiel" (fuehrt zurueck ins Hauptmenue) und einer
 * Steuerungsuebersicht.
 */

export class SettingsTile {
  /**
   * @param {import('../game.js').Game} game
   */
  constructor(game) {
    this.game = game;
    this.root = document.getElementById('tile-settings');
    this.summaryEl = this.root?.querySelector('[data-role="settings-summary"]');
    this.window = document.getElementById('settings-window');
    this.muteBtn = document.getElementById('settings-mute');
    this.saveBtn = document.getElementById('settings-save');
    this.newBtn = document.getElementById('settings-new');
    this.closeBtn = document.getElementById('settings-close');
    this.lastSummary = null;

    this.root?.addEventListener('click', () => this.open());
    this.closeBtn?.addEventListener('click', () => this.close());
    this.window?.addEventListener('click', (e) => {
      if (e.target === this.window) this.close();
    });

    this.muteBtn?.addEventListener('click', () => {
      this.game.toggleMuted();
      this.updateMuteBtn();
      this.refresh();
    });
    this.saveBtn?.addEventListener('click', () => {
      const ok = this.game.save?.();
      if (this.saveBtn) this.saveBtn.textContent = ok ? 'Gespeichert' : 'Speichern fehlgeschlagen';
      setTimeout(() => { if (this.saveBtn) this.saveBtn.textContent = 'Jetzt speichern'; }, 1400);
    });
    this.newBtn?.addEventListener('click', () => {
      // Nicht sofort loeschen — zurueck ins Hauptmenue, dort gibt es die
      // Sicherheitsabfrage. Sonst waere ein Fehlklick Stunden Spielzeit.
      this.close();
      this.game.toMainMenu?.();
    });
  }

  updateMuteBtn() {
    if (!this.muteBtn) return;
    this.muteBtn.textContent = this.game.muted ? 'Aus (M)' : 'An (M)';
  }

  open() {
    document.body.dataset.modal = 'settings';
    this.updateMuteBtn();
  }

  close() {
    if (document.body.dataset.modal === 'settings') delete document.body.dataset.modal;
  }

  refresh() {
    if (!this.summaryEl) return;
    const text = this.game.muted ? 'Ton aus' : 'Ton an';
    if (text === this.lastSummary) return;
    this.lastSummary = text;
    this.summaryEl.textContent = text;
  }
}
