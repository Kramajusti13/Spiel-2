/**
 * characterTile.js — der Charakter als eigene Kachel im Dashboard (Aufgabe 8).
 *
 * Oeffnet das bestehende Charakterfenster (game.openCharacterScreen), wie es
 * der Knopf in der Kopfzeile auch tut. Der auffaellige Puls, wenn ein freier
 * Skillpunkt wartet, kommt hier ueber die CSS-Klasse "has-free".
 */

export class CharacterTile {
  /**
   * @param {import('../game.js').Game} game
   * @param {HTMLElement} rootEl Die Kachel im Dashboard-Grid.
   */
  constructor(game, rootEl) {
    this.game = game;
    this.root = rootEl;
    this.freeEl = rootEl?.querySelector('[data-role="char-free"]') ?? null;
    this.lastFree = null;

    if (this.root) {
      this.root.addEventListener('click', () => game.openCharacterScreen('dashboard'));
    }
  }

  refresh() {
    if (!this.root) return;
    const free = this.game.progress.skillPoints;
    if (free === this.lastFree) return;
    this.lastFree = free;
    this.root.classList.toggle('has-free', free > 0);
    if (this.freeEl) {
      this.freeEl.textContent = free > 0
        ? `${free} Skillpunkt${free === 1 ? '' : 'e'} frei`
        : 'keine freien Skillpunkte';
    }
  }
}
