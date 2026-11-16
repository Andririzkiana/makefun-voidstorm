// The deep-space backdrop: a vertical void gradient, two slow nebula
// clouds (pre-rendered once to an offscreen canvas so the per-frame cost
// is a pair of drawImage calls), a ringed planet parked in the corner,
// and three layers of parallax stars that stream past as the ship flies.

import { VIEW, COLORS } from './config.js';

const STAR_LAYERS = [
  { count: 90, speed: 14, size: 1, alpha: 0.5 },
  { count: 60, speed: 38, size: 1.6, alpha: 0.75 },
  { count: 30, speed: 85, size: 2.4, alpha: 1 },
];

function makeNebula(rng, colorA, colorB) {
  const size = 560;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  for (let i = 0; i < 26; i++) {
    const x = size / 2 + rng.range(-150, 150);
    const y = size / 2 + rng.range(-150, 150);
    const r = rng.range(60, 190);
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    const color = rng.chance(0.5) ? colorA : colorB;
    grad.addColorStop(0, color);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }
  return canvas;
}

export class Starfield {
  constructor(rng) {
    this.time = 0;
    this.stars = [];
    for (const layer of STAR_LAYERS) {
      for (let i = 0; i < layer.count; i++) {
        this.stars.push({
          x: rng.range(0, VIEW.width),
          y: rng.range(0, VIEW.height),
          speed: layer.speed * rng.range(0.8, 1.2),
          size: layer.size * rng.range(0.7, 1.3),
          alpha: layer.alpha,
          twinkle: rng.range(0, Math.PI * 2),
          hue: rng.pick(['#ffffff', '#bfe9ff', '#ffe9bf', '#ffc7f1']),
        });
      }
    }
    this.nebulaA = makeNebula(rng, 'rgba(64,40,160,0.20)', 'rgba(24,90,180,0.16)');
    this.nebulaB = makeNebula(rng, 'rgba(160,30,120,0.15)', 'rgba(20,140,160,0.14)');
    this.boost = 1;
  }

  update(dt) {
    this.time += dt;
    for (const star of this.stars) {
      star.y += star.speed * this.boost * dt;
      star.twinkle += dt * 2.4;
      if (star.y > VIEW.height + 4) {
        star.y = -4;
        star.x = Math.random() * VIEW.width;
      }
    }
  }

  draw(ctx) {
    const grad = ctx.createLinearGradient(0, 0, 0, VIEW.height);
    grad.addColorStop(0, COLORS.voidTop);
    grad.addColorStop(1, COLORS.voidBottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const driftA = Math.sin(this.time * 0.05) * 30;
    const driftB = Math.cos(this.time * 0.04) * 36;
    ctx.drawImage(this.nebulaA, -120 + driftA, -140 + Math.sin(this.time * 0.03) * 18);
    ctx.drawImage(this.nebulaB, VIEW.width - 460 + driftB, VIEW.height - 430);
    ctx.restore();

    this.drawPlanet(ctx);

    for (const star of this.stars) {
      const flicker = 0.72 + 0.28 * Math.sin(star.twinkle);
      ctx.globalAlpha = star.alpha * flicker;
      ctx.fillStyle = star.hue;
      ctx.fillRect(star.x, star.y, star.size, star.size * (1 + this.boost * 0.6));
    }
    ctx.globalAlpha = 1;
  }

  drawPlanet(ctx) {
    const cx = VIEW.width - 178;
    const cy = 138;
    const r = 74;
    ctx.save();
    const body = ctx.createRadialGradient(cx - 26, cy - 30, 8, cx, cy, r);
    body.addColorStop(0, '#3d5a8f');
    body.addColorStop(0.55, '#1d2c55');
    body.addColorStop(1, '#0a1128');
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(120,190,255,0.35)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Bands of cloud.
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r - 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = 'rgba(140,190,255,0.10)';
    for (const [dy, h] of [[-30, 9], [-6, 6], [20, 11], [44, 5]]) {
      ctx.fillRect(cx - r, cy + dy, r * 2, h);
    }
    ctx.restore();
    // The ring, tilted.
    ctx.translate(cx, cy);
    ctx.rotate(-0.32);
    ctx.scale(1, 0.30);
    ctx.strokeStyle = 'rgba(150,210,255,0.40)';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(0, 0, r + 26, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,180,230,0.20)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, r + 38, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}
