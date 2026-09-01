/** camera.js — folgt dem Spieler weich und bleibt innerhalb der Levelgrenzen. */

import { CAMERA, VIEW } from './config.js';
import { clamp, damp } from './util.js';

export class Camera {
  constructor() {
    this.x = 0; // linke obere Ecke des Sichtfensters in Weltkoordinaten
    this.y = 0;
    this.width = VIEW.width;
    this.height = VIEW.height;
  }

  /** Ohne Nachziehen direkt auf ein Ziel setzen (Levelstart, Wiederbelebung). */
  snapTo(targetX, targetY, level) {
    this.x = targetX - this.width / 2;
    this.y = targetY - this.height / 2;
    this._clamp(level);
  }

  update(targetX, targetY, dt, level) {
    const wantX = targetX - this.width / 2;
    const wantY = targetY - this.height / 2;
    this.x = damp(this.x, wantX, CAMERA.smoothing, dt);
    this.y = damp(this.y, wantY, CAMERA.smoothing, dt);
    this._clamp(level);
  }

  _clamp(level) {
    if (!CAMERA.clampToLevel || !level) return;
    // Ist das Level kleiner als das Fenster, wird es mittig gezeigt.
    this.x = level.pixelWidth <= this.width
      ? (level.pixelWidth - this.width) / 2
      : clamp(this.x, 0, level.pixelWidth - this.width);
    this.y = level.pixelHeight <= this.height
      ? (level.pixelHeight - this.height) / 2
      : clamp(this.y, 0, level.pixelHeight - this.height);
  }

  /** Verschiebt den Kontext so, dass in Weltkoordinaten gezeichnet werden kann. */
  apply(ctx) {
    ctx.save();
    // Ganzzahlig verschieben — sonst flimmern Pixelkanten.
    ctx.translate(-Math.round(this.x), -Math.round(this.y));
  }

  restore(ctx) {
    ctx.restore();
  }

  /** Bildschirm- zu Weltkoordinaten (z. B. fuer die Maus). */
  screenToWorld(sx, sy) {
    return { x: sx + Math.round(this.x), y: sy + Math.round(this.y) };
  }
}
