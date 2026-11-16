// The particle system: explosion sparks, glowing embers, shockwave
// rings, ship engine trails and floating score text. Everything is drawn
// additively so overlapping effects bloom into bright cores. Pools are
// plain arrays with swap-remove; counts stay bounded by design.

const MAX_PARTICLES = 900;

export class Particles {
  constructor() {
    this.sparks = [];
    this.embers = [];
    this.rings = [];
    this.texts = [];
  }

  clear() {
    this.sparks.length = 0;
    this.embers.length = 0;
    this.rings.length = 0;
    this.texts.length = 0;
  }

  explosion(x, y, color, scale = 1, rng) {
    const sparkCount = Math.floor(22 * scale);
    for (let i = 0; i < sparkCount && this.sparks.length < MAX_PARTICLES; i++) {
      const angle = rng.range(0, Math.PI * 2);
      const speed = rng.range(60, 420) * (0.6 + scale * 0.5);
      this.sparks.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: rng.range(0.3, 0.8),
        age: 0,
        color,
        width: rng.range(1.4, 3),
      });
    }
    const emberCount = Math.floor(10 * scale);
    for (let i = 0; i < emberCount && this.embers.length < MAX_PARTICLES; i++) {
      const angle = rng.range(0, Math.PI * 2);
      const speed = rng.range(20, 130);
      this.embers.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: rng.range(0.5, 1.3),
        age: 0,
        color,
        r: rng.range(2, 5.5) * (0.7 + scale * 0.4),
      });
    }
    this.rings.push({ x, y, r: 6, vr: 340 * (0.7 + scale * 0.5), life: 0.38, age: 0, color });
  }

  trail(x, y, color, rng) {
    if (this.embers.length >= MAX_PARTICLES) return;
    this.embers.push({
      x: x + rng.range(-3, 3),
      y,
      vx: rng.range(-12, 12),
      vy: rng.range(90, 150),
      life: rng.range(0.22, 0.4),
      age: 0,
      color,
      r: rng.range(1.6, 3.4),
    });
  }

  muzzle(x, y, color) {
    this.rings.push({ x, y, r: 3, vr: 130, life: 0.14, age: 0, color });
  }

  scoreText(x, y, text, color = '#eaf6ff', size = 17) {
    this.texts.push({ x, y, text, color, size, life: 0.95, age: 0 });
  }

  update(dt) {
    updateList(this.sparks, dt, (p) => {
      p.vx *= 0.92;
      p.vy = p.vy * 0.92 + 130 * dt;
    });
    updateList(this.embers, dt, (p) => {
      p.vx *= 0.96;
      p.vy *= 0.96;
    });
    updateList(this.rings, dt, (p) => {
      p.r += p.vr * dt;
      p.vr *= 0.9;
    });
    updateList(this.texts, dt, (p) => {
      p.y -= 44 * dt;
    });
  }

  draw(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const ring of this.rings) {
      const k = 1 - ring.age / ring.life;
      ctx.globalAlpha = k * 0.8;
      ctx.strokeStyle = ring.color;
      ctx.lineWidth = 2.5 * k + 0.5;
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, ring.r, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (const ember of this.embers) {
      const k = 1 - ember.age / ember.life;
      ctx.globalAlpha = k * 0.85;
      ctx.fillStyle = ember.color;
      ctx.beginPath();
      ctx.arc(ember.x, ember.y, ember.r * k + 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.lineCap = 'round';
    for (const spark of this.sparks) {
      const k = 1 - spark.age / spark.life;
      ctx.globalAlpha = k;
      ctx.strokeStyle = spark.color;
      ctx.lineWidth = spark.width * k;
      ctx.beginPath();
      ctx.moveTo(spark.x, spark.y);
      ctx.lineTo(spark.x - spark.vx * 0.03, spark.y - spark.vy * 0.03);
      ctx.stroke();
    }
    ctx.restore();

    for (const item of this.texts) {
      const k = 1 - item.age / item.life;
      ctx.save();
      ctx.globalAlpha = Math.min(1, k * 1.6);
      ctx.font = `700 ${item.size}px "Segoe UI", system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = item.color;
      ctx.shadowColor = item.color;
      ctx.shadowBlur = 8;
      ctx.fillText(item.text, item.x, item.y);
      ctx.restore();
    }
  }
}

function updateList(list, dt, step) {
  for (let i = list.length - 1; i >= 0; i--) {
    const item = list[i];
    item.age += dt;
    if (item.age >= item.life) {
      list[i] = list[list.length - 1];
      list.pop();
      continue;
    }
    step(item);
    item.x += item.vx !== undefined ? item.vx * dt : 0;
    item.y += item.vy !== undefined ? item.vy * dt : 0;
  }
}
