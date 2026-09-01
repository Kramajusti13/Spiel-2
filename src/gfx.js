/**
 * gfx.js — die einzige Stelle, an der tatsaechlich gezeichnet wird.
 *
 * Der gesamte uebrige Code sagt nur "zeichne das Ding mit dem Schluessel 'slime'
 * an dieser Stelle in dieser Groesse". Solange fuer einen Schluessel kein Bild
 * registriert ist, kommt ein farbiges Platzhalter-Rechteck heraus.
 *
 * Sprites einhaengen (Schritt 13) — mehr ist nicht noetig:
 *
 *   import { loadSprite, loadSpriteSheet } from './gfx.js';
 *   await loadSprite('slime', './assets/sprites/slime.png');
 *   await loadSpriteSheet('player', './assets/sprites/player.png', 32, 32);
 *
 * Danach zeichnen dieselben Aufrufe automatisch das Bild statt des Rechtecks.
 */

import { SPRITES } from './config.js';

/** key -> { image, frameW, frameH, frames } */
const sprites = new Map();

/** Einzelbild registrieren. */
export function registerSprite(key, image) {
  sprites.set(key, { image, frameW: image.width, frameH: image.height, frames: 1 });
}

/** Spritesheet registrieren: waagerechte Reihe von Einzelbildern. */
export function registerSpriteSheet(key, image, frameW, frameH) {
  sprites.set(key, {
    image,
    frameW,
    frameH,
    frames: Math.max(1, Math.floor(image.width / frameW)),
  });
}

export function hasSprite(key) {
  return sprites.has(key);
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Bild nicht ladbar: ' + url));
    img.src = url;
  });
}

export async function loadSprite(key, url) {
  registerSprite(key, await loadImage(url));
}

export async function loadSpriteSheet(key, url, frameW, frameH) {
  registerSpriteSheet(key, await loadImage(url), frameW, frameH);
}

/**
 * Zeichnet ein Objekt mittig auf (x, y).
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {string}  key      Sprite-Schluessel, z. B. 'slime'
 * @param {number}  x        Weltkoordinate der Mitte
 * @param {number}  y        Weltkoordinate der Mitte
 * @param {number}  w        Breite
 * @param {number}  h        Hoehe
 * @param {string}  color    Platzhalterfarbe, solange kein Sprite geladen ist
 * @param {object} [opt]     { frame, flipX, alpha, rotation, tint, tintAlpha }
 */
export function drawSprite(ctx, key, x, y, w, h, color, opt = {}) {
  const { frame = 0, flipX = false, alpha = 1, rotation = 0, tint = null, tintAlpha = 0.6 } = opt;
  const px = Math.round(x - w / 2);
  const py = Math.round(y - h / 2);

  const needsTransform = flipX || rotation !== 0;
  if (alpha !== 1 || needsTransform) ctx.save();
  if (alpha !== 1) ctx.globalAlpha = alpha;

  if (needsTransform) {
    ctx.translate(Math.round(x), Math.round(y));
    if (rotation) ctx.rotate(rotation);
    if (flipX) ctx.scale(-1, 1);
    ctx.translate(-Math.round(x), -Math.round(y));
  }

  const entry = sprites.get(key);
  if (entry) {
    const f = entry.frames > 1 ? ((frame % entry.frames) + entry.frames) % entry.frames : 0;
    ctx.drawImage(entry.image, f * entry.frameW, 0, entry.frameW, entry.frameH, px, py, w, h);
    if (tint) {
      // Faerbt nur die Pixel des Sprites ein (Treffer-Blitz).
      ctx.save();
      ctx.globalAlpha = tintAlpha * alpha;
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = tint;
      ctx.fillRect(px, py, w, h);
      ctx.restore();
    }
  } else {
    // Platzhalter: farbiges Rechteck mit dunkler Kante, damit Formen ablesbar bleiben.
    ctx.fillStyle = tint ?? color;
    ctx.fillRect(px, py, Math.round(w), Math.round(h));
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.lineWidth = 1;
    ctx.strokeRect(px + 0.5, py + 0.5, Math.round(w) - 1, Math.round(h) - 1);
  }

  if (alpha !== 1 || needsTransform) ctx.restore();
}

/**
 * Zeichengroesse fuer eine Figur.
 *
 * Ohne Sprite: die Platzhaltermasse aus config (z. B. 22x28).
 * Mit Sprite: quadratisch, weil alle Assets 32x32 sind (Abschnitt 8) — sonst
 * wuerde ein quadratisches Bild in ein hochkantiges Rechteck gequetscht.
 *
 * @param {string} key    Sprite-Schluessel
 * @param {{w:number,h:number}} placeholder  Masse aus config
 * @param {number} [scale] Vergroesserung, 1 = 32 px
 */
export function spriteSize(key, placeholder, scale = 1) {
  if (!sprites.has(key)) return { w: placeholder.w, h: placeholder.h };
  const side = SPRITES.size * scale;
  return { w: side, h: side };
}

/** Kachel zeichnen: gleiche Logik, aber auf der Ecke (x, y) statt mittig. */
export function drawTile(ctx, key, x, y, size, color, opt = {}) {
  drawSprite(ctx, key, x + size / 2, y + size / 2, size, size, color, opt);
}

/** Rechteck ohne Sprite-Fallback (HUD, Balken, Debug). */
export function fillRect(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

export function strokeRect(ctx, x, y, w, h, color, lineWidth = 1) {
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.strokeRect(Math.round(x) + 0.5, Math.round(y) + 0.5, Math.round(w) - 1, Math.round(h) - 1);
}

/** Standard-Balken (HP, Ausdauer) mit Rahmen. */
export function drawBar(ctx, x, y, w, h, ratio, fillColor, backColor, borderColor) {
  const r = Math.max(0, Math.min(1, ratio));
  fillRect(ctx, x - 1, y - 1, w + 2, h + 2, borderColor);
  fillRect(ctx, x, y, w, h, backColor);
  if (r > 0) fillRect(ctx, x, y, Math.max(1, Math.round(w * r)), h, fillColor);
}

export function drawText(ctx, text, x, y, color, font, align = 'left', baseline = 'top') {
  ctx.font = font;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.fillText(text, Math.round(x) + 1, Math.round(y) + 1);
  ctx.fillStyle = color;
  ctx.fillText(text, Math.round(x), Math.round(y));
}
