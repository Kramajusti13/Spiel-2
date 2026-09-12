/**
 * effects.js — Effect-System für Himmelsthema (Angel Halo, Michael Shockwave, etc.)
 */

import { SPRITES } from './config.js';
import { loadSprite } from './gfx.js';

/**
 * Effect-Typen
 */
export const EFFECT_TYPES = {
  HALO: 'halo',
  SHOCKWAVE: 'shockwave',
  BEAM: 'beam',
  HEAL: 'heal',
};

/**
 * Erstelle einen neuen Effect
 */
export function createEffect(type, x, y, options = {}) {
  return {
    type,
    x,
    y,
    lifetime: options.lifetime || 1.0,
    age: 0,
    sprite: options.sprite || null,
    radius: options.radius || 0,
    color: options.color || '#ffffff',
    update(dt) {
      this.age += dt;
      return this.age < this.lifetime;
    },
    draw(ctx) {
      if (this.sprite && SPRITES[this.sprite]) {
        const spriteKey = this.sprite;
        // Zeichne den Sprite
        ctx.save();
        ctx.globalAlpha = Math.min(1, (this.lifetime - this.age) / (this.lifetime * 0.3));
        ctx.drawImage(
          // Sprite würde hier gezeichnet werden
          null, // Platzhalter
          this.x - 16,
          this.y - 16,
          32,
          32
        );
        ctx.restore();
      }
    }
  };
}

/**
 * Angel Halo Effect
 */
export function createHalo(x, y, radius = 60) {
  return createEffect(EFFECT_TYPES.HALO, x, y, {
    lifetime: 0.5,
    sprite: 'entity.angel',
    radius,
    color: '#ffff00'
  });
}

/**
 * Michael Shockwave Effect
 */
export function createShockwave(x, y, radius = 100) {
  return createEffect(EFFECT_TYPES.SHOCKWAVE, x, y, {
    lifetime: 0.8,
    radius,
    color: '#00ffff'
  });
}

/**
 * Beam Effect (für Speer/Wurf)
 */
export function createBeam(startX, startY, endX, endY) {
  return createEffect(EFFECT_TYPES.BEAM, startX, startY, {
    lifetime: 0.3,
    endX,
    endY,
    color: '#ff0000',
    draw(ctx) {
      ctx.save();
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 4;
      ctx.globalAlpha = (this.lifetime - this.age) / this.lifetime;
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(this.endX, this.endY);
      ctx.stroke();
      ctx.restore();
    }
  });
}

/**
 * Heal Effect
 */
export function createHeal(x, y) {
  return createEffect(EFFECT_TYPES.HEAL, x, y, {
    lifetime: 1.0,
    sprite: 'entity.heal',
    color: '#00ff00'
  });
}

export default {
  createEffect,
  createHalo,
  createShockwave,
  createBeam,
  createHeal,
  EFFECT_TYPES,
};
