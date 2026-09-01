/**
 * routeTile.js — die Route im Dashboard (Erweiterung, Schritt 5).
 *
 * Die Level als Kette von Knoten von links nach rechts, jeder mit Name und
 * Zustandssymbol (Abschnitt 2):
 *
 *   ✔ ─── ✔ ─── ◉ ─── ○ ───
 *  Wald  Hoehle Ruinen Orklager Boss
 *
 * Ein Klick auf einen Knoten waehlt ihn aus und oeffnet das Auswahlfenster mit
 * Levelname, Beschreibung und dem Knopf "Spielen". Abgeschlossene Level bleiben
 * anklickbar und wiederholbar — Farmen soll moeglich sein.
 *
 * Seit Schritt 6 traegt jeder geschaffte Knoten ausserdem Sterne fuer die dort
 * hoechste geschaffte Schwierigkeit, und das Fenster hat die Stufenwahl
 * (Abschnitt 4).
 */

import { DIFFICULTIES, DIFFICULTY_ORDER, LEVELS } from '../config.js';
import { difficultyAt, difficultyIndex, isDifficultyUnlocked, starsFor } from '../difficulty.js';

/** Symbol je Zustand — die Legende aus Abschnitt 2. */
const SYMBOL = {
  done: '✔',
  current: '◉',
  next: '○',
  locked: '·',
};

export class RouteTile {
  /**
   * @param {import('../game.js').Game} game
   * @param {import('./dashboard.js').Dashboard} dashboard
   */
  constructor(game, dashboard) {
    this.game = game;
    this.dashboard = dashboard;

    this.el = {
      chain: document.getElementById('route-chain'),
      play: document.getElementById('dash-play'),
      // Auswahlfenster
      window: document.getElementById('level-window'),
      title: document.getElementById('level-title'),
      state: document.getElementById('level-state'),
      description: document.getElementById('level-description'),
      difficulties: document.getElementById('level-difficulties'),
      cancel: document.getElementById('level-cancel'),
      start: document.getElementById('level-start'),
    };

    /** Welches Level der grosse "Spielen"-Knopf startet. */
    this.selected = 0;
    /** Welches Level das Auswahlfenster gerade zeigt. */
    this.shown = 0;
    /** Im Fenster gewaehlte Schwierigkeit. */
    this.difficulty = DIFFICULTY_ORDER[0];
    /** Zuletzt geschriebene Werte, damit nicht jedes Bild ins DOM schreibt. */
    this.last = {};
    this.nodes = [];

    this.buildChain();
    this.buildDifficulties();
    this.bind();
  }

  bind() {
    this.el.play.addEventListener('click', () => this.start(this.selected));
    this.el.start.addEventListener('click', () => this.start(this.shown, this.difficulty));
    this.el.cancel.addEventListener('click', () => this.closeWindow());

    this.el.window.addEventListener('mousedown', (e) => {
      if (e.target === this.el.window) this.closeWindow();
    });

    window.addEventListener('keydown', (e) => {
      if (this.dashboard.modal !== 'level') return;
      if (e.code === 'Escape') {
        e.preventDefault();
        this.closeWindow();
      }
    });
  }

  /**
   * Kette einmal bauen: Knoten und die Striche dazwischen. Die Zustaende
   * kommen aus refresh().
   */
  buildChain() {
    this.el.chain.replaceChildren();
    this.nodes = [];

    LEVELS.forEach((entry, i) => {
      if (i > 0) {
        const link = document.createElement('span');
        link.className = 'route-link';
        this.el.chain.append(link);
      }

      const node = document.createElement('button');
      node.type = 'button';
      node.className = 'route-node';

      const symbol = document.createElement('span');
      symbol.className = 'route-symbol';

      const name = document.createElement('span');
      name.className = 'route-name';
      name.textContent = entry.name;

      // Sterne: hoechste dort geschaffte Stufe (Abschnitt 4). Sie belegen
      // ihren Platz immer, damit die Kette nicht springt.
      const stars = document.createElement('span');
      stars.className = 'route-stars';

      // Marke unter dem ausgewaehlten Knoten — sie zeigt, worauf sich der
      // grosse "Spielen"-Knopf bezieht.
      const marker = document.createElement('span');
      marker.className = 'route-marker';
      marker.textContent = '▲';

      node.append(symbol, name, stars, marker);
      node.addEventListener('click', () => this.select(i));
      this.el.chain.append(node);
      this.nodes.push({ node, symbol, name, stars });
    });
  }

  /**
   * Die drei Stufenknoepfe einmal bauen. Beschriftet werden sie in
   * refreshWindow() — welche waehlbar sind, haengt am gezeigten Level.
   */
  buildDifficulties() {
    this.el.difficulties.replaceChildren();
    this.difficultyButtons = DIFFICULTY_ORDER.map((id) => {
      const def = DIFFICULTIES[id];

      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'diff-btn';

      const name = document.createElement('span');
      name.className = 'diff-name';
      name.textContent = def.name;

      // Die Multiplikatoren im Klartext: das Wiederholen soll eine bewusste
      // Entscheidung sein, keine Ueberraschung (Abschnitt 4).
      const detail = document.createElement('span');
      detail.className = 'diff-detail';

      b.append(name, detail);
      b.addEventListener('click', () => this.chooseDifficulty(id));
      this.el.difficulties.append(b);
      return { id, button: b, detail };
    });
  }

  chooseDifficulty(id) {
    if (!this.isUnlocked(id, this.shown)) return;
    this.difficulty = id;
    this.refreshWindow(this.shown);
  }

  isUnlocked(id, level) {
    return isDifficultyUnlocked(id, this.game.bestDifficulty[level]);
  }

  /**
   * Knoten anklicken: Fenster oeffnen und — wenn das Level spielbar ist —
   * die Auswahl darauf setzen.
   *
   * Ein gesperrter Knoten darf die Auswahl NICHT uebernehmen: sonst wuerde ein
   * neugieriger Blick auf die Bosskammer den grossen "Spielen"-Knopf sperren.
   */
  select(i) {
    if (this.game.canPlayLevel(i)) this.selected = i;
    this.openWindow(i);
    this.refresh();
  }

  /**
   * Auswahl ohne Fenster setzen — beim Oeffnen des Dashboards.
   * Vorgewaehlt wird das Level, das gerade dran ist.
   */
  preselect() {
    const next = LEVELS.findIndex((_, i) => this.game.levelState(i) === 'current');
    this.selected = next >= 0 ? next : Math.min(this.game.unlockedLevel, LEVELS.length - 1);
  }

  openWindow(i) {
    // Gezeigt wird der angeklickte Knoten, auch wenn er gesperrt ist und die
    // Auswahl deshalb woanders steht.
    this.shown = i;
    // Vorgewaehlt ist die hoechste freigeschaltete Stufe — wer Schwer offen
    // hat, will meist auch auf Schwer spielen. Herunterstufen geht mit einem
    // Klick.
    this.difficulty = difficultyAt(Math.min(
      this.game.bestDifficulty[i] + 1, DIFFICULTY_ORDER.length - 1));
    this.dashboard.modal = 'level';
    this.game.syncScreen();
    this.refreshWindow(i);
    // Gesperrte Level lassen sich nicht starten — dann liegt der Fokus auf
    // "Abbrechen", damit Enter nichts Unerwartetes tut.
    const target = this.game.canPlayLevel(i) ? this.el.start : this.el.cancel;
    target.focus({ preventScroll: true });
  }

  closeWindow() {
    this.dashboard.modal = '';
    this.game.syncScreen();
  }

  /**
   * Level starten. Das Fenster schliesst sich dabei mit.
   * @param {number} i
   * @param {string} [difficulty] Stufe; ohne Angabe Normal (grosser Knopf)
   */
  start(i, difficulty = DIFFICULTY_ORDER[0]) {
    if (!this.game.canPlayLevel(i)) return;
    const id = this.isUnlocked(difficulty, i) ? difficulty : DIFFICULTY_ORDER[0];
    this.closeWindow();
    if (!this.game.startLevel(i, id)) {
      this.dashboard.setMessage(`${LEVELS[i].name} ist noch nicht gebaut.`);
    }
  }

  /** Zustaende, Auswahl und Knopfbeschriftung an den Spielstand anpassen. */
  refresh() {
    const game = this.game;

    this.nodes.forEach((el, i) => {
      const state = game.levelState(i);
      const playable = game.canPlayLevel(i);

      setText(el.symbol, SYMBOL[state]);
      // ★☆☆ Normal, ★★☆ Schwer, ★★★ Alptraum — leer, solange nie geschafft.
      const stars = starsFor(game.bestDifficulty[i]);
      setText(el.stars, stars > 0 ? '★'.repeat(stars) + '☆'.repeat(3 - stars) : '');
      // Ein Zustand pro Knoten — alte Klassen muessen weg.
      el.node.className = `route-node is-${state}${i === this.selected ? ' is-selected' : ''}`;
      // Auch gesperrte Knoten sind anklickbar: das Fenster erklaert dann,
      // was noch fehlt. Nur Starten geht nicht.
      el.node.title = playable
        ? LEVELS[i].description
        : 'erst das vorige Level abschliessen';
    });

    const ok = game.canPlayLevel(this.selected);
    this.el.play.disabled = !ok;
    setText(this.el.play, ok
      ? `Spielen — ${LEVELS[this.selected].name}`
      : 'Noch gesperrt');

    if (this.dashboard.modal === 'level') this.refreshWindow(this.shown);
  }

  refreshWindow(i) {
    const game = this.game;
    const entry = LEVELS[i];
    const state = game.levelState(i);
    const playable = game.canPlayLevel(i);

    setText(this.el.title, entry.name);
    setText(this.el.description, entry.description);

    const label = {
      done: 'Schon geschafft — wiederholbar',
      current: 'Jetzt dran',
      next: 'Noch gesperrt — erst das vorige Level abschliessen',
      locked: 'Noch gesperrt',
    }[state];
    setText(this.el.state, label);
    this.el.state.className = `level-state is-${state}`;

    // Stufenwahl: gesperrte Stufen bleiben sichtbar, damit man sieht, was es
    // noch zu holen gibt.
    const best = game.bestDifficulty[i];
    for (const { id, button, detail } of this.difficultyButtons) {
      const def = DIFFICULTIES[id];
      const unlocked = playable && isDifficultyUnlocked(id, best);
      const done = best >= difficultyIndex(id);

      button.disabled = !unlocked;
      button.classList.toggle('is-chosen', unlocked && id === this.difficulty);
      button.classList.toggle('is-done', done);
      setText(detail, unlocked
        ? `Gegner ×${num(def.hp)} Leben · ×${num(def.damage)} Schaden · Beute ×${num(def.gold)}`
        : def.unlockNote);
      button.title = done ? `schon auf ${def.name} geschafft` : '';
    }

    this.el.start.disabled = !playable;
    setText(this.el.start, playable
      ? `Spielen — ${DIFFICULTIES[this.difficulty].name}`
      : 'Gesperrt');
  }
}

function setText(el, text) {
  if (el.textContent !== text) el.textContent = text;
}

/** 1.5 -> "1,5", 1 -> "1" — deutsche Schreibweise wie im Dokument. */
function num(value) {
  return String(value).replace('.', ',');
}
