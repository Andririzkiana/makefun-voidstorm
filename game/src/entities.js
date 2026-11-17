// Enemy factories and their flight/firing behaviour. An entity is a
// plain object; updateEnemy advances one entity inside the world the
// game passes in (it may add bullets to world.enemyBullets and queue
// fresh spawns on world.spawnQueue). Hit points and fire rates scale
// with world.diff, which the wave director raises as waves progress.

import { VIEW, COLORS, SCORES } from './config.js';

function base(kind, x, y, r, hp, score) {
  return {
    kind, x, y, r, hp, maxHp: hp, score,
    vx: 0, vy: 0, t: 0, phase: 0, fireT: 1, dead: false, flash: 0,
  };
}

export function makeDarter(rng, x, diff) {
  const e = base('darter', x, -30, 15, Math.round(1 * diff.hpMul), SCORES.darter);
  e.vy = rng.range(150, 195) * (1 + diff.speedMul * 0.4);
  e.baseX = x;
  e.phase = rng.range(0, Math.PI * 2);
  return e;
}

export function makeWeaver(rng, x, diff) {
  const e = base('weaver', x, -30, 16, Math.round(2 * diff.hpMul), SCORES.weaver);
  e.vy = rng.range(105, 135);
  e.phase = rng.range(0, Math.PI * 2);
  return e;
}

// The Lancer is a dive-bomber: it settles at a staging altitude, tracks
// the player while its charge builds (the game draws the telegraph line
// from its aimAngle), then commits to one fast dive along that line.
export function makeLancer(rng, x, diff) {
  const e = base('lancer', x, -36, 14, Math.round(3 * diff.hpMul), SCORES.lancer);
  e.vy = 165;
  e.hoverY = rng.range(150, 285);
  e.phase = rng.range(0, Math.PI * 2);
  e.mode = 'enter';
  e.aimT = 0.85;
  e.angle = Math.PI / 2;
  e.aimAngle = Math.PI / 2;
  return e;
}

export function makeGunner(rng, x, diff) {
  const e = base('gunner', x, -34, 20, Math.round(4 * diff.hpMul), SCORES.gunner);
  e.vy = 120;
  e.hoverY = rng.range(130, 250);
  e.phase = rng.range(0, Math.PI * 2);
  e.fireT = rng.range(0.8, 1.8);
  return e;
}

export function makeCarrier(rng, x, diff) {
  const e = base('carrier', x, -52, 36, Math.round(14 * diff.hpMul), SCORES.carrier);
  e.vy = 52;
  e.phase = rng.range(0, Math.PI * 2);
  e.spawnT = 2.2;
  return e;
}

export function makeMite(rng, x, y, diff) {
  const e = base('mite', x, y, 10, 1, SCORES.mite);
  e.vy = rng.range(180, 230);
  e.phase = rng.range(0, Math.PI * 2);
  return e;
}

export function makeBoss(diff) {
  const boss = base('boss', VIEW.width / 2, -110, 80, Math.round(260 * diff.hpMul), SCORES.boss);
  boss.enterY = 138;
  boss.phase = 1;
  boss.radialT = 2.6;
  boss.spreadT = 1.8;
  boss.spiralT = 0;
  boss.spawnT = 5;
  boss.turrets = [
    { dx: -62, dy: 30, r: 16, hp: Math.round(26 * diff.hpMul), maxHp: Math.round(26 * diff.hpMul), alive: true, fireT: 1.2, angle: Math.PI / 2 },
    { dx: 62, dy: 30, r: 16, hp: Math.round(26 * diff.hpMul), maxHp: Math.round(26 * diff.hpMul), alive: true, fireT: 1.9, angle: Math.PI / 2 },
  ];
  return boss;
}

function aimAngle(fromX, fromY, toX, toY) {
  return Math.atan2(toY - fromY, toX - fromX);
}

function pushBullet(world, x, y, angle, speed) {
  world.enemyBullets.push({
    x, y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    r: 5, dead: false,
  });
}

export function updateEnemy(world, e, dt) {
  e.t += dt;
  if (e.flash > 0) e.flash -= dt;
  const player = world.player;
  switch (e.kind) {
    case 'darter': {
      e.y += e.vy * dt;
      e.x = e.baseX + Math.sin(e.t * 3.1 + e.phase) * 48;
      break;
    }
    case 'weaver': {
      e.y += e.vy * dt;
      e.x += Math.sin(e.t * 5.6 + e.phase) * 265 * dt;
      break;
    }
    case 'lancer': {
      if (e.mode === 'enter') {
        e.y += e.vy * dt;
        e.x += Math.sin(e.t * 2.2 + e.phase) * 26 * dt;
        if (e.y >= e.hoverY) {
          e.mode = 'aim';
          e.aimT = 0.85;
        }
      } else if (e.mode === 'aim') {
        e.y = e.hoverY + Math.sin(e.t * 2.6 + e.phase) * 7;
        if (player.alive) {
          // Shadow the player's column while the charge builds, and keep
          // the telegraph inside a downward cone so the dive stays fair.
          const drift = Math.max(-64 * dt, Math.min(64 * dt, player.x - e.x));
          e.x += drift;
          const raw = aimAngle(e.x, e.y, player.x, player.y);
          e.aimAngle = Math.max(Math.PI / 2 - 1.02, Math.min(Math.PI / 2 + 1.02, raw));
        }
        e.aimT -= dt;
        if (e.aimT <= 0) {
          e.mode = 'dive';
          e.angle = e.aimAngle;
          world.sound?.dive();
        }
      } else {
        // The dive: committed to its line, with only a whisper of homing.
        if (player.alive) {
          const want = aimAngle(e.x, e.y, player.x, player.y);
          let delta = want - e.angle;
          while (delta > Math.PI) delta -= Math.PI * 2;
          while (delta < -Math.PI) delta += Math.PI * 2;
          e.angle += Math.max(-0.38 * dt, Math.min(0.38 * dt, delta));
        }
        const speed = 645;
        e.x += Math.cos(e.angle) * speed * dt;
        e.y += Math.sin(e.angle) * speed * dt;
      }
      break;
    }
    case 'gunner': {
      if (e.y < e.hoverY) {
        e.y += e.vy * dt;
      } else {
        e.x += Math.sin(e.t * 0.9 + e.phase) * 62 * dt;
        e.y = e.hoverY + Math.sin(e.t * 1.7 + e.phase) * 12;
        e.fireT -= dt * world.diff.fireMul;
        if (e.fireT <= 0 && player.alive) {
          e.fireT = 2.3;
          const aim = aimAngle(e.x, e.y + 16, player.x, player.y);
          for (const off of [-0.13, 0, 0.13]) pushBullet(world, e.x, e.y + 18, aim + off, 265);
          world.sound?.enemyShoot();
        }
      }
      break;
    }
    case 'carrier': {
      e.y += e.vy * dt;
      e.x += Math.sin(e.t * 0.7 + e.phase) * 20 * dt;
      e.spawnT -= dt;
      if (e.spawnT <= 0 && e.y > 0 && e.y < VIEW.height * 0.55) {
        e.spawnT = 3.4;
        const mites = world.enemies.filter((o) => o.kind === 'mite').length;
        if (mites < 6) {
          world.spawnQueue.push(makeMite(world.rng, e.x - 14, e.y + 30, world.diff));
          world.spawnQueue.push(makeMite(world.rng, e.x + 14, e.y + 30, world.diff));
        }
      }
      break;
    }
    case 'mite': {
      e.y += e.vy * dt;
      if (player.alive) {
        const steer = Math.sign(player.x - e.x) * 130;
        e.x += steer * dt + Math.sin(e.t * 7 + e.phase) * 30 * dt;
      }
      break;
    }
    case 'boss': {
      updateBoss(world, e, dt);
      break;
    }
  }
  if (e.kind !== 'boss' && (e.y > VIEW.height + 70 || e.x < -80 || e.x > VIEW.width + 80)) {
    e.dead = true;
    e.escaped = true;
  }
}

function updateBoss(world, boss, dt) {
  const player = world.player;
  if (boss.y < boss.enterY) {
    boss.y += 62 * dt;
    return;
  }

  // Phase breaks at two-thirds and one-third hull. Crossing into a new
  // phase detonates a shockwave that sweeps the sky clear of bullets —
  // a breath of mercy inside the spectacle — and the Dreadnought fights
  // harder on the far side of each break.
  const frac = boss.hp / boss.maxHp;
  const phase = frac > 2 / 3 ? 1 : frac > 1 / 3 ? 2 : 3;
  if (phase > boss.phase) {
    boss.phase = phase;
    world.enemyBullets.length = 0;
    world.particles?.explosion(boss.x, boss.y, COLORS.bossCore, 2.4, world.rng);
    world.shakeIt?.(9);
    world.sound?.phaseShift();
  }

  const driftSpeed = boss.phase === 3 ? 0.62 : 0.45;
  const driftAmp = boss.phase === 3 ? 185 : 150;
  boss.x = VIEW.width / 2 + Math.sin(boss.t * driftSpeed) * driftAmp;
  boss.y = boss.enterY + Math.sin(boss.t * 0.8) * 16;

  for (const turret of boss.turrets) {
    if (!turret.alive) continue;
    const wx = boss.x + turret.dx;
    const wy = boss.y + turret.dy;
    turret.angle = aimAngle(wx, wy, player.x, player.y) - Math.PI / 2;
    turret.fireT -= dt * world.diff.fireMul;
    if (turret.fireT <= 0 && player.alive) {
      turret.fireT = boss.phase === 3 ? 1.35 : 1.7;
      pushBullet(world, wx, wy + 10, aimAngle(wx, wy, player.x, player.y), 300);
      world.sound?.enemyShoot();
    }
  }

  boss.radialT -= dt;
  if (boss.radialT <= 0) {
    boss.radialT = boss.phase === 3 ? 2.9 : 3.6;
    const count = boss.phase === 3 ? 20 : boss.phase === 2 ? 16 : 13;
    const baseAngle = boss.t * 0.7;
    for (let i = 0; i < count; i++) {
      pushBullet(world, boss.x, boss.y + 6, baseAngle + (i / count) * Math.PI * 2, 168);
    }
    world.sound?.enemyShoot();
  }

  // Phase 2 and beyond: a twin spiral barrage pours from the side pods,
  // two rotating arms the player has to thread rather than dodge once.
  if (boss.phase >= 2) {
    boss.spiralT -= dt;
    if (boss.spiralT <= 0) {
      boss.spiralT = boss.phase === 3 ? 0.07 : 0.088;
      const arm = boss.t * 2.4 + boss.phase * 1.3;
      pushBullet(world, boss.x - 102, boss.y + 8, arm, 152);
      pushBullet(world, boss.x + 102, boss.y + 8, arm + Math.PI, 152);
    }
  }

  if (boss.phase >= 2) {
    boss.spreadT -= dt;
    if (boss.spreadT <= 0 && player.alive) {
      boss.spreadT = 2.5;
      const aim = aimAngle(boss.x, boss.y + 40, player.x, player.y);
      for (const off of [-0.24, -0.12, 0, 0.12, 0.24]) {
        pushBullet(world, boss.x, boss.y + 44, aim + off, 295);
      }
      world.sound?.enemyShoot();
    }
  }

  boss.spawnT -= dt;
  if (boss.spawnT <= 0) {
    boss.spawnT = boss.phase === 3 ? 5.5 : 6.5;
    world.spawnQueue.push(makeMite(world.rng, boss.x - 90, boss.y + 40, world.diff));
    world.spawnQueue.push(makeMite(world.rng, boss.x + 90, boss.y + 40, world.diff));
  }
}

export function makePickup(rng, x, y, kind) {
  return { kind, x, y, r: 14, t: rng.range(0, 4), dead: false };
}

export const PICKUP_KINDS = ['weapon', 'weapon', 'shield', 'bomb', 'life'];
