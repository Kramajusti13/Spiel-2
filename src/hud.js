/**
 * hud.js — Anzeige ueber dem Spielfeld: Leben, Gold, Fortschritt.
 * Zeichnet in Bildschirmkoordinaten (also nach camera.restore()).
 */

import { COLORS, UI, VIEW, LEVEL, PLAYER, DEBUG } from './config.js';
import { drawBar, drawText, fillRect } from './gfx.js';
import { clamp } from './util.js';
import { spentPoints } from './skills.js';
import { nightmareNoDeathCount } from './stats.js';
import { isMaxLevel } from './xp.js';

export function drawHud(ctx, game) {
  const m = UI.hud.margin;
  const player = game.player;

  // --- Leben ---
  const bar = UI.hud.hpBar;
  drawBar(ctx, m, m, bar.width, bar.height, player.hp / player.maxHp,
    COLORS.hpFill, COLORS.hpBack, COLORS.hpBorder);
  drawText(ctx, `${Math.ceil(player.hp)} / ${player.maxHp}`,
    m + bar.width / 2, m + bar.height / 2, COLORS.text, UI.hud.fontSmall, 'center', 'middle');

  // --- Angriffs-Cooldown: schmaler Streifen unter der Lebensleiste ---
  let y = m + bar.height + 4;
  const cdRatio = 1 - player.attackCooldown / player.attackCooldownMax;
  fillRect(ctx, m, y, bar.width, 3, COLORS.hpBack);
  fillRect(ctx, m, y, bar.width * Math.min(1, cdRatio), 3,
    cdRatio >= 1 ? COLORS.playerAccent : COLORS.textDim);
  y += 7;

  // --- Ausdauer (Ausweichrolle) ---
  const st = UI.hud.staminaBar;
  const staminaFull = player.stamina >= player.maxStamina;
  if (!UI.hud.hideStaminaWhenFull || !staminaFull) {
    // Farbe zeigt sofort, ob eine Rolle drin ist.
    const fill = player.staminaFlash > 0
      ? COLORS.staminaEmpty
      : player.stamina < PLAYER.rollCost
        ? COLORS.staminaLow
        : COLORS.staminaFill;
    drawBar(ctx, m, y, st.width, st.height, player.stamina / player.maxStamina,
      fill, COLORS.hpBack, COLORS.hpBorder);
    // Marke bei den Kosten einer Rolle — daran sieht man, wann es wieder reicht.
    const markX = m + st.width * (PLAYER.rollCost / player.maxStamina);
    fillRect(ctx, markX, y, 1, st.height, 'rgba(0,0,0,0.55)');
    y += st.height + 6;
  }

  // --- Ausruestung: die zwei mitgenommenen Waffen auf Taste 1 und 2 ---
  // Welche das sind, entscheidet die Ausruestungswahl auf dem Dashboard
  // (Erweiterung 2, Abschnitt 4). Die dritte liegt zu Hause und steht
  // deshalb auch nicht im HUD.
  const namen = {
    sword: player.swordName,
    bow: player.hasBow ? player.bow.name : '',
    spear: player.spearName,
  };
  player.loadout.forEach((id, i) => {
    const active = player.weapon === id;
    drawText(ctx, `${i + 1} ${namen[id]}`, m + i * 118, y,
      active ? COLORS.text : COLORS.menuTextDisabled, UI.hud.fontSmall);
  });
  y += 14;

  // Abklingzeit des Speerwurfs (Taste F). Nur sichtbar, wenn der Speer
  // gefuehrt wird — sonst waere es eine Zahl ohne Zusammenhang.
  if (player.weapon === 'spear') {
    const bereit = player.throwCooldown <= 0;
    drawText(ctx, bereit ? 'F Wurf bereit' : `F Wurf ${player.throwCooldown.toFixed(1)} s`,
      m, y, bereit ? COLORS.spearTip : COLORS.textDim, UI.hud.fontSmall);
    y += 14;
  }

  if (player.hasShield) {
    const pct = Math.round(player.blockValue * 100);
    drawText(ctx, `${player.shield.name} — ${pct} %${player.blocking ? '  ▲ Block' : ''}`,
      m, y, player.blocking ? COLORS.shieldRim : COLORS.textDim, UI.hud.fontSmall);
    y += 14;
  }

  // --- Heiltraenke (Taste R) ---
  if (player.potions > 0) {
    for (let i = 0; i < player.potions; i++) {
      fillRect(ctx, m + i * 10, y + 2, 7, 9, COLORS.potion);
    }
    drawText(ctx, 'R', m + player.potions * 10 + 4, y, COLORS.textDim, UI.hud.fontSmall);
  }

  // --- Gold ---
  const gx = VIEW.width - m;
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(gx - 62, m + 9, 5, 5, 0, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.gold;
  ctx.fill();
  ctx.strokeStyle = COLORS.goldDark;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();

  // Beim Einsammeln kurz aufleuchten und groesser werden.
  const pop = Math.max(0, game.goldPop);
  drawText(ctx, String(game.gold), gx - 52, m + 2,
    pop > 0 ? '#f4d67a' : COLORS.gold,
    pop > 0 ? '16px "Segoe UI", system-ui, sans-serif' : UI.hud.font);

  // --- Fortschritt im Level ---
  const left = game.enemies.filter((e) => !e.dead).length;
  drawText(ctx, left > 0 ? `Gegner: ${left}` : 'Ausgang offen',
    VIEW.width / 2, m, left > 0 ? COLORS.textDim : COLORS.exitOpen, UI.hud.fontSmall, 'center');
  drawText(ctx, `Getoetet: ${game.kills}`,
    VIEW.width / 2, m + 14, COLORS.textDim, UI.hud.fontSmall, 'center');

  // --- Freie Skillpunkte: Hinweis auf TAB ---
  const free = game.progress.skillPoints;
  if (free > 0) {
    const pulse = 0.7 + 0.3 * Math.sin(performance.now() / 300);
    ctx.save();
    ctx.globalAlpha = pulse;
    drawText(ctx, `${free} Skillpunkt${free === 1 ? '' : 'e'} frei — TAB`,
      VIEW.width / 2, m + 30, COLORS.menuAccent, UI.hud.fontSmall, 'center');
    ctx.restore();
  }

  // Kurzmeldung (Ton an/aus)
  if (game.noticeTimer > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, game.noticeTimer * 2);
    drawText(ctx, game.notice, VIEW.width / 2, VIEW.height - 100,
      COLORS.textDim, UI.hud.fontSmall, 'center', 'middle');
    ctx.restore();
  }

  drawXpBar(ctx, game);
  drawBossBar(ctx, game);
  if (game.levelCleared) drawExitGuidance(ctx, game);
  if (game.debug) drawDebugPanel(ctx, game);
}

/**
 * XP-Leiste am unteren Bildschirmrand, daneben die aktuelle Stufe
 * (Erweiterung, Abschnitt 1).
 *
 * Gezeichnet wird game.xpBarRatio, nicht der echte Wert: die Leiste laeuft
 * dem Kill sichtbar hinterher, statt zu springen.
 */
function drawXpBar(ctx, game) {
  const cfg = UI.hud.xpBar;
  const w = cfg.width;
  const x = Math.round((VIEW.width - w) / 2);
  const y = VIEW.height - cfg.bottomMargin - cfg.height;
  const maxed = isMaxLevel(game.heroLevel);

  // Nach einem Aufstieg leuchtet die Leiste kurz heller nach.
  const flash = game.levelUpFlash > 0;
  drawBar(ctx, x, y, w, cfg.height, game.xpBarRatio,
    flash ? COLORS.xpFillBright : COLORS.xpFill, COLORS.xpBack, COLORS.hpBorder);

  // Stufe links neben der Leiste — die Zahl, die den Fortschritt traegt.
  drawText(ctx, `Stufe ${game.xpBarLevel}`, x - 10, y + cfg.height / 2,
    flash ? COLORS.xpFillBright : COLORS.text, UI.hud.fontSmall, 'right', 'middle');

  // Rechts der Rohwert, damit man das Ziel sieht statt nur einen Balken.
  drawText(ctx, maxed ? 'max.' : `${Math.floor(game.xp)} / ${game.xpNeeded} XP`,
    x + w + 10, y + cfg.height / 2, COLORS.textDim, UI.hud.fontSmall, 'left', 'middle');
}

/**
 * Breite Lebensleiste unten fuer den Boss, mit Phasenmarken.
 * Ueber seinem Kopf waere sie bei 400 HP nicht ablesbar.
 */
function drawBossBar(ctx, game) {
  const boss = game.enemies.find((e) => !e.dead && e.def.isBoss);
  if (!boss) return;

  const w = 460;
  const h = 14;
  const x = Math.round((VIEW.width - w) / 2);
  // Hoeher als frueher: darunter liegt jetzt die XP-Leiste.
  const y = VIEW.height - 66;

  drawText(ctx, boss.name, VIEW.width / 2, y - 12, COLORS.bossAccent, UI.hud.font, 'center', 'middle');
  drawBar(ctx, x, y, w, h, boss.hp / boss.maxHp, COLORS.boss, COLORS.hpBack, COLORS.hpBorder);

  // Marken, an denen die naechste Phase beginnt. Ein Boss ohne Phasen ist
  // erlaubt — er bekommt dann einfach keine Marken, statt das Zeichnen
  // abzubrechen und damit die ganze Spielschleife anzuhalten.
  for (const t of boss.def.phaseThresholds ?? []) {
    fillRect(ctx, x + w * t, y, 1, h, 'rgba(0,0,0,0.6)');
  }
  drawText(ctx, `Phase ${boss.phase} · ${Math.ceil(boss.hp)} / ${boss.maxHp}`,
    VIEW.width / 2, y + h + 9, COLORS.textDim, UI.hud.fontSmall, 'center', 'middle');
}

/**
 * Wegweiser zum offenen Ausgang: Aufforderung, wenn man davorsteht,
 * sonst ein Pfeil am Bildschirmrand in seine Richtung.
 */
function drawExitGuidance(ctx, game) {
  const exit = game.level.exit;
  if (!exit) return;

  if (game.playerAtExit()) {
    drawText(ctx, 'E — Level verlassen', VIEW.width / 2, VIEW.height - 52,
      COLORS.exitOpen, UI.hud.font, 'center', 'middle');
    return;
  }
  if (!LEVEL.showExitArrow) return;

  const sx = exit.x - game.camera.x;
  const sy = exit.y - game.camera.y;
  const onScreen = sx > 0 && sx < VIEW.width && sy > 0 && sy < VIEW.height;
  if (onScreen) return;

  // Pfeil am Rand, in Richtung Ausgang.
  const mg = LEVEL.arrowMargin;
  const cx = VIEW.width / 2;
  const cy = VIEW.height / 2;
  const angle = Math.atan2(sy - cy, sx - cx);
  const px = clamp(sx, mg, VIEW.width - mg);
  const py = clamp(sy, mg, VIEW.height - mg);

  ctx.save();
  ctx.translate(Math.round(px), Math.round(py));
  ctx.rotate(angle);
  ctx.fillStyle = COLORS.exitOpen;
  ctx.beginPath();
  ctx.moveTo(11, 0);
  ctx.lineTo(-7, -7);
  ctx.lineTo(-4, 0);
  ctx.lineTo(-7, 7);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawDebugPanel(ctx, game) {
  const lines = [
    `FPS ${game.fps.toFixed(0)}`,
    `Spieler ${game.player.x.toFixed(0)} / ${game.player.y.toFixed(0)}`,
    `Blick ${((game.player.aim * 180) / Math.PI).toFixed(0)}°`,
    `Gegner ${game.enemies.length}  Muenzen ${game.coins.length}  Pfeile ${game.arrows.length}`,
    `Waffe ${game.player.weapon} · dabei: ${game.player.loadout.join(', ')}`,
    `Ausdauer ${game.player.stamina.toFixed(0)}/${game.player.maxStamina}` +
      `${game.player.isRolling ? ' — rollt' : ''}`,
    `Schild ${game.player.shield.name}` +
      `${game.player.hasShield ? ` ${Math.round(game.player.blockValue * 100)} %` : ''}` +
      `${game.player.blocking ? ' — blockt' : ''}`,
    `Gold ${game.gold} (Durchgang ${game.runGold})`,
    `Heldenstufe ${game.heroLevel}  XP ${game.xp}/${game.xpNeeded}`,
    `Skillpunkte frei ${game.progress.skillPoints}  vergeben ${spentPoints(game.progress)}`,
    `Tode hier ${game.deathsThisLevel}  Wiederbelebung ${game.reviveCost} G`,
    `Level ${game.level.name} (${game.level.width}x${game.level.height}) — ${game.difficulty}`,
    `Ausgang ${game.levelCleared ? 'offen' : 'zu'}${game.playerAtExit() ? ' — in Reichweite' : ''}`,
    // Quest-Zaehler (Schritt 7) — bis die Quest-Kachel sie zeigt (Schritt 8).
    `Kills ${statLine(game.stats.killsByType)}`,
    `Waffe ${statLine(game.stats.killsByWeapon)}  Blocks ${game.stats.blocks}`,
    `Gold gesamt ${game.stats.goldEarned}  Tode ${game.stats.deaths} (Versuch ${game.deathsThisRun})`,
    `Sauber ${game.stats.cleanRuns}  Alptraum ohne Tod ${nightmareNoDeathCount(game.stats)}/${game.stats.nightmareNoDeath.length}`,
  ];
  fillRect(ctx, 0, VIEW.height - 16 * lines.length - 8, 240, 16 * lines.length + 8, 'rgba(0,0,0,0.55)');
  lines.forEach((line, i) => {
    drawText(ctx, line, 8, VIEW.height - 16 * lines.length - 2 + i * 16, COLORS.debug, UI.hud.fontSmall);
  });
}

/** "slime 12  goblin 3" — nur was schon vorkam, sonst wird die Zeile lang. */
function statLine(counter) {
  const parts = Object.entries(counter).filter(([, n]) => n > 0).map(([k, n]) => `${k} ${n}`);
  return parts.length ? parts.join('  ') : '—';
}

/** Kurze Einblendung oben links beim Levelstart. */
export function drawLevelIntro(ctx, level, alpha, difficulty = '') {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  drawText(ctx, level.name, VIEW.width / 2, 74, COLORS.text,
    '26px "Segoe UI", system-ui, sans-serif', 'center', 'middle');
  // Auf welcher Stufe gerade gespielt wird — die Wahl war bewusst, die
  // Bestaetigung beim Start gehoert dazu (Abschnitt 4).
  if (difficulty) {
    drawText(ctx, difficulty, VIEW.width / 2, 98, COLORS.menuAccent,
      UI.hud.font, 'center', 'middle');
  }
  drawText(ctx, 'WASD laufen · Maus zielen · Linksklick angreifen · 1/2 Waffe · F Speerwurf · Leertaste Rolle · TAB Charakter · E Ausgang',
    VIEW.width / 2, 122, COLORS.textDim, UI.hud.fontSmall, 'center', 'middle');
  ctx.restore();
}

export const HUD_DEBUG_DEFAULT = DEBUG.enabled;
