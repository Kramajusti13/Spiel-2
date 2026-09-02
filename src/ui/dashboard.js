/**
 * dashboard.js — die zentrale Schaltstelle zwischen den Leveln
 * (Erweiterung, Abschnitt 2).
 *
 * Anders als alle anderen Bildschirme des Spiels ist das hier KEIN Canvas:
 * das Geruest steht als HTML in index.html, diese Datei fuellt es und haengt
 * die Klicks an.
 *
 * Etappe 2 — Dashboard-Überarbeitung:
 * Das Dashboard wurde kompakter. Shop, Quests und Route sind jetzt
 * einklappbare Buttons statt permanent sichtbarer Kacheln. In der Mitte
 * bleibt das Spieler-Portrait. Links daneben sitzen die Buttons fuer
 * Shop und Quests; rechts die fuer Charakter, Ausruestung, Schmied,
 * Statistiken und Einstellungen. Die Route liegt als schmale Leiste
 * unten und klappt auf Klick auf.
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

/** CSS fuer das kompakte Dashboard. Wird beim ersten Konstruktor-Aufruf
 *  einmal in den <head> injiziert. */
const DASHBOARD_CSS = `
  /* --- Kompaktes Dashboard-Layout --- */

  /* Das alte 3x3-Raster wird durch ein flexibles Layout ersetzt. */
  #dash-grid {
    display: flex !important;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 8px 16px;
    flex-wrap: wrap;
  }
  /* Alle Kacheln verstecken — wir bauen das Layout neu auf. */
  #dash-grid > .tile,
  #dash-portrait { display: none !important; }

  /* Button-Leiste links */
  #dash-bar-left, #dash-bar-right {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  /* Toggle-Buttons */
  .dash-toggle {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    border: 2px solid #3a3640;
    border-radius: 8px;
    background: #1a1820;
    color: #c9c3b4;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s;
    white-space: nowrap;
  }
  .dash-toggle:hover {
    border-color: #6a5a3a;
    background: #252028;
  }
  .dash-toggle.active {
    border-color: #cbb87a;
    background: #2a2530;
    color: #e8d88a;
  }
  .dash-toggle .dash-toggle-icon {
    font-size: 18px;
  }

  /* Spieler-Portrait in der Mitte */
  #dash-portrait-compact {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 16px 24px;
  }
  #dash-portrait-compact .portrait-circle {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: #1e1c24;
    border: 3px solid #4a4555;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28px;
  }
  #dash-portrait-compact .portrait-name {
    font-size: 16px;
    font-weight: 700;
    color: #d8d3c4;
    margin-top: 6px;
  }
  #dash-portrait-compact .portrait-level {
    font-size: 13px;
    color: #9a948a;
  }
  #dash-portrait-compact .portrait-xp {
    width: 120px;
    height: 6px;
    border-radius: 3px;
    background: #2a2731;
    overflow: hidden;
    margin-top: 4px;
  }
  #dash-portrait-compact .portrait-xp-fill {
    height: 100%;
    background: linear-gradient(90deg, #6a9a4a, #8aba5a);
    border-radius: 3px;
    transition: width 0.3s;
  }
  #dash-portrait-compact .portrait-money {
    display: flex;
    gap: 12px;
    font-size: 12px;
    color: #cbb87a;
    margin-top: 4px;
  }
  #dash-portrait-compact .portrait-sp.has-free {
    color: #ff6a3a;
    font-weight: 700;
  }

  /* Ausklappbare Panels (Shop, Quests) als Overlay */
  #dash-panel-overlay {
    display: none;
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 1000;
    background: #14131a;
    border: 2px solid #3a3640;
    border-radius: 12px;
    box-shadow: 0 0 60px #000a;
    max-width: 700px;
    max-height: 80vh;
    overflow-y: auto;
    padding: 20px;
  }
  #dash-panel-overlay.open { display: block; }
  #dash-panel-overlay .dash-panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid #2a2731;
  }
  #dash-panel-overlay .dash-panel-title {
    font-size: 18px;
    font-weight: 700;
    color: #d8d3c4;
  }
  #dash-panel-overlay .dash-panel-close {
    background: none;
    border: 1px solid #3a3640;
    color: #9a948a;
    border-radius: 6px;
    padding: 4px 12px;
    cursor: pointer;
    font-size: 14px;
  }
  #dash-panel-overlay .dash-panel-close:hover {
    background: #2a2530;
    color: #d8d3c4;
  }
  #dash-panel-backdrop {
    display: none;
    position: fixed;
    inset: 0;
    background: #000a;
    z-index: 999;
  }
  #dash-panel-backdrop.open { display: block; }

  /* Route als schmale Leiste unten */
  #dash-route-bar {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 8px 16px;
    border-top: 2px solid #2a2731;
    margin-top: 4px;
  }
  #dash-route-bar .route-toggle {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 16px;
    border: 2px solid #3a3640;
    border-radius: 8px;
    background: #1a1820;
    color: #c9c3b4;
    font-size: 13px;
    cursor: pointer;
  }
  #dash-route-bar .route-toggle:hover {
    border-color: #6a5a3a;
  }
  #dash-route-bar .route-toggle.active {
    border-color: #cbb87a;
    color: #e8d88a;
  }
  #dash-route-bar #dash-message {
    font-size: 12px;
    color: #9a948a;
  }

  /* Route-Ausklappbereich */
  #dash-route-expand {
    display: none;
    padding: 12px 16px;
    border-top: 1px solid #2a2731;
  }
  #dash-route-expand.open { display: block; }
  #dash-route-expand #route-chain {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 2px;
    margin-bottom: 8px;
  }
  #dash-route-expand #dash-play-row {
    display: flex;
    justify-content: center;
    margin-top: 8px;
  }
`;

let cssInjected = false;

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

    this.message = '';
    this.modal = '';
    this.last = {};
    /** Welches Panel gerade offen ist: '', 'shop', 'quests'. */
    this.openPanel = '';

    this.shop = new ShopTile(game, this.el.shopList, this.el.shopMessage);
    this.quests = new QuestTile(game, this.el.questList, this.el.questMessage);
    this.route = new RouteTile(game, this);
    this.character = new CharacterTile(game, document.getElementById('tile-character'));
    this.loadout = new LoadoutWindow(game, this);
    this.loadoutTile = new LoadoutTile(game, this);
    this.smithy = new SmithyTile(game);
    this.statsTile = new StatsTile(game);
    this.settingsTile = new SettingsTile(game);
    this.portrait = {
      level: document.querySelector('[data-role="portrait-level"]'),
      xpFill: document.querySelector('[data-role="portrait-xp-fill"]'),
      gold: document.querySelector('[data-role="portrait-gold"]'),
      sp: document.querySelector('[data-role="portrait-sp"]'),
    };
    this.injectCSS();
    this.restructureLayout();
    this.bind();
  }

  /** CSS einmalig in den <head> injizieren. */
  injectCSS() {
    if (cssInjected) return;
    cssInjected = true;
    const style = document.createElement('style');
    style.textContent = DASHBOARD_CSS;
    document.head.append(style);
  }

  /**
   * Das 3x3-Raster wird in ein kompaktes Layout umgebaut:
   * Links: Shop- und Quest-Buttons.
   * Mitte: Spieler-Portrait.
   * Rechts: Charakter, Ausruestung, Schmied, Statistiken, Einstellungen.
   * Unten: Route als einklappbare Leiste.
   * Die Original-Kacheln werden nicht zerstoert — sie werden nur
   * ausgeblendet und ihre Inhalte in Panels verschoben.
   */
  restructureLayout() {
    const grid = document.getElementById('dash-grid');
    if (!grid) return;
    if (grid.dataset.restructured) return; // nur einmal
    grid.dataset.restructured = '1';

    const portraitEl = document.getElementById('dash-portrait');

    // --- Linker Button-Stapel: Shop, Quests ---
    const barLeft = document.createElement('div');
    barLeft.id = 'dash-bar-left';

    const shopBtn = this.makeToggle('Shop', 'shop', '🛒');
    const questBtn = this.makeToggle('Quests', 'quests', '📜');
    barLeft.append(shopBtn, questBtn);

    // --- Mittiges Portrait (kompakt) ---
    const portraitCompact = document.createElement('div');
    portraitCompact.id = 'dash-portrait-compact';
    portraitCompact.innerHTML = `
      <div class="portrait-circle">🗡️</div>
      <span class="portrait-name">Held</span>
      <span class="portrait-level" data-role="portrait-level">Stufe 1</span>
      <span class="portrait-xp"><span class="portrait-xp-fill" data-role="portrait-xp-fill" style="width:0%"></span></span>
      <div class="portrait-money">
        <span class="portrait-gold" data-role="portrait-gold">0 Gold</span>
        <span class="portrait-sp" data-role="portrait-sp">0 SP</span>
      </div>
    `;
    // Die Portrait-Referenzen auf das kompakte Element umleiten.
    this.portrait.level = portraitCompact.querySelector('[data-role="portrait-level"]');
    this.portrait.xpFill = portraitCompact.querySelector('[data-role="portrait-xp-fill"]');
    this.portrait.gold = portraitCompact.querySelector('[data-role="portrait-gold"]');
    this.portrait.sp = portraitCompact.querySelector('[data-role="portrait-sp"]');

    // --- Rechter Button-Stapel: Charakter, Ausruestung, Schmied, Stats, Einstellungen ---
    const barRight = document.createElement('div');
    barRight.id = 'dash-bar-right';

    const charBtn = this.makeLink('Charakter', () => this.game.openCharacterScreen('dashboard'), '🧙');
    const loadoutBtn = this.makeLink('Ausruestung', () => this.toggleLoadout(), '⚔️');
    const smithyBtn = this.makeLink('Schmied', () => this.smithy.open(), '🔨');
    const statsBtn = this.makeLink('Statistiken', () => this.statsTile.open(), '📊');
    const settingsBtn = this.makeLink('Einstellungen', () => this.toggleSettings(), '⚙️');

    barRight.append(charBtn, loadoutBtn, smithyBtn, statsBtn, settingsBtn);

    // --- Route-Leiste unten ---
    const routeBar = document.createElement('div');
    routeBar.id = 'dash-route-bar';
    const routeToggle = document.createElement('button');
    routeToggle.type = 'button';
    routeToggle.className = 'route-toggle';
    routeToggle.innerHTML = '🗺️ <span>Pfad</span> <span style="opacity:0.5">▾</span>';
    routeToggle.addEventListener('click', () => {
      const expand = document.getElementById('dash-route-expand');
      const open = expand.classList.toggle('open');
      routeToggle.classList.toggle('active', open);
    });
    // Die dash-message unter die Route-Leiste verschieben.
    const msgEl = this.el.message;
    routeBar.append(routeToggle, msgEl);

    const routeExpand = document.createElement('div');
    routeExpand.id = 'dash-route-expand';

    // Die Route-Kachel (tile-route) in den Ausklappbereich verschieben.
    const routeTile = document.getElementById('tile-route');
    if (routeTile) {
      routeTile.style.display = '';
      routeExpand.append(routeTile);
    }

    // --- Overlay fuer Shop/Quests ---
    const backdrop = document.createElement('div');
    backdrop.id = 'dash-panel-backdrop';
    backdrop.addEventListener('click', () => this.closePanel());

    const overlay = document.createElement('div');
    overlay.id = 'dash-panel-overlay';
    overlay.innerHTML = `
      <div class="dash-panel-header">
        <span class="dash-panel-title" id="dash-panel-title">Panel</span>
        <button class="dash-panel-close" type="button" id="dash-panel-close">✕</button>
      </div>
      <div id="dash-panel-body"></div>
    `;

    // --- Alles zusammenbauen ---
    grid.append(barLeft, portraitCompact, barRight);
    this.root.append(routeBar, routeExpand);
    document.body.append(backdrop, overlay);

    // Close-Button und Backdrop
    overlay.querySelector('#dash-panel-close').addEventListener('click', () => this.closePanel());
  }

  /** Erzeugt einen Toggle-Button, der ein Panel oeffnet/schliesst. */
  makeToggle(label, panelName, icon) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'dash-toggle';
    btn.dataset.panel = panelName;
    btn.innerHTML = `<span class="dash-toggle-icon">${icon}</span> <span>${label}</span>`;
    btn.addEventListener('click', () => this.togglePanel(panelName, btn));
    return btn;
  }

  /** Erzeugt einen Link-Button, der eine Aktion ausfuehrt. */
  makeLink(label, action, icon) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'dash-toggle';
    btn.innerHTML = `<span class="dash-toggle-icon">${icon}</span> <span>${label}</span>`;
    btn.addEventListener('click', action);
    return btn;
  }

  /** Shop- oder Quest-Panel als Overlay oeffnen/schliessen. */
  togglePanel(name, btn) {
    if (this.openPanel === name) {
      this.closePanel();
      return;
    }
    this.closePanel();

    const overlay = document.getElementById('dash-panel-overlay');
    const backdrop = document.getElementById('dash-panel-backdrop');
    const title = overlay.querySelector('#dash-panel-title');
    const body = overlay.querySelector('#dash-panel-body');

    if (name === 'shop') {
      title.textContent = 'Shop';
      const shopTile = document.getElementById('tile-shop');
      body.append(shopTile);
      shopTile.style.display = '';
      this.shop.refresh();
    } else if (name === 'quests') {
      title.textContent = 'Quests';
      const questTile = document.getElementById('tile-quests');
      body.append(questTile);
      questTile.style.display = '';
      this.quests.refresh();
    }

    overlay.classList.add('open');
    backdrop.classList.add('open');
    this.openPanel = name;
    btn.classList.add('active');
  }

  closePanel() {
    const overlay = document.getElementById('dash-panel-overlay');
    const backdrop = document.getElementById('dash-panel-backdrop');
    overlay.classList.remove('open');
    backdrop.classList.remove('open');
    // Alle Toggle-Buttons deaktivieren.
    document.querySelectorAll('.dash-toggle.active[data-panel]').forEach(
      (b) => b.classList.remove('active'),
    );
    // Die Panel-Inhalte wieder ins Grid zuruecklegen (aus dem Overlay entfernen).
    const body = overlay.querySelector('#dash-panel-body');
    while (body.firstChild) {
      const child = body.firstChild;
      body.removeChild(child);
      // Zurueck ins dash-grid (dort sind sie per CSS versteckt).
      document.getElementById('dash-grid')?.append(child);
    }
    this.openPanel = '';
  }

  toggleLoadout() {
    this.modal = this.modal === 'loadout' ? '' : 'loadout';
    this.loadout.refresh();
  }

  toggleSettings() {
    const game = this.game;
    const muted = game.toggleMuted();
    const gespeichert = game.save();
    this.setMessage(
      'Ton ' + (muted ? 'aus' : 'an') + ' (nur fuer diese Sitzung)' +
      (gespeichert ? ' · Spielstand gespeichert' : '')
    );
  }

  bind() {
    const game = this.game;
    this.el.character.addEventListener('click', () => game.openCharacterScreen('dashboard'));
    this.el.settings.addEventListener('click', () => this.toggleSettings());
  }

  open(message = '') {
    this.message = message;
    this.modal = '';
    this.closePanel();
    // Route zuklappen.
    const expand = document.getElementById('dash-route-expand');
    if (expand) expand.classList.remove('open');
    this.shop.build();
    this.shop.refresh();
    this.quests.open();
    this.route.preselect();
    this.route.refresh();
    this.loadout.refresh();
    this.last = {};
    this.refresh();
  }

  setMessage(text) {
    this.message = text;
    this.refresh();
  }

  refresh() {
    const game = this.game;
    const last = this.last;

    const level = game.xpBarLevel;
    const ratio = game.xpBarRatio;
    const maxed = isMaxLevel(game.heroLevel);

    this.set('level', this.el.level, 'textContent', 'Stufe ' + level);
    this.set('gold', this.el.gold, 'textContent', game.gold.toLocaleString('de-DE') + ' Gold');

    const free = game.progress.skillPoints;
    this.set('points', this.el.points, 'textContent',
      free > 0 ? free + ' Skillpunkt' + (free === 1 ? '' : 'e') + ' frei' : 'keine freien Skillpunkte');
    this.el.points.classList.toggle('has-free', free > 0);
    this.el.character.classList.toggle('pulse', free > 0);

    this.set('xpText', this.el.xpText, 'textContent',
      maxed ? 'Maximalstufe' : 'XP ' + Math.floor(game.xp) + ' / ' + game.xpNeeded);
    const pct = (ratio * 100).toFixed(1) + '%';
    if (last.xpPct !== pct) {
      this.el.xpFill.style.width = pct;
      last.xpPct = pct;
    }
    this.el.xpFill.classList.toggle('flash', game.levelUpFlash > 0);

    this.set('message', this.el.message, 'textContent', this.message);

    // Kompaktes Portrait.
    if (this.portrait.level) {
      this.set('portraitLevel', this.portrait.level, 'textContent', 'Stufe ' + level);
    }
    if (this.portrait.xpFill) {
      this.portrait.xpFill.style.width = pct;
    }
    if (this.portrait.gold) {
      this.set('portraitGold', this.portrait.gold, 'textContent',
        game.gold.toLocaleString('de-DE') + ' Gold');
    }
    if (this.portrait.sp) {
      this.set('portraitSp', this.portrait.sp, 'textContent',
        free + ' SP' + (free === 1 ? '' : ''));
      this.portrait.sp.classList.toggle('has-free', free > 0);
    }
  }

  set(key, el, prop, value) {
    if (this.last[key] === value) return;
    this.last[key] = value;
    el[prop] = value;
  }

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
    document.getElementById('tile-shop')?.classList.toggle(
      'has-new', this.shop.hasNewAffordable?.() ?? false,
    );
  }
}
