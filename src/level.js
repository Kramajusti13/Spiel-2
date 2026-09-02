/**
 * level.js — Tilemap aus JSON laden, zeichnen und Kollision aufloesen.
 *
 * Das Kartenformat ist bewusst von Hand lesbar: eine Zeile Text pro Kachelreihe,
 * dazu eine Legende, die jedem Zeichen eine Kachelart zuordnet. So kannst du
 * Level in jedem Texteditor bauen, ohne Code anzufassen.
 */

import { TILE, COLORS } from './config.js';
import { hasSprite, drawTile } from './gfx.js';
import { clamp } from './util.js';

/** Farbe aufloesen: entweder ein Schluessel aus COLORS oder direkt "#rrggbb". */
function resolveColor(value, fallback) {
  if (!value) return fallback;
  if (value.startsWith('#')) return value;
  return COLORS[value] ?? fallback;
}

export class Level {
  constructor(data) {
    this.name = data.name ?? 'Unbenannt';
    this.tileSize = data.tileSize ?? TILE;
    this.rows = data.tiles;
    this.height = this.rows.length;
    this.width = this.rows[0].length;
    this.pixelWidth = this.width * this.tileSize;
    this.pixelHeight = this.height * this.tileSize;

    /** Zeichen -> Kachelbeschreibung. */
    this.legend = {};
    for (const [char, def] of Object.entries(data.legend)) {
      this.legend[char] = {
        name: def.name ?? char,
        solid: Boolean(def.solid),
        sprite: def.sprite ?? `tile.${def.name ?? char}`,
        color: resolveColor(def.color, COLORS.grass),
        topColor: def.topColor ? resolveColor(def.topColor, null) : null,
      };
    }
    this.fallbackTile = {
      name: 'unknown', solid: true, sprite: 'tile.unknown',
      color: COLORS.wall, topColor: COLORS.wallTop,
    };

    this.playerStart = {
      x: (data.playerStart.x + 0.5) * this.tileSize,
      y: (data.playerStart.y + 0.5) * this.tileSize,
    };
    this.exit = data.exit
      ? { x: (data.exit.x + 0.5) * this.tileSize, y: (data.exit.y + 0.5) * this.tileSize }
      : null;
    /** Spawnpunkte in Weltkoordinaten; der Typ verweist auf ENEMIES in config.js. */
    this.spawns = (data.spawns ?? []).map((s) => ({
      type: s.type,
      x: (s.x + 0.5) * this.tileSize,
      y: (s.y + 0.5) * this.tileSize,
    }));

    this._validate();
  }

  _validate() {
    this.rows.forEach((row, i) => {
      if (row.length !== this.width) {
        console.warn(`Level "${this.name}": Zeile ${i} hat ${row.length} statt ${this.width} Zeichen.`);
      }
      for (const ch of row) {
        if (!this.legend[ch]) console.warn(`Level "${this.name}": Zeichen "${ch}" fehlt in der Legende.`);
      }
    });
  }

  tileAt(col, row) {
    if (col < 0 || row < 0 || col >= this.width || row >= this.height) return this.fallbackTile;
    return this.legend[this.rows[row][col]] ?? this.fallbackTile;
  }

  isSolidTile(col, row) {
    return this.tileAt(col, row).solid;
  }

  /** Ist der Weltpunkt (x, y) in einer Wand? */
  isSolidAt(x, y) {
    return this.isSolidTile(Math.floor(x / this.tileSize), Math.floor(y / this.tileSize));
  }

  /** Ist der Weltpunkt (x, y) auf einem Wasser-Tile? (Projektile fliegen ggf. darueber.) */
  isWaterAt(x, y) {
    return this.tileAt(
      Math.floor(x / this.tileSize),
      Math.floor(y / this.tileSize)
    ).name === 'water';
  }

  /** Steckt eine mittig platzierte Box in einer Wand? (z. B. Spawn-Pruefung) */
  isBoxBlocked(x, y, hw, hh) {
    const c0 = Math.floor((x - hw) / this.tileSize);
    const c1 = Math.floor((x + hw - 0.001) / this.tileSize);
    const r0 = Math.floor((y - hh) / this.tileSize);
    const r1 = Math.floor((y + hh - 0.001) / this.tileSize);
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        if (this.isSolidTile(c, r)) return true;
      }
    }
    return false;
  }

  /**
   * Ist die Luftlinie von (x0, y0) nach (x1, y1) frei fuer eine Box dieser Groesse?
   * Wird von der Gegner-KI gebraucht (und spaeter vom Bogenschuetzen).
   */
  isPathClear(x0, y0, x1, y1, hw, hh, maxDistance = Infinity) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const length = Math.hypot(dx, dy);
    if (length > maxDistance) return false;
    if (length < 1) return !this.isBoxBlocked(x0, y0, hw, hh);

    // In halben Kachelschritten abtasten — fein genug, um keine Wand zu ueberspringen.
    const steps = Math.ceil(length / (this.tileSize / 2));
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      if (this.isBoxBlocked(x0 + dx * t, y0 + dy * t, hw, hh)) return false;
    }
    return true;
  }

  /**
   * Bewegt eine Entitaet um (dx, dy) und schiebt sie aus Waenden heraus.
   * Achsen werden getrennt aufgeloest — dadurch gleitet man an Waenden entlang,
   * statt haengen zu bleiben.
   *
   * Erwartet: entity.x/entity.y = Mittelpunkt, entity.hw/entity.hh = halbe Hitbox.
   * Liefert { hitX, hitY } — nuetzlich, um Rueckstoss abzubrechen.
   */
  moveEntity(entity, dx, dy) {
    const result = { hitX: false, hitY: false };
    const T = this.tileSize;

    if (dx !== 0) {
      entity.x += dx;
      const r0 = Math.floor((entity.y - entity.hh) / T);
      const r1 = Math.floor((entity.y + entity.hh - 0.001) / T);
      if (dx > 0) {
        const col = Math.floor((entity.x + entity.hw - 0.001) / T);
        for (let r = r0; r <= r1; r++) {
          if (this.isSolidTile(col, r)) {
            entity.x = col * T - entity.hw - 0.001;
            result.hitX = true;
            break;
          }
        }
      } else {
        const col = Math.floor((entity.x - entity.hw) / T);
        for (let r = r0; r <= r1; r++) {
          if (this.isSolidTile(col, r)) {
            entity.x = (col + 1) * T + entity.hw + 0.001;
            result.hitX = true;
            break;
          }
        }
      }
    }

    if (dy !== 0) {
      entity.y += dy;
      const c0 = Math.floor((entity.x - entity.hw) / T);
      const c1 = Math.floor((entity.x + entity.hw - 0.001) / T);
      if (dy > 0) {
        const row = Math.floor((entity.y + entity.hh - 0.001) / T);
        for (let c = c0; c <= c1; c++) {
          if (this.isSolidTile(c, row)) {
            entity.y = row * T - entity.hh - 0.001;
            result.hitY = true;
            break;
          }
        }
      } else {
        const row = Math.floor((entity.y - entity.hh) / T);
        for (let c = c0; c <= c1; c++) {
          if (this.isSolidTile(c, row)) {
            entity.y = (row + 1) * T + entity.hh + 0.001;
            result.hitY = true;
            break;
          }
        }
      }
    }

    // Sicherheitsnetz an den Kartenraendern.
    entity.x = clamp(entity.x, entity.hw, this.pixelWidth - entity.hw);
    entity.y = clamp(entity.y, entity.hh, this.pixelHeight - entity.hh);
    return result;
  }

  /** Zeichnet nur die Kacheln, die im Kamerafenster liegen. */
  draw(ctx, camera) {
    const T = this.tileSize;
    const c0 = clamp(Math.floor(camera.x / T), 0, this.width - 1);
    const c1 = clamp(Math.ceil((camera.x + camera.width) / T), 0, this.width);
    const r0 = clamp(Math.floor(camera.y / T), 0, this.height - 1);
    const r1 = clamp(Math.ceil((camera.y + camera.height) / T), 0, this.height);

    for (let r = r0; r < r1; r++) {
      for (let c = c0; c < c1; c++) {
        const tile = this.tileAt(c, r);
        const x = c * T;
        const y = r * T;
        // Platzhalter: Flaeche + oberer Lichtrand. Sobald ein Sprite unter dem
        // Schluessel tile.<name> registriert ist, zeichnet gfx.js dieses stattdessen.
        drawTilePlaceholder(ctx, tile, x, y, T, c, r);
      }
    }
  }
}

/** Getrennt gehalten, damit der Sprite-Tausch spaeter genau hier passiert. */
function drawTilePlaceholder(ctx, tile, x, y, size, col, row) {
  // gfx.drawTile wuerde ein Sprite bevorzugen; ohne Sprite malen wir etwas
  // huebschere Platzhalter als ein reines Rechteck.
  if (hasTileSprite(tile)) {
    drawTileSprite(ctx, tile, x, y, size);
    return;
  }
  ctx.fillStyle = tile.color;
  ctx.fillRect(x, y, size, size);

  if (tile.topColor) {
    ctx.fillStyle = tile.topColor;
    ctx.fillRect(x, y, size, 8);
  }
  // Feines Schachbrett-Rauschen, damit man Bewegung auf dem Boden sieht.
  if (!tile.solid && ((col + row) & 1) === 0) {
    ctx.fillStyle = 'rgba(0,0,0,0.06)';
    ctx.fillRect(x, y, size, size);
  }
  if (tile.solid) {
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1);
  }
}

// Diese beiden Helfer werden aktiv, sobald in Schritt 13 Kachel-Sprites geladen sind.
function hasTileSprite(tile) {
  return hasSprite(tile.sprite);
}
function drawTileSprite(ctx, tile, x, y, size) {
  drawTile(ctx, tile.sprite, x, y, size, tile.color);
}

/** Level-JSON laden. Braucht einen HTTP-Server (fetch geht nicht ueber file://). */
export async function loadLevel(url) {
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`Level "${url}" nicht ladbar (HTTP ${res.status}).`);
  return new Level(await res.json());
}
