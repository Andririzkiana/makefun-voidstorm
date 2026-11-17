// Vector art for every craft in VOIDSTORM. Each function draws one ship
// centered on the origin, enemies facing down the screen, the player
// facing up. Shapes are layered fills with neon strokes; a soft shadow
// glow is used on the hero shapes only, to keep the frame cheap.

import { COLORS } from './config.js';

function glow(ctx, color, blur) {
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
}

function noGlow(ctx) {
  ctx.shadowBlur = 0;
}

export function drawPlayerShip(ctx, time, thrust) {
  const flicker = 0.8 + Math.sin(time * 41) * 0.2 + thrust * 0.4;
  // Engine flame.
  ctx.save();
  glow(ctx, COLORS.playerFlame, 16);
  ctx.fillStyle = COLORS.playerFlame;
  ctx.beginPath();
  ctx.moveTo(-6, 18);
  ctx.lineTo(0, 18 + 16 * flicker + thrust * 12);
  ctx.lineTo(6, 18);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#fff3c4';
  ctx.beginPath();
  ctx.moveTo(-3, 18);
  ctx.lineTo(0, 18 + 8 * flicker + thrust * 5);
  ctx.lineTo(3, 18);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Wings.
  ctx.save();
  glow(ctx, COLORS.player, 14);
  ctx.fillStyle = '#0e3a4d';
  ctx.strokeStyle = COLORS.player;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -24);
  ctx.lineTo(9, -4);
  ctx.lineTo(26, 14);
  ctx.lineTo(24, 19);
  ctx.lineTo(8, 13);
  ctx.lineTo(-8, 13);
  ctx.lineTo(-24, 19);
  ctx.lineTo(-26, 14);
  ctx.lineTo(-9, -4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Hull spine.
  ctx.fillStyle = '#155e75';
  ctx.beginPath();
  ctx.moveTo(0, -24);
  ctx.lineTo(6, 2);
  ctx.lineTo(3, 15);
  ctx.lineTo(-3, 15);
  ctx.lineTo(-6, 2);
  ctx.closePath();
  ctx.fill();
  // Wing lights.
  ctx.fillStyle = COLORS.player;
  ctx.fillRect(-24, 12, 4, 3);
  ctx.fillRect(20, 12, 4, 3);
  // Cockpit.
  ctx.fillStyle = COLORS.playerCore;
  ctx.beginPath();
  ctx.ellipse(0, -6, 3.4, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawDarter(ctx, time) {
  ctx.save();
  glow(ctx, COLORS.darter, 12);
  ctx.fillStyle = '#4d0f3d';
  ctx.strokeStyle = COLORS.darter;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 20);
  ctx.lineTo(13, -8);
  ctx.lineTo(5, -14);
  ctx.lineTo(0, -6);
  ctx.lineTo(-5, -14);
  ctx.lineTo(-13, -8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = COLORS.darter;
  ctx.beginPath();
  ctx.arc(0, 2, 3.6 + Math.sin(time * 9) * 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawWeaver(ctx, time) {
  ctx.save();
  glow(ctx, COLORS.weaver, 12);
  ctx.fillStyle = '#4d3208';
  ctx.strokeStyle = COLORS.weaver;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 16);
  ctx.lineTo(20, 2);
  ctx.lineTo(12, -12);
  ctx.lineTo(0, -6);
  ctx.lineTo(-12, -12);
  ctx.lineTo(-20, 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = COLORS.weaver;
  ctx.beginPath();
  ctx.moveTo(-12, -2);
  ctx.lineTo(0, 6);
  ctx.lineTo(12, -2);
  ctx.stroke();
  ctx.fillStyle = '#fff3c4';
  ctx.beginPath();
  ctx.arc(0, 0, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawLancer(ctx, time) {
  ctx.save();
  glow(ctx, COLORS.lancer, 12);
  // Needle hull, drawn facing down its line of travel.
  ctx.fillStyle = '#2c4d08';
  ctx.strokeStyle = COLORS.lancer;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 26);
  ctx.lineTo(6, 2);
  ctx.lineTo(17, -12);
  ctx.lineTo(15, -18);
  ctx.lineTo(4, -12);
  ctx.lineTo(-4, -12);
  ctx.lineTo(-15, -18);
  ctx.lineTo(-17, -12);
  ctx.lineTo(-6, 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Spine charge light: brightens as the dive builds.
  const charge = 0.55 + Math.sin(time * 10) * 0.45;
  ctx.fillStyle = `rgba(230,255,190,${charge})`;
  ctx.beginPath();
  ctx.ellipse(0, 4, 2.6, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.lancer;
  ctx.beginPath();
  ctx.arc(0, 18, 2.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawGunner(ctx, time) {
  ctx.save();
  glow(ctx, COLORS.gunner, 13);
  ctx.fillStyle = '#2c1650';
  ctx.strokeStyle = COLORS.gunner;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2 + Math.PI / 6;
    const x = Math.cos(angle) * 19;
    const y = Math.sin(angle) * 19;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Twin barrels.
  ctx.fillStyle = COLORS.gunner;
  ctx.fillRect(-9, 14, 4, 11);
  ctx.fillRect(5, 14, 4, 11);
  // Eye.
  const pulse = 0.7 + Math.sin(time * 6) * 0.3;
  ctx.fillStyle = `rgba(255,84,104,${pulse})`;
  ctx.beginPath();
  ctx.arc(0, 0, 5.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffe9ec';
  ctx.beginPath();
  ctx.arc(0, 0, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawCarrier(ctx, time) {
  ctx.save();
  glow(ctx, COLORS.carrier, 14);
  ctx.fillStyle = '#0d3a28';
  ctx.strokeStyle = COLORS.carrier;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(-16, -30);
  ctx.lineTo(16, -30);
  ctx.lineTo(30, -6);
  ctx.lineTo(34, 22);
  ctx.lineTo(14, 32);
  ctx.lineTo(-14, 32);
  ctx.lineTo(-34, 22);
  ctx.lineTo(-30, -6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Cargo pods.
  ctx.fillStyle = '#14532d';
  for (const px of [-17, 0, 17]) {
    ctx.fillRect(px - 6, -18, 12, 26);
    ctx.strokeRect(px - 6, -18, 12, 26);
  }
  // Blinking bay lights.
  const on = Math.sin(time * 4) > 0;
  ctx.fillStyle = on ? '#baffd9' : '#2f7a52';
  for (const px of [-17, 0, 17]) {
    ctx.beginPath();
    ctx.arc(px, 16, 2.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function drawMite(ctx, time) {
  ctx.save();
  glow(ctx, COLORS.mite, 9);
  ctx.fillStyle = '#4d1016';
  ctx.strokeStyle = COLORS.mite;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(0, 10);
  ctx.lineTo(8, -4);
  ctx.lineTo(0, -9);
  ctx.lineTo(-8, -4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = COLORS.mite;
  ctx.beginPath();
  ctx.arc(0, 0, 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawTurret(ctx, time, angle) {
  ctx.save();
  ctx.fillStyle = '#3a2c10';
  ctx.strokeStyle = COLORS.bossTurret;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.rotate(angle);
  ctx.fillStyle = COLORS.bossTurret;
  ctx.fillRect(-3, 8, 6, 16);
  ctx.restore();
  ctx.save();
  glow(ctx, COLORS.bossTurret, 10);
  ctx.fillStyle = '#fff3c4';
  ctx.beginPath();
  ctx.arc(0, 0, 4.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawBoss(ctx, boss, time) {
  ctx.save();
  // Struts joining the pods to the hull.
  ctx.fillStyle = '#232c3f';
  ctx.strokeStyle = COLORS.bossHull;
  ctx.lineWidth = 2;
  for (const side of [-1, 1]) {
    ctx.fillRect(side * 70 - (side < 0 ? 48 : 0), -6, 48, 16);
    ctx.strokeRect(side * 70 - (side < 0 ? 48 : 0), -6, 48, 16);
  }
  // Side pods.
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(side * 102, 6);
    ctx.fillStyle = '#232c3f';
    ctx.strokeStyle = COLORS.bossHull;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(0, -34);
    ctx.lineTo(26, -8);
    ctx.lineTo(20, 30);
    ctx.lineTo(-14, 30);
    ctx.lineTo(-24, -6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,56,96,0.75)';
    ctx.beginPath();
    ctx.arc(0, 2, 6 + Math.sin(time * 5 + side) * 1.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // Main hull.
  glow(ctx, COLORS.bossCore, 18);
  ctx.fillStyle = '#1b2436';
  ctx.strokeStyle = COLORS.bossHull;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, -64);
  ctx.lineTo(52, -30);
  ctx.lineTo(84, 8);
  ctx.lineTo(64, 52);
  ctx.lineTo(24, 66);
  ctx.lineTo(-24, 66);
  ctx.lineTo(-64, 52);
  ctx.lineTo(-84, 8);
  ctx.lineTo(-52, -30);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  noGlow(ctx);
  // Armor seams.
  ctx.strokeStyle = 'rgba(141,155,181,0.5)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-52, -28);
  ctx.lineTo(52, -28);
  ctx.moveTo(-70, 14);
  ctx.lineTo(70, 14);
  ctx.moveTo(-30, 52);
  ctx.lineTo(30, 52);
  ctx.stroke();
  // Damage smoke vents glow as the hull weakens.
  const hurt = 1 - boss.hp / boss.maxHp;
  if (hurt > 0.35) {
    ctx.fillStyle = `rgba(255,140,60,${0.35 + hurt * 0.4})`;
    for (const [vx, vy] of [[-38, -12], [30, 30], [8, -44]]) {
      ctx.beginPath();
      ctx.arc(vx, vy, 4 + hurt * 4 + Math.sin(time * 11 + vx) * 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // The core: a pulsing reactor eye.
  const pulse = 1 + Math.sin(time * 3.4) * 0.12;
  glow(ctx, COLORS.bossCore, 26);
  const coreGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, 24 * pulse);
  coreGrad.addColorStop(0, '#ffffff');
  coreGrad.addColorStop(0.35, '#ff7a9c');
  coreGrad.addColorStop(1, 'rgba(255,56,96,0.05)');
  ctx.fillStyle = coreGrad;
  ctx.beginPath();
  ctx.arc(0, 0, 24 * pulse, 0, Math.PI * 2);
  ctx.fill();
  noGlow(ctx);
  ctx.strokeStyle = COLORS.bossCore;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.arc(0, 0, 27 * pulse, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Turrets ride on top of the hull.
  for (const turret of boss.turrets) {
    if (!turret.alive) continue;
    ctx.save();
    ctx.translate(turret.dx, turret.dy);
    drawTurret(ctx, time, turret.angle);
    ctx.restore();
  }
}

export function drawPickup(ctx, kind, time) {
  const bob = Math.sin(time * 3.2) * 2;
  ctx.save();
  ctx.translate(0, bob);
  const styles = {
    weapon: { color: COLORS.weaponPickup, glyph: 'W' },
    shield: { color: COLORS.shield, glyph: 'S' },
    life: { color: COLORS.lifePickup, glyph: '+' },
    bomb: { color: COLORS.bombPickup, glyph: 'B' },
  };
  const style = styles[kind] ?? styles.weapon;
  glow(ctx, style.color, 14);
  ctx.strokeStyle = style.color;
  ctx.lineWidth = 2;
  ctx.fillStyle = 'rgba(6,12,28,0.85)';
  ctx.beginPath();
  ctx.arc(0, 0, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = style.color;
  ctx.font = '700 14px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(style.glyph, 0, 1);
  ctx.restore();
}
