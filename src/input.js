/**
 * input.js — Tastatur und Maus.
 *
 * Die Maus wird in Canvas-Koordinaten umgerechnet (das Canvas kann per CSS
 * skaliert sein), damit Zielen unabhaengig von der Fenstergroesse stimmt.
 */

/**
 * Gehoert die Tastatur gerade dem HTML statt dem Spiel?
 *
 * Das ist der Fall auf dem Dashboard und immer dann, wenn ein HTML-Fenster
 * offen ist (Charakterfenster). Dort muss TAB zwischen den Knoepfen wandern
 * und die Leertaste einen Knopf druecken duerfen — das Spiel hoert in beiden
 * Faellen ohnehin nicht zu.
 */
function htmlHasKeyboard() {
  const body = document.body;
  return body.dataset.screen === 'dashboard' || Boolean(body.dataset.modal);
}

export class Input {
  constructor(canvas) {
    this.canvas = canvas;

    /** Aktuell gedrueckte Tasten (KeyboardEvent.code). */
    this.keys = new Set();
    /** Tasten, die in diesem Frame neu gedrueckt wurden. */
    this.pressed = new Set();

    /** Mausposition in Canvas-Pixeln. */
    this.mouse = { x: canvas.width / 2, y: canvas.height / 2 };
    this.mouseDown = [false, false, false];   // 0 = links, 1 = mitte, 2 = rechts
    this.mousePressed = [false, false, false]; // nur im Frame des Klicks

    this._bind();
  }

  _bind() {
    const c = this.canvas;

    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      if (htmlHasKeyboard()) return;
      // Leertaste und Pfeiltasten sollen die Seite nicht scrollen,
      // F1/F2 nicht die Browser-Hilfe oeffnen.
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab', 'F1', 'F2']
        .includes(e.code)) {
        e.preventDefault();
      }
      this.keys.add(e.code);
      this.pressed.add(e.code);
    });

    window.addEventListener('keyup', (e) => this.keys.delete(e.code));

    // Beim Fokusverlust alles loslassen, sonst "klebt" eine Taste.
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.mouseDown = [false, false, false];
    });

    c.addEventListener('mousemove', (e) => this._updateMouse(e));

    c.addEventListener('mousedown', (e) => {
      this._updateMouse(e);
      if (e.button < 3) {
        this.mouseDown[e.button] = true;
        this.mousePressed[e.button] = true;
      }
      e.preventDefault();
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button < 3) this.mouseDown[e.button] = false;
    });

    // Rechtsklick blockt spaeter mit dem Schild — kein Browser-Kontextmenue.
    c.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  _updateMouse(e) {
    const rect = this.canvas.getBoundingClientRect();
    // Von CSS-Pixeln zurueck auf die interne Canvas-Aufloesung rechnen.
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * this.canvas.width;
    this.mouse.y = ((e.clientY - rect.top) / rect.height) * this.canvas.height;
  }

  isDown(...codes) {
    return codes.some((c) => this.keys.has(c));
  }

  wasPressed(...codes) {
    return codes.some((c) => this.pressed.has(c));
  }

  /** Bewegungsrichtung als normalisierter Vektor (8 Richtungen). */
  moveVector() {
    let x = 0;
    let y = 0;
    if (this.isDown('KeyA', 'ArrowLeft')) x -= 1;
    if (this.isDown('KeyD', 'ArrowRight')) x += 1;
    if (this.isDown('KeyW', 'ArrowUp')) y -= 1;
    if (this.isDown('KeyS', 'ArrowDown')) y += 1;
    if (x !== 0 && y !== 0) {
      const inv = Math.SQRT1_2; // diagonal nicht schneller
      x *= inv;
      y *= inv;
    }
    return { x, y };
  }

  /** Am Ende jedes Frames aufrufen: Einzelklick-/Tastendruck-Flags zuruecksetzen. */
  endFrame() {
    this.pressed.clear();
    this.mousePressed = [false, false, false];
  }
}
