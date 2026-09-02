/**
 * dashboard.js — die zentrale Schaltstelle zwischen den Leveln
 * (Erweiterung, Abschnitt 2).
 *
 * Anders als alle anderen Bildschirme des Spiels ist das hier KEIN Canvas:
 * das Geruest steht als HTML in index.html, diese Datei fuellt es und haengt
 * die Klicks an. Grund steht im Dokument — Menues auf dem Canvas zu zeichnen
 * ist deutlich aufwendiger, weil jeder Knopf von Hand gezeichnet und jede
 * Klickflaeche ausgerechnet werden muesste.
 *
 * Umgeschaltet wird ueber body[data-screen]; genau eine der beiden Ansichten
 * ist sichtbar. Den Wechsel macht game.syncScreen() in jedem Bild, damit die
 * Ansicht nie vom Spielzustand abweichen kann.
 *
 * Stand von Schritt 8: Kopfzeile, Shop, Quests und Route sind fertig. Jede
 * Kachel hat ihre eigene Datei (ui/shopTile.js, ui/questTile.js,
 * ui/routeTile.js); hier stehen nur die Kopfzeile und das Zusammenspiel.
 */

import { isMaxLevel } from '../xp.js';
import { ShopTile } from './shopTile.js';
import { QuestTile } from './questTile.js';
import { RouteTile } from './routeTile.js';
import { CharacterTile } from './characterTile.js';
import { LoadoutTile } from './loadoutTile.js';
import { SmithyTile } from './smithyTile.js';
import { StatsTile } from './statsTile.js';
import { SettingsTile } from './settingsTile.js';
import { LoadoutWindow } from './loadoutWindow.js';

export class Dashboard {
  constructor(game) {
    this.game = game;

    this.root = document.getElementById('dashboard');
    this.el = {
      level: document.getElementById('dash-level'),
      xpFill: document.getElementById('dash-xp-fill'),
      xpText: document.getElementById('dash-xp-text'),
      gold: document.getElementById('dash-gold'),
      points: document.getElementById('dash-points'),
      character: document.getElementById('dash-character'),
      settings: document.getElementById('dash-settings'),
      shopList: document.getElementById('dash-shop-list'),
      shopMessage: document.getElementById('dash-shop-message'),
      questList: document.getElementById('dash-quest-list'),
      questMessage: document.getElementById('dash-quest-message'),
      message: document.getElementById('dash-message'),
    };

    /** Meldung unter der Route, z. B. "Waldlichtung geschafft". */
    this.message = '';
    /**
     * Offenes Fenster ueber dem Dashboard: '', 'level' oder 'loadout'. Das
     * Charakterfenster laeuft nicht hierueber — es kann auch ueber dem Spiel
     * liegen und haengt deshalb am Spielzustand (game.syncScreen).
     */
    this.modal = '';
    /** Zuletzt geschriebene Texte — sonst wuerde jedes Bild ins DOM schreiben. */
    this.last = {};

    this.shop = new ShopTile(game, this.el.shopList, this.el.shopMessage);
    this.quests = new QuestTile(game, this.el.questList, this.el.questMessage);
    this.route = new RouteTile(game, this);
    this.character = new CharacterTile(game, document.getElementById('tile-character'));
    // Ausruestungsfenster (bestehend) — wird von der neuen Ausruestungs-Kachel
    // geoeffnet, damit die Kachel selbst nur eine Kurzfassung zeigen muss.
    this.loadout = new LoadoutWindow(game, this);
    // Vier neue Kacheln des 3x3-Rasters (VERBESSERUNGEN_1 Abschnitt 1).
    this.loadoutTile = new LoadoutTile(game, this);
    this.smithy = new SmithyTile(game);
    this.statsTile = new StatsTile(game);
    this.settingsTile = new SettingsTile(game);
    // Portrait-Elemente fuer die Mitte des Rasters.
    this.portrait = {
      level: document.querySelector('[data-role="portrait-level"]'),
      xpFill: document.querySelector('[data-role="portrait-xp-fill"]'),
      gold: document.querySelector('[data-role="portrait-gold"]'),
      sp: document.querySelector('[data-role="portrait-sp"]'),
    };
    this.bind();
  }

  bind() {
    const game = this.game;

    this.el.character.addEventListener('click', () => game.openCharacterScreen('dashboard'));

    // Einstellungen: bis es ein eigenes Fenster gibt, das Noetigste.
    // Der Ton selbst steht NICHT im Spielstand (siehe save.js) — die Meldung
    // nennt die beiden Dinge deshalb getrennt.
    this.el.settings.addEventListener('click', () => {
      const muted = game.toggleMuted();
      const gespeichert = game.save();
      this.setMessage(`Ton ${muted ? 'aus' : 'an'} (nur fuer diese Sitzung)`
        + (gespeichert ? ' · Spielstand gespeichert' : ''));
    });
  }

  /**
   * Dashboard zeigen.
   * @param {string} [message] Einzeiler, z. B. "Waldlichtung geschafft".
   */
  open(message = '') {
    this.message = message;
    // Beim Betreten ist kein Fenster offen — auch nicht, wenn der Spieler
    // zuletzt eines offen hatte.
    this.modal = '';
    this.shop.build();
    this.shop.refresh();
    this.quests.open();
    // Nach einem Level auf das vorwaehlen, was jetzt dran ist.
    this.route.preselect();
    this.route.refresh();
    // Blendet die beiden Zugaenge ein, sobald die zweite Waffe gekauft ist.
    this.loadout.refresh();
    this.last = {};
    this.refresh();
  }


  setMessage(text) {
    this.message = text;
    this.refresh();
  }

  /**
   * Werte in die Kopfzeile schreiben. Wird jedes Bild aufgerufen, schreibt
   * aber nur, was sich geaendert hat — sonst faenden sich in den Dev-Tools
   * 60 DOM-Aenderungen pro Sekunde fuer nichts.
   */
  refresh() {
    const game = this.game;
    const last = this.last;

    // Angezeigt wird der animierte Stand, damit die Leiste hier genauso
    // nachlaeuft wie im Spiel.
    const level = game.xpBarLevel;
    const ratio = game.xpBarRatio;
    const maxed = isMaxLevel(game.heroLevel);

    this.set('level', this.el.level, 'textContent', `Stufe ${level}`);
    this.set('gold', this.el.gold, 'textContent', `${game.gold.toLocaleString('de-DE')} Gold`);

    const free = game.progress.skillPoints;
    this.set('points', this.el.points, 'textContent',
      free > 0 ? `${free} Skillpunkt${free === 1 ? '' : 'e'} frei` : 'keine freien Skillpunkte');
    this.el.points.classList.toggle('has-free', free > 0);
    // Der auffaellige Hinweis aus Abschnitt 2.
    this.el.character.classList.toggle('pulse', free > 0);

    this.set('xpText', this.el.xpText, 'textContent',
      maxed ? 'Maximalstufe' : `XP ${Math.floor(game.xp)} / ${game.xpNeeded}`);
    const pct = `${(ratio * 100).toFixed(1)}%`;
    if (last.xpPct !== pct) {
      this.el.xpFill.style.width = pct;
      last.xpPct = pct;
    }
    this.el.xpFill.classList.toggle('flash', game.levelUpFlash > 0);

    this.set('message', this.el.message, 'textContent', this.message);

    // Portrait in der Mitte des 3x3-Rasters (VERBESSERUNGEN_1 Abschnitt 1).
    if (this.portrait.level) {
      this.set('portraitLevel', this.portrait.level, 'textContent', `Stufe ${level}`);
    }
    if (this.portrait.xpFill && last.xpPct === pct) {
      this.portrait.xpFill.style.width = pct;
    } else if (this.portrait.xpFill) {
      this.portrait.xpFill.style.width = pct;
    }
    if (this.portrait.gold) {
      this.set('portraitGold', this.portrait.gold, 'textContent',
        `${game.gold.toLocaleString('de-DE')} Gold`);
    }
    if (this.portrait.sp) {
      this.set('portraitSp', this.portrait.sp, 'textContent',
        `${free} SP${free === 1 ? '' : ''}`);
      this.portrait.sp.classList.toggle('has-free', free > 0);
    }
  }

  /** Schreibt nur, wenn sich der Wert geaendert hat. */
  set(key, el, prop, value) {
    if (this.last[key] === value) return;
    this.last[key] = value;
    el[prop] = value;
  }

  /** Laeuft im Spieltakt, damit sich die XP-Leiste auch hier fuellt. */
  update(dt) {
    this.refresh();
    this.shop.refresh(dt);
    this.quests.refresh();
    this.route.refresh();
    this.character.refresh();
    this.loadout.refresh();
    this.loadoutTile.refresh();
    this.smithy.refresh();
    this.statsTile.refresh();
    this.settingsTile.refresh();
    // Kleiner Punkt auf der Shop-Kachel, wenn etwas neu bezahlbar geworden ist.
    document.getElementById('tile-shop')?.classList.toggle(
      'has-new', this.shop.hasNewAffordable?.() ?? false,
    );
  }
}
