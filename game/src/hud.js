// Heads-up display and the full-screen states: title, pause, wave
// banners, the boss health bar and the game-over report. Everything is
// drawn on the same canvas as the action, so screenshots of the game
// show the complete loop: title, HUD, banners and the results screen.

import { VIEW, COLORS, WEAPONS } from './config.js';
import { drawPlayerShip } from './ships.js';

const FONT = '"Segoe UI", system-ui, sans-serif';

function text(ctx, value, x, y, { size = 16, color = COLORS.textMain, align = 'left', weight = 700, alpha = 1, glow = 0, spacing = 0 } = {}) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  try { ctx.letterSpacing = `${spacing}px`; } catch (err) { /* older engines */ }
  if (glow > 0) {
    ctx.shadowColor = color;
    ctx.shadowBlur = glow;
  }
  ctx.fillStyle = color;
  ctx.fillText(value, x, y);
  ctx.restore();
}

function panel(ctx, x, y, w, h, border = 'rgba(67,245,255,0.4)') {
  ctx.save();
  ctx.fillStyle = 'rgba(4,10,26,0.72)';
  ctx.strokeStyle = border;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 10);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function padScore(n) {
  return String(Math.floor(n)).padStart(7, '0');
}

export function drawHUD(ctx, game) {
  // Score block, top-left.
  text(ctx, 'SCORE', 28, 30, { size: 12, color: COLORS.textDim, spacing: 3 });
  text(ctx, padScore(game.score), 28, 56, { size: 30, color: COLORS.textMain, glow: 6 });
  if (game.best > 0) {
    text(ctx, `BEST ${padScore(game.best)}`, 28, 82, { size: 12, color: COLORS.textDim, weight: 600 });
  }
  // Combo meter.
  if (game.multiplier > 1) {
    const w = 118;
    const frac = Math.max(0, game.comboT / game.comboWindow);
    ctx.save();
    ctx.fillStyle = 'rgba(255,217,74,0.18)';
    ctx.fillRect(28, 96, w, 7);
    ctx.fillStyle = COLORS.gold;
    ctx.fillRect(28, 96, w * frac, 7);
    ctx.restore();
    text(ctx, `COMBO x${game.multiplier}`, 28 + w + 10, 100, { size: 15, color: COLORS.gold, glow: 8 });
  }

  // Wave, top-center.
  text(ctx, `WAVE ${String(game.wave).padStart(2, '0')}`, VIEW.width / 2, 38, {
    size: 19, color: COLORS.player, align: 'center', spacing: 4, glow: 8,
  });

  // Lives and bombs, top-right.
  for (let i = 0; i < game.lives; i++) {
    ctx.save();
    ctx.translate(VIEW.width - 40 - i * 38, 40);
    ctx.scale(0.62, 0.62);
    drawPlayerShip(ctx, game.time + i, 0.4);
    ctx.restore();
  }
  text(ctx, `BOMB x${game.bombs}`, VIEW.width - 28, 74, {
    size: 13, color: COLORS.bombPickup, align: 'right', weight: 700,
  });

  // Weapon readout, bottom-left.
  const weapon = WEAPONS[game.weaponLevel];
  text(ctx, weapon.name, 28, VIEW.height - 28, { size: 14, color: COLORS.weaponPickup, spacing: 2 });
  for (let i = 0; i < WEAPONS.length; i++) {
    ctx.save();
    ctx.fillStyle = i <= game.weaponLevel ? COLORS.weaponPickup : 'rgba(143,183,216,0.3)';
    ctx.fillRect(150 + i * 16, VIEW.height - 34, 10, 10);
    ctx.restore();
  }
  if (game.player.shieldT > 0) {
    text(ctx, 'SHIELD', 28, VIEW.height - 54, { size: 12, color: COLORS.shield, spacing: 2 });
  }

  text(ctx, 'P PAUSE · M SOUND', VIEW.width - 28, VIEW.height - 28, {
    size: 11, color: 'rgba(143,183,216,0.55)', align: 'right', weight: 600,
  });
}

export function drawBossBar(ctx, boss) {
  const w = 520;
  const x = (VIEW.width - w) / 2;
  const y = 64;
  text(ctx, 'DREADNOUGHT', x - 14, y + 5, {
    size: 12, color: COLORS.danger, align: 'right', spacing: 3,
  });
  ctx.save();
  ctx.fillStyle = 'rgba(255,56,96,0.15)';
  ctx.fillRect(x, y, w, 10);
  const frac = Math.max(0, boss.hp / boss.maxHp);
  const grad = ctx.createLinearGradient(x, 0, x + w, 0);
  grad.addColorStop(0, '#ff3860');
  grad.addColorStop(1, '#ff9f43');
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w * frac, 10);
  ctx.strokeStyle = 'rgba(255,120,150,0.6)';
  ctx.strokeRect(x, y, w, 10);
  // Turret pips under the bar.
  boss.turrets.forEach((turret, i) => {
    ctx.fillStyle = turret.alive ? COLORS.bossTurret : 'rgba(143,183,216,0.25)';
    ctx.beginPath();
    ctx.arc(VIEW.width / 2 + (i === 0 ? -14 : 14), y + 20, 4, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

export function drawWaveBanner(ctx, game) {
  const t = game.bannerT;
  if (t <= 0) return;
  const inK = Math.min(1, (game.bannerDuration - t) / 0.3);
  const outK = Math.min(1, t / 0.4);
  const alpha = Math.min(inK, outK);
  const isBoss = game.wave % 5 === 0;
  text(ctx, isBoss ? 'WARNING' : `WAVE ${game.wave}`, VIEW.width / 2, 300, {
    size: isBoss ? 54 : 58,
    color: isBoss ? COLORS.danger : COLORS.textMain,
    align: 'center', spacing: 10, glow: 18, alpha,
  });
  text(ctx, isBoss ? 'CAPITAL SIGNATURE DETECTED' : waveFlavor(game.wave), VIEW.width / 2, 348, {
    size: 16, color: isBoss ? '#ff9db4' : COLORS.textDim, align: 'center', spacing: 4, alpha,
  });
}

function waveFlavor(wave) {
  const lines = [
    'THE VOID STIRS',
    'SIGNATURES MULTIPLY',
    'HOLD THE LINE',
    'THEY COME IN WAVES',
    'NO RETREAT',
    'STATIC ON EVERY CHANNEL',
    'THE DARK ANSWERS BACK',
  ];
  return lines[(wave - 1) % lines.length];
}

export function drawTitle(ctx, game) {
  const cx = VIEW.width / 2;
  // Title with a cyan-to-magenta gradient.
  ctx.save();
  const grad = ctx.createLinearGradient(cx - 330, 0, cx + 330, 0);
  grad.addColorStop(0, '#43f5ff');
  grad.addColorStop(0.5, '#9db8ff');
  grad.addColorStop(1, '#ff4fd8');
  ctx.font = `800 96px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  try { ctx.letterSpacing = '10px'; } catch (err) { /* older engines */ }
  ctx.shadowColor = 'rgba(67,245,255,0.8)';
  ctx.shadowBlur = 34;
  ctx.fillStyle = grad;
  ctx.fillText('VOIDSTORM', cx, 218);
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(234,246,255,0.55)';
  ctx.lineWidth = 1;
  ctx.strokeText('VOIDSTORM', cx, 218);
  ctx.restore();

  text(ctx, 'NEON DEEP-SPACE DEFENSE', cx, 282, {
    size: 17, color: COLORS.player, align: 'center', spacing: 8,
  });

  // The hero ship, hovering with a live engine flame.
  ctx.save();
  ctx.translate(cx, 408 + Math.sin(game.time * 1.6) * 7);
  ctx.scale(1.9, 1.9);
  drawPlayerShip(ctx, game.time, 0.7);
  ctx.restore();

  // Decorative rule.
  ctx.save();
  ctx.strokeStyle = 'rgba(67,245,255,0.35)';
  ctx.beginPath();
  ctx.moveTo(cx - 260, 486);
  ctx.lineTo(cx + 260, 486);
  ctx.stroke();
  ctx.restore();

  const left = cx - 250;
  const right = cx + 40;
  const rows = [
    ['MOVE', 'WASD · ARROWS · MOUSE'],
    ['FIRE', 'SPACE · HOLD CLICK'],
    ['BOMB', 'X — CLEARS THE SKY'],
    ['PAUSE', 'P'],
  ];
  rows.forEach(([label, value], i) => {
    const y = 522 + i * 30;
    text(ctx, label, left, y, { size: 14, color: COLORS.textDim, spacing: 2 });
    text(ctx, value, right, y, { size: 14, color: COLORS.textMain });
  });

  const blink = Math.sin(game.time * 3.4) > -0.25;
  if (blink) {
    text(ctx, 'PRESS ENTER OR CLICK TO LAUNCH', cx, 676, {
      size: 19, color: COLORS.gold, align: 'center', spacing: 3, glow: 12,
    });
  }
  if (game.best > 0) {
    text(ctx, `BEST ${padScore(game.best)}`, cx, 716, {
      size: 14, color: COLORS.textDim, align: 'center', spacing: 2,
    });
  }
  text(ctx, 'SURVIVE THE WAVES · BREAK THE DREADNOUGHT EVERY FIFTH', cx, 756, {
    size: 12, color: 'rgba(143,183,216,0.7)', align: 'center', spacing: 2, weight: 600,
  });
}

export function drawPaused(ctx, game) {
  ctx.save();
  ctx.fillStyle = 'rgba(2,5,16,0.62)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.restore();
  text(ctx, 'PAUSED', VIEW.width / 2, 360, {
    size: 52, color: COLORS.textMain, align: 'center', spacing: 10, glow: 16,
  });
  text(ctx, 'PRESS P TO RESUME', VIEW.width / 2, 424, {
    size: 16, color: COLORS.textDim, align: 'center', spacing: 3,
  });
}

export function drawGameOver(ctx, game) {
  ctx.save();
  ctx.fillStyle = 'rgba(10,2,10,0.55)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.restore();
  text(ctx, 'MISSION LOST', VIEW.width / 2, 238, {
    size: 64, color: COLORS.danger, align: 'center', spacing: 8, glow: 22,
  });
  text(ctx, 'THE VOID CLAIMS ANOTHER SHIP', VIEW.width / 2, 288, {
    size: 15, color: '#ff9db4', align: 'center', spacing: 4,
  });

  const px = VIEW.width / 2 - 190;
  panel(ctx, px, 330, 380, 176);
  const stats = [
    ['FINAL SCORE', padScore(game.score)],
    ['WAVE REACHED', String(game.wave)],
    ['KILLS', String(game.kills)],
    ['BEST', padScore(game.best)],
  ];
  stats.forEach(([label, value], i) => {
    const y = 362 + i * 38;
    text(ctx, label, px + 28, y, { size: 13, color: COLORS.textDim, spacing: 2 });
    text(ctx, value, px + 352, y, { size: 19, color: COLORS.textMain, align: 'right' });
  });
  if (game.newBest) {
    text(ctx, 'NEW BEST', VIEW.width / 2, 528, {
      size: 15, color: COLORS.gold, align: 'center', spacing: 4, glow: 10,
    });
  }
  const blink = Math.sin(game.time * 3.4) > -0.25;
  if (blink) {
    text(ctx, 'PRESS R OR ENTER TO FLY AGAIN', VIEW.width / 2, 580, {
      size: 17, color: COLORS.gold, align: 'center', spacing: 3, glow: 10,
    });
  }
}
