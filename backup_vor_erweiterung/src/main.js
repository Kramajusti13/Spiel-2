/**
 * main.js — Einstiegspunkt: Canvas einrichten, Assets und Level laden,
 * Spielschleife starten.
 */

import { VIEW, COLORS, UI } from './config.js';
import { Input } from './input.js';
import { Game } from './game.js';
import { loadAssets } from './assets.js';
import { unlockAudio } from './audio.js';
import { drawText, fillRect } from './gfx.js';

const canvas = document.getElementById('game');
canvas.width = VIEW.width;
canvas.height = VIEW.height;

const ctx = canvas.getContext('2d', { alpha: false });
// Pixel-Art scharf halten — sonst verwischt jede Skalierung.
ctx.imageSmoothingEnabled = false;

const input = new Input(canvas);
const game = new Game(ctx, input);

// Browser lassen Ton erst nach einer Nutzeraktion zu.
for (const ev of ['pointerdown', 'keydown']) {
  window.addEventListener(ev, unlockAudio, { once: false });
}

function showFatal(err) {
  console.error(err);
  const box = document.getElementById('fatal');
  box.style.display = 'block';
  box.textContent =
    `${err.message}\n\n` +
    'Haeufigste Ursache: Die Seite wurde direkt per Doppelklick geoeffnet (file://).\n' +
    'ES-Module und fetch() brauchen einen lokalen Webserver:\n\n' +
    '    node server.mjs\n\n' +
    'und dann http://localhost:8080 im Browser oeffnen.';
}

/** Einfacher Ladebalken, solange Bilder und Toene kommen. */
function drawLoading(done, total) {
  fillRect(ctx, 0, 0, VIEW.width, VIEW.height, COLORS.background);
  drawText(ctx, 'Loot & Blade', VIEW.width / 2, VIEW.height / 2 - 40, COLORS.text,
    '30px "Segoe UI", system-ui, sans-serif', 'center', 'middle');
  const w = 320;
  const x = (VIEW.width - w) / 2;
  const y = VIEW.height / 2;
  fillRect(ctx, x - 1, y - 1, w + 2, 10, COLORS.hpBorder);
  fillRect(ctx, x, y, w, 8, COLORS.hpBack);
  fillRect(ctx, x, y, w * (total ? done / total : 0), 8, COLORS.menuAccent);
  drawText(ctx, `Lade Grafik und Ton … ${done}/${total}`, VIEW.width / 2, y + 26,
    COLORS.textDim, UI.hud.fontSmall, 'center', 'middle');
}

let last = performance.now();
let fpsAccum = 0;
let fpsFrames = 0;

function frame(now) {
  // dt begrenzen: nach einem Tab-Wechsel sonst ein Riesensprung.
  const dt = Math.min((now - last) / 1000, 1 / 30);
  last = now;

  fpsAccum += dt;
  fpsFrames += 1;
  if (fpsAccum >= 0.25) {
    game.fps = fpsFrames / fpsAccum;
    fpsAccum = 0;
    fpsFrames = 0;
  }

  try {
    game.update(dt);
    game.draw();
  } catch (err) {
    showFatal(err);
    return; // Schleife anhalten statt hundertfach dieselbe Meldung
  }
  input.endFrame();
  requestAnimationFrame(frame);
}

async function start() {
  drawLoading(0, 1);
  // Fehlende Dateien sind kein Grund abzubrechen: gfx.js zeichnet dann
  // Platzhalter-Rechtecke, audio.js bleibt still.
  const result = await loadAssets((done, total) => drawLoading(done, total));
  if (result.fehlend.length) {
    console.warn(`${result.fehlend.length} Asset(s) fehlen — es werden Platzhalter benutzt:`,
      result.fehlend);
  }
  console.log(`Assets geladen: ${result.sprites} Sprites, ${result.sounds} Toene`);
  game.assetInfo = result;

  // Kein Level vorladen: das Hauptmenue entscheidet, ob neu oder weiter
  // gespielt wird (Abschnitt 9).
  game.openMainMenu();
  last = performance.now();
  requestAnimationFrame(frame);
}

start().catch(showFatal);

// Praktisch beim Testen: in der Browser-Konsole game.player.hp = 5 usw.
window.game = game;
