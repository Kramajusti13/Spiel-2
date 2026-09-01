/**
 * questTile.js — die Quest-Kachel im Dashboard (Erweiterung, Schritt 8).
 *
 * Drei aktive Quests mit Fortschrittsbalken. Der Fortschritt laeuft von selbst
 * mit — angenommen werden muss nichts, nur die Belohnung wird per Klick
 * abgeholt (Abschnitt 3). Ist eine abgeholt, rueckt die naechste aus der Liste
 * nach; die Zeilen werden dafuer neu gebaut.
 *
 * Was eine Quest verlangt, steht in QUESTS (config.js) — hier steht nur, wie
 * sie aussieht.
 */

import { questLockText, rewardText } from '../quests.js';

export class QuestTile {
  /**
   * @param {import('../game.js').Game} game
   * @param {HTMLElement} listEl
   * @param {HTMLElement} msgEl
   */
  constructor(game, listEl, msgEl) {
    this.game = game;
    this.listEl = listEl;
    this.msgEl = msgEl;

    /** Quest-ID -> Elemente ihrer Zeile. */
    this.rows = new Map();
    /** IDs, fuer die gerade Zeilen stehen — daran erkennt man das Nachruecken. */
    this.shownIds = [];
    this.message = '';
  }

  /**
   * Zeilen fuer die aktuell aktiven Quests bauen. Anders als beim Shop wechselt
   * hier die Belegung: nach dem Abholen steht eine andere Quest im Feld.
   */
  build() {
    const quests = this.game.quests;
    // Die ganze Kachel graut mit aus, nicht nur ihr Inhalt.
    document.getElementById('tile-quests')
      ?.classList.toggle('is-locked', !this.game.questsUnlocked);
    this.listEl.replaceChildren();
    this.rows.clear();
    this.shownIds = quests.map((p) => p.quest.id);

    // Vor dem Urwald ist die Kachel sichtbar, aber leer und grau — mit dem
    // Hinweis, dass da noch etwas kommt (Erweiterung 2, Abschnitt 8). Sie
    // ganz zu verstecken waere schlechter: dann wuesste niemand davon.
    if (!this.game.questsUnlocked) {
      const gesperrt = document.createElement('p');
      gesperrt.className = 'quest-empty quest-locked';
      gesperrt.textContent = questLockText();
      this.listEl.append(gesperrt);
      return;
    }

    if (quests.length === 0) {
      const done = document.createElement('p');
      done.className = 'quest-empty';
      done.textContent = 'Alle Quests erledigt.';
      this.listEl.append(done);
      return;
    }

    for (const { quest } of quests) {
      const row = document.createElement('div');
      row.className = 'quest-row';

      const text = document.createElement('span');
      text.className = 'quest-text';
      text.textContent = quest.text;

      const count = document.createElement('span');
      count.className = 'quest-count';

      const track = document.createElement('span');
      track.className = 'quest-track';
      const fill = document.createElement('span');
      fill.className = 'quest-fill';
      track.append(fill);

      const reward = document.createElement('span');
      reward.className = 'quest-reward';
      reward.textContent = rewardText(quest);

      const claim = document.createElement('button');
      claim.type = 'button';
      claim.className = 'dash-btn quest-claim';
      claim.textContent = 'Abholen';
      claim.addEventListener('click', () => this.claim(quest.id));

      row.append(text, count, track, reward, claim);
      this.listEl.append(row);
      this.rows.set(quest.id, { row, count, fill, claim });
    }
  }

  claim(id) {
    const result = this.game.claimQuest(id);
    if (!result) return;
    this.message = `${result.quest.text} — ${result.parts.join(', ')}`;
    // Die abgeholte Quest verschwindet, eine neue rueckt nach.
    this.build();
    this.refresh();
  }

  /**
   * Fortschritt und Knoepfe nachziehen. Wechselt die Belegung der drei Felder
   * (z. B. nach einem Kill, der eine Quest abschliesst), werden die Zeilen neu
   * gebaut — sonst zeigte das Feld eine Quest, die gar nicht mehr aktiv ist.
   */
  refresh() {
    const quests = this.game.quests;
    const ids = quests.map((p) => p.quest.id);
    if (ids.length !== this.shownIds.length || ids.some((id, i) => id !== this.shownIds[i])) {
      this.build();
      return this.refresh();
    }

    for (const { quest, value, target, ratio, done } of quests) {
      const el = this.rows.get(quest.id);
      if (!el) continue;

      // Quest 11 hat einen langen Text — in der Zaehlzeile steht die Kurzform.
      const label = quest.shortText ? `${quest.shortText} ${value}/${target}` : `${value}/${target}`;
      setText(el.count, label);

      const pct = `${(ratio * 100).toFixed(0)}%`;
      if (el.fill.style.width !== pct) el.fill.style.width = pct;

      el.row.classList.toggle('is-done', done);
      el.claim.disabled = !done;
      el.claim.title = done ? 'Belohnung abholen' : 'noch nicht geschafft';
    }

    setText(this.msgEl, this.message);
    return undefined;
  }

  /** Beim Betreten des Dashboards: Zeilen neu bauen, Meldung aufraeumen. */
  open() {
    this.message = '';
    this.build();
    this.refresh();
  }
}

function setText(el, text) {
  if (el.textContent !== text) el.textContent = text;
}
