/**
 * loadoutWindow.js — die Ausruestungswahl (Erweiterung 2, Abschnitt 4).
 *
 * Der Spieler besitzt bis zu drei Waffen und nimmt zwei davon mit ins Level.
 * Dieses Fenster ist der einzige Ort, an dem das entschieden wird — im Level
 * liegen die beiden auf den Tasten 1 und 2, mehr aendert sich an der
 * Steuerung nicht.
 *
 * Aufbau wie das Levelfenster (ui/routeTile.js): ein Fenster ueber dem
 * Dashboard, gefuehrt ueber dashboard.modal. Damit ist die Regel "gewechselt
 * wird nur zwischen den Leveln" nicht bloss eine Absprache, sondern baulich
 * gesichert: aus dem Level heraus ist das Fenster gar nicht erreichbar.
 *
 * Was in einer Zeile steht, gibt Abschnitt 4 vor: Symbol, Stufe, Schaden,
 * Angriffstempo, Reichweite und ob sie gerade ausgeruestet ist. Nicht gekaufte
 * Waffen werden ausgegraut gezeigt — mit Preis, damit man weiss, worauf man
 * spart.
 */

import { LOADOUT } from '../config.js';
import { WEAPON_ORDER, allWeaponInfos, loadout, loadoutAvailable, toggleWeapon } from '../weapons.js';

export class LoadoutWindow {
  /**
   * @param {import('../game.js').Game} game
   * @param {import('./dashboard.js').Dashboard} dashboard
   */
  constructor(game, dashboard) {
    this.game = game;
    this.dashboard = dashboard;

    this.el = {
      window: document.getElementById('loadout-window'),
      list: document.getElementById('loadout-list'),
      count: document.getElementById('loadout-count'),
      hint: document.getElementById('loadout-hint'),
      close: document.getElementById('loadout-close'),
      // Die beiden Zugaenge aus dem Dokument.
      headerButton: document.getElementById('dash-loadout'),
      shopButton: document.getElementById('shop-loadout'),
    };

    /** Waffen-ID -> die Elemente ihrer Zeile. Einmal gebaut, danach beschriftet. */
    this.rows = new Map();
    /** Zuletzt geschriebene Texte — sonst schreibt jedes Bild ins DOM. */
    this.last = {};

    this.build();
    this.bind();
  }

  bind() {
    this.el.headerButton.addEventListener('click', () => this.open());
    this.el.shopButton.addEventListener('click', () => this.open());
    this.el.close.addEventListener('click', () => this.close());

    // Klick auf den dunklen Rand schliesst — wie bei jedem Fenster.
    this.el.window.addEventListener('mousedown', (e) => {
      if (e.target === this.el.window) this.close();
    });

    window.addEventListener('keydown', (e) => {
      if (this.dashboard.modal !== 'loadout') return;
      if (e.code === 'Escape') {
        e.preventDefault();
        this.close();
      }
    });
  }

  /**
   * Die drei Zeilen einmal anlegen. Welche Waffen es gibt, steht fest — nur
   * ihr Inhalt und ihr Zustand wechseln.
   *
   * Hier wird bewusst NICHT in den Fortschritt geschaut: das Dashboard (und
   * damit dieses Fenster) entsteht im Game-Konstruktor, bevor es einen
   * Fortschritt gibt. Gebaut wird aus der festen Waffenliste, beschriftet
   * erst in refresh().
   */
  build() {
    this.el.list.replaceChildren();
    this.rows.clear();

    for (const id of WEAPON_ORDER) {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'weapon-card';

      const symbol = document.createElement('span');
      symbol.className = 'weapon-symbol';
      symbol.textContent = LOADOUT.symbols[id];

      const main = document.createElement('span');
      main.className = 'weapon-main';

      const nameRow = document.createElement('span');
      nameRow.className = 'weapon-name';
      const name = document.createElement('span');
      // Der Tastenhinweis steht als eigenes Element daneben, damit er
      // erscheinen und verschwinden kann, ohne den Namen neu zu schreiben.
      const key = document.createElement('span');
      key.className = 'weapon-key';
      nameRow.append(name, key);

      const stats = document.createElement('span');
      stats.className = 'weapon-stats';

      const note = document.createElement('span');
      note.className = 'weapon-note';
      main.append(nameRow, stats, note);

      const side = document.createElement('span');
      side.className = 'weapon-side';

      card.append(symbol, main, side);
      card.addEventListener('click', () => this.toggle(id));
      this.el.list.append(card);
      this.rows.set(id, { card, symbol, name, key, stats, note, side });
    }
  }

  /** Eine Waffe an- oder abwaehlen. */
  toggle(id) {
    if (!toggleWeapon(this.game.progress, id)) return;
    // Die Wahl gehoert zum Fortschritt und soll einen Neustart ueberleben.
    this.game.save();
    this.refresh();
  }

  open() {
    // Der Knopf ist versteckt, solange es nichts zu waehlen gibt — aber ein
    // Tastendruck oder ein alter Klick soll auch dann nichts Kaputtes tun.
    if (!loadoutAvailable(this.game.progress)) return;
    this.dashboard.modal = 'loadout';
    this.game.syncScreen();
    this.last = {};
    this.refresh();
    this.el.close.focus({ preventScroll: true });
  }

  close() {
    this.dashboard.modal = '';
    this.game.syncScreen();
  }

  /**
   * Zeilen und Knoepfe an den aktuellen Stand anpassen. Laeuft im Spieltakt,
   * schreibt aber nur, was sich geaendert hat.
   */
  refresh() {
    const progress = this.game.progress;
    if (!progress) return;   // Dashboard existiert vor dem ersten Fortschritt

    // Die beiden Zugaenge erscheinen erst ab zwei besessenen Waffen
    // (Abschnitt 4) — vorher gaebe es nichts zu entscheiden.
    const verfuegbar = loadoutAvailable(progress);
    this.el.headerButton.hidden = !verfuegbar;
    this.el.shopButton.hidden = !verfuegbar;
    // Ein Kauf waehrend das Fenster offen ist gibt es nicht (der Shop liegt
    // dahinter), aber ein Verkauf per Konsole schon — dann nicht offen bleiben.
    if (!verfuegbar && this.dashboard.modal === 'loadout') this.close();
    if (this.dashboard.modal !== 'loadout') return;

    const dabei = loadout(progress);
    this.set('count', this.el.count,
      `${dabei.length} von ${LOADOUT.slots} Plaetzen belegt`);
    this.el.count.classList.toggle('is-full', dabei.length >= LOADOUT.slots);

    for (const info of allWeaponInfos(progress)) {
      const el = this.rows.get(info.id);
      if (!el) continue;

      setText(el.name, info.owned ? info.tierName : `${info.tierName} (nicht gekauft)`);

      // Tastenbelegung: Platz 1 liegt auf Taste 1, Platz 2 auf Taste 2.
      const platz = dabei.indexOf(info.id);
      setText(el.key, platz >= 0 ? `Taste ${platz + 1}` : '');
      el.key.hidden = platz < 0;

      setText(el.stats, `${info.tierText} · ${info.damage} Schaden · `
        + `${info.speedText} · Reichweite ${info.rangeText}`);
      setText(el.note, info.note);

      if (!info.owned) {
        setText(el.side, `${info.nextPrice} G im Shop`);
        el.side.className = 'weapon-side weapon-price';
      } else if (info.carried) {
        setText(el.side, 'dabei');
        el.side.className = 'weapon-side weapon-carried-tag';
      } else {
        setText(el.side, 'bleibt hier');
        el.side.className = 'weapon-side';
      }

      // Die letzte mitgenommene Waffe laesst sich nicht ablegen — ohne Waffe
      // gaebe es kein Level. Der Tooltip sagt, warum der Klick nichts tut.
      const letzte = info.carried && dabei.length <= 1;
      el.card.disabled = !info.owned || letzte;
      el.card.className = 'weapon-card'
        + (info.carried ? ' is-carried' : '')
        + (info.owned ? '' : ' is-locked');
      el.card.title = !info.owned
        ? `${info.name} kostet ${info.nextPrice} Gold im Shop`
        : letzte
          ? 'mindestens eine Waffe muss mit'
          : info.carried
            ? `${info.name} zu Hause lassen`
            : `${info.name} mitnehmen (${info.dps} Schaden/Sekunde)`;
    }

    // Was passiert, wenn beide Plaetze voll sind — das ist die einzige Regel,
    // die man beim ersten Mal nicht errät.
    this.set('hint', this.el.hint, dabei.length >= LOADOUT.slots
      ? 'Beide Plaetze belegt — ein Klick auf eine dritte Waffe ersetzt die zuerst gewaehlte.'
      : 'Waehle eine zweite Waffe.');
  }

  /** Schreibt nur, wenn sich der Wert geaendert hat. */
  set(key, el, value) {
    if (this.last[key] === value) return;
    this.last[key] = value;
    el.textContent = value;
  }
}

function setText(el, text) {
  if (el.textContent !== text) el.textContent = text;
}
