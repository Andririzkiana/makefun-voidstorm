// The game itself: state machine, fixed-step simulation, collisions,
// scoring and rendering order. VOIDSTORM is a wave shooter — steer the
// last interceptor of the home fleet through a counted campaign of
// twelve waves across four sectors (campaign.js), and bring down the
// Dreadnought that waits at the end of it. A run's shape — CAMPAIGN or
// ENDLESS, CADET / PILOT / ACE — is chosen on the title screen
// (modes.js).
//
// States: title -> playing <-> paused -> over / won -> (restart) playing.
// The simulation always advances in fixed 1/60 steps so play feels the
// same on every display, and so the demo scenes used for screenshots
// (see setupShot) replay identically every time.

import { VIEW, COLORS, TUNING, WEAPONS, SCORES } from './config.js';
import { Rng } from './rng.js';
import { Starfield } from './starfield.js';
import { Particles } from './particles.js';
import { WaveDirector } from './waves.js';
import { TOTAL_WAVES, wavePlan } from './campaign.js';
import { DIFFICULTIES, ModeSelect } from './modes.js';
import { makePickup, makeCarrier, makeGunner, makeDarter, makeWeaver, makeLancer, makeMite, PICKUP_KINDS } from './entities.js';
import { updateEnemy } from './entities.js';
import * as art from './ships.js';
import { drawHUD, drawBossBar, drawWaveBanner, drawTitle, drawPaused, drawGameOver, drawVictory } from './hud.js';

const STEP = 1 / 60;
const ENEMY_ART = {
  darter: art.drawDarter,
  weaver: art.drawWeaver,
  lancer: art.drawLancer,
  gunner: art.drawGunner,
  carrier: art.drawCarrier,
  mite: art.drawMite,
};

export class Game {
  constructor({ input, sound, seed, shot = null }) {
    this.input = input;
    this.sound = sound;
    this.rng = new Rng(seed);
    this.starfield = new Starfield(this.rng);
    this.particles = new Particles();
    this.director = new WaveDirector(this.rng);
    this.time = 0;
    this.state = 'title';
    this.stateT = 0;
    this.best = loadBest();
    this.newBest = false;
    this.muted = false;
    this.shotMode = shot;
    this.modeSelect = new ModeSelect();
    this.resetRun();
    if (shot) this.setupShot(shot);
  }

  resetRun() {
    this.score = 0;
    this.kills = 0;
    this.lives = TUNING.startLives;
    this.bombs = TUNING.startBombs;
    this.wave = 0;
    this.weaponLevel = 0;
    this.multiplier = 1;
    this.combo = 0;
    this.comboT = 0;
    this.comboWindow = TUNING.comboWindow;
    this.shake = 0;
    this.flash = 0;
    this.waveBonusPaid = false;
    this.bannerT = 0;
    this.bannerDuration = TUNING.waveBannerTime;
    this.bannerKind = 'wave';
    this.runMode = 'campaign';
    this.runDifficulty = DIFFICULTIES[1];
    this.sectorIndex = 0;
    this.waveIsBoss = false;
    this.lullT = 0;
    this.enemies = [];
    this.playerBullets = [];
    this.enemyBullets = [];
    this.pickups = [];
    this.spawnQueue = [];
    this.boss = null;
    this.player = {
      x: VIEW.width / 2, y: VIEW.height - 130, r: TUNING.playerRadius,
      alive: true, respawnT: 0, invulnT: 0, shieldT: 0, fireT: 0, thrust: 0,
    };
    this.particles.clear();
  }

  startRun() {
    this.resetRun();
    this.runMode = this.modeSelect.mode;
    this.runDifficulty = this.modeSelect.difficulty;
    this.state = 'playing';
    this.stateT = 0;
    this.nextWave();
    this.sound.startMusic();
  }

  nextWave() {
    this.wave += 1;
    const plan = wavePlan(this.wave, this.runMode);
    this.sectorIndex = plan.sectorIndex;
    this.waveIsBoss = plan.isBoss;
    this.bannerKind = plan.isBoss ? 'boss' : plan.sectorStart ? 'sector' : 'wave';
    this.director.start(this.wave, plan, this.runDifficulty);
    this.bannerT = this.bannerDuration;
    this.waveBonusPaid = false;
    if (plan.isBoss) this.sound.bossAlarm();
  }

  // The campaign is won: bank the score, then offer the pilot the
  // Endless Void as an encore flown on the same run.
  winRun() {
    this.state = 'won';
    this.stateT = 0;
    this.sound.stopMusic();
    this.sound.waveClear();
    this.newBest = this.score > this.best;
    if (this.newBest) {
      this.best = this.score;
      saveBest(this.best);
    }
  }

  continueEndless() {
    this.runMode = 'endless';
    this.state = 'playing';
    this.stateT = 0;
    this.sound.startMusic();
    this.nextWave();
  }

  get diff() {
    return this.director.diff;
  }

  // ---- one fixed simulation step -------------------------------------

  step(dt) {
    this.time += dt;
    this.stateT += dt;
    this.input.time = this.time;
    this.starfield.boost = this.state === 'playing' ? 1.9 : 1;
    this.starfield.update(dt);
    this.particles.update(dt);
    if (this.flash > 0) this.flash -= dt * 2.4;
    if (this.shake > 0) this.shake = Math.max(0, this.shake - TUNING.shakeDecay * dt);

    if (this.input.wasPressed('KeyM')) {
      this.muted = !this.muted;
      this.sound.setMuted(this.muted);
    }

    if (this.state === 'title') {
      this.modeSelect.handleInput(this.input);
      if (this.input.anyConfirm() && !this.shotMode) {
        this.sound.unlock();
        this.startRun();
      }
    } else if (this.state === 'playing') {
      this.stepPlaying(dt);
    } else if (this.state === 'paused') {
      if (this.input.wasPressed('KeyP') || this.input.wasPressed('Escape')) {
        this.state = 'playing';
      }
    } else if (this.state === 'over') {
      if ((this.input.wasPressed('KeyR') || this.input.anyConfirm()) && !this.shotMode) {
        this.sound.unlock();
        this.startRun();
      }
    } else if (this.state === 'won') {
      if (!this.shotMode && this.input.wasPressed('KeyE')) {
        this.sound.unlock();
        this.continueEndless();
      } else if (!this.shotMode && (this.input.wasPressed('KeyR') || this.input.anyConfirm())) {
        this.sound.unlock();
        this.modeSelect.modeIndex = 0;
        this.startRun();
      }
    }
    this.input.endStep();
  }

  stepPlaying(dt) {
    if (this.input.wasPressed('KeyP') || this.input.wasPressed('Escape')) {
      this.state = 'paused';
      this.stateT = 0;
      return;
    }
    if (this.bannerT > 0) this.bannerT -= dt;

    // Spawn whatever the director has queued for this moment.
    for (const event of this.director.update(dt)) {
      const enemy = event.spawn(this.rng, this.director.diff);
      this.enemies.push(enemy);
      if (enemy.kind === 'boss') {
        this.boss = enemy;
      } else {
        this.particles.entryFlare(enemy.x, 10, enemyColor(enemy.kind), this.rng);
      }
    }
    if (this.spawnQueue.length) {
      this.enemies.push(...this.spawnQueue);
      this.spawnQueue.length = 0;
    }

    this.stepPlayer(dt);
    this.stepEnemies(dt);
    this.stepBullets(dt);
    this.stepPickups(dt);
    this.stepCombo(dt);

    // Wave cleared: a short lull, then the next wave rolls in — unless
    // this was the campaign's final wave, which ends the run in victory.
    if (this.director.drained && this.enemies.length === 0 && !this.boss) {
      if (!this.waveBonusPaid) {
        this.waveBonusPaid = true;
        const bonus = 25 * this.wave * this.runDifficulty.scoreMul;
        this.score += bonus;
        this.particles.scoreText(VIEW.width / 2, 300, `WAVE ${this.wave} CLEAR  +${bonus}`, COLORS.player, 21);
      }
      this.lullT += dt;
      if (this.lullT > TUNING.waveLullTime) {
        this.lullT = 0;
        if (this.runMode === 'campaign' && this.wave >= TOTAL_WAVES) {
          this.winRun();
        } else {
          this.sound.waveClear();
          this.nextWave();
        }
      }
    } else {
      this.lullT = 0;
    }
  }

  stepPlayer(dt) {
    const p = this.player;
    if (!p.alive) {
      p.respawnT -= dt;
      if (p.respawnT <= 0 && this.lives > 0) {
        p.alive = true;
        p.x = VIEW.width / 2;
        p.y = VIEW.height - 130;
        p.invulnT = TUNING.respawnInvulnerable;
      }
      return;
    }
    if (p.invulnT > 0) p.invulnT -= dt;
    if (p.shieldT > 0) p.shieldT -= dt;

    let tx = 0;
    let ty = 0;
    if (this.demoPilot) {
      const aim = this.demoPilot(dt);
      tx = aim.x;
      ty = aim.y;
    } else {
      const axis = this.input.moveAxis();
      tx = axis.x;
      ty = axis.y;
      if (this.input.mouseSteering(this.time)) {
        const dx = this.input.mouse.x - p.x;
        const dy = this.input.mouse.y - p.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 6) {
          const pull = Math.min(1, dist / 90);
          tx = (dx / dist) * pull * 1.6;
          ty = (dy / dist) * pull * 1.6;
        }
      }
    }
    const mag = Math.hypot(tx, ty);
    if (mag > 1) { tx /= mag; ty /= mag; }
    p.x += tx * TUNING.playerSpeed * dt;
    p.y += ty * TUNING.playerSpeed * dt;
    p.x = Math.max(30, Math.min(VIEW.width - 30, p.x));
    p.y = Math.max(120, Math.min(VIEW.height - 36, p.y));
    p.thrust = Math.min(1, Math.abs(ty) + (mag > 0.1 ? 0.45 : 0.15));

    // Engine trail.
    if (this.rng.chance(0.75)) {
      this.particles.trail(p.x, p.y + 20, COLORS.playerFlame, this.rng);
    }

    // Fire.
    p.fireT -= dt;
    const wantsFire = this.demoPilot ? true : this.input.firing();
    if (wantsFire && p.fireT <= 0) {
      const weapon = WEAPONS[this.weaponLevel];
      p.fireT = weapon.delay;
      this.fireWeapon(p, weapon);
    }

    // Bomb: wipes enemy bullets and damages everything on screen.
    if ((this.input.wasPressed('KeyX') || this.input.wasPressed('KeyB')) && this.bombs > 0 && !this.demoPilot) {
      this.detonateBomb();
    }
  }

  fireWeapon(p, weapon) {
    const mid = (weapon.streams - 1) / 2;
    for (let i = 0; i < weapon.streams; i++) {
      const off = i - mid;
      const angle = -Math.PI / 2 + off * weapon.spread;
      const ox = off * 9;
      this.playerBullets.push({
        x: p.x + ox, y: p.y - 20,
        vx: Math.cos(angle) * TUNING.bulletSpeed,
        vy: Math.sin(angle) * TUNING.bulletSpeed,
        r: TUNING.bulletRadius, dead: false,
      });
    }
    this.particles.muzzle(p.x, p.y - 26, COLORS.bullet);
    this.sound.shoot();
  }

  detonateBomb() {
    this.bombs -= 1;
    this.flash = 0.85;
    this.shake = Math.max(this.shake, 13);
    this.sound.bomb();
    for (const bullet of this.enemyBullets) bullet.dead = true;
    for (const enemy of this.enemies) {
      this.damageEnemy(enemy, enemy.kind === 'boss' ? 30 : 6, true);
    }
  }

  stepEnemies(dt) {
    const world = {
      rng: this.rng, player: this.player, enemies: this.enemies,
      enemyBullets: this.enemyBullets, spawnQueue: this.spawnQueue,
      diff: this.director.diff, sound: this.sound,
      particles: this.particles,
      shakeIt: (v) => { this.shake = Math.max(this.shake, v); },
    };
    for (const enemy of this.enemies) updateEnemy(world, enemy, dt);
    if (this.spawnQueue.length) {
      this.enemies.push(...this.spawnQueue);
      this.spawnQueue.length = 0;
    }
    // Player bullets vs enemies (and boss turrets).
    for (const bullet of this.playerBullets) {
      if (bullet.dead) continue;
      for (const enemy of this.enemies) {
        if (enemy.dead) continue;
        if (enemy.kind === 'boss') {
          let consumed = false;
          for (const turret of enemy.turrets) {
            if (!turret.alive) continue;
            const tx = enemy.x + turret.dx;
            const ty = enemy.y + turret.dy;
            if (circleHit(bullet, tx, ty, turret.r + 3)) {
              turret.hp -= 1;
              bullet.dead = true;
              consumed = true;
              this.particles.impact(bullet.x, bullet.y, COLORS.bossTurret, this.rng);
              this.sound.enemyHit();
              if (turret.hp <= 0) {
                turret.alive = false;
                this.onTurretDown(enemy, tx, ty);
              }
              break;
            }
          }
          if (consumed) continue;
        }
        if (circleHit(bullet, enemy.x, enemy.y, enemy.r)) {
          bullet.dead = true;
          this.damageEnemy(enemy, 1, false);
          if (!enemy.dead) {
            this.particles.impact(bullet.x, bullet.y, enemyColor(enemy.kind), this.rng);
          }
        }
      }
    }
    // Enemy contact with the player.
    const p = this.player;
    if (p.alive) {
      for (const enemy of this.enemies) {
        if (enemy.dead) continue;
        const rr = enemy.kind === 'boss' ? enemy.r * 0.8 : enemy.r;
        if (circleHit(p, enemy.x, enemy.y, rr)) {
          if (enemy.kind !== 'boss') this.damageEnemy(enemy, 99, true);
          this.hurtPlayer();
          break;
        }
      }
    }
    this.enemies = this.enemies.filter((e) => !e.dead);
    if (this.boss && this.boss.dead) this.boss = null;
  }

  stepBullets(dt) {
    for (const bullet of this.playerBullets) {
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      if (bullet.y < -20 || bullet.x < -20 || bullet.x > VIEW.width + 20) bullet.dead = true;
    }
    this.playerBullets = this.playerBullets.filter((b) => !b.dead);

    const p = this.player;
    for (const bullet of this.enemyBullets) {
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      if (bullet.y > VIEW.height + 20 || bullet.y < -30 || bullet.x < -20 || bullet.x > VIEW.width + 20) {
        bullet.dead = true;
        continue;
      }
      if (p.alive && circleHit(bullet, p.x, p.y, p.r - 3)) {
        bullet.dead = true;
        this.hurtPlayer();
      }
    }
    this.enemyBullets = this.enemyBullets.filter((b) => !b.dead);
  }

  stepPickups(dt) {
    const p = this.player;
    for (const pickup of this.pickups) {
      pickup.t += dt;
      pickup.y += TUNING.pickupFallSpeed * dt;
      if (pickup.y > VIEW.height + 24) pickup.dead = true;
      if (p.alive && circleHit(pickup, p.x, p.y, p.r + 12)) {
        pickup.dead = true;
        this.applyPickup(pickup.kind);
      }
    }
    this.pickups = this.pickups.filter((pk) => !pk.dead);
  }

  stepCombo(dt) {
    if (this.comboT > 0) {
      this.comboT -= dt;
      if (this.comboT <= 0) {
        this.combo = 0;
        this.multiplier = 1;
      }
    }
  }

  // ---- combat outcomes -------------------------------------------------

  damageEnemy(enemy, amount, silent) {
    if (enemy.dead) return;
    enemy.hp -= amount;
    enemy.flash = 0.09;
    if (!silent) this.sound.enemyHit();
    if (enemy.hp <= 0) {
      enemy.dead = true;
      this.onEnemyDown(enemy);
    }
  }

  onEnemyDown(enemy) {
    const scale = enemy.kind === 'boss' ? 3.2 : enemy.kind === 'carrier' ? 1.9 : 1;
    const color = enemy.kind === 'boss' ? COLORS.bossCore : enemyColor(enemy.kind);
    this.particles.explosion(enemy.x, enemy.y, color, scale, this.rng);
    this.shake = Math.max(this.shake, enemy.kind === 'boss' ? 16 : enemy.kind === 'carrier' ? 7 : 3.5);
    this.sound.explosion(enemy.kind === 'boss' || enemy.kind === 'carrier');

    this.combo += 1;
    this.comboT = this.comboWindow;
    const prevMultiplier = this.multiplier;
    this.multiplier = Math.min(TUNING.comboMax, 1 + Math.floor(this.combo / 4));
    if (this.multiplier > prevMultiplier) {
      this.particles.scoreText(this.player.x, this.player.y - 56, `COMBO x${this.multiplier}`, COLORS.gold, 23);
    }
    const gained = enemy.score * this.multiplier * this.runDifficulty.scoreMul;
    this.score += gained;
    this.kills += 1;
    this.particles.scoreText(enemy.x, enemy.y - 14, `+${gained}`, this.multiplier > 1 ? COLORS.gold : '#eaf6ff', this.multiplier > 2 ? 20 : 16);

    if (enemy.kind === 'boss') {
      this.flash = 0.7;
      this.dropPickup(enemy.x, enemy.y, 'weapon');
      this.dropPickup(enemy.x - 40, enemy.y + 10, 'shield');
      if (this.boss === enemy) this.boss = null;
    } else if (enemy.kind === 'carrier') {
      this.dropPickup(enemy.x, enemy.y, this.rng.pick(['weapon', 'bomb', 'shield']));
    } else if (this.rng.chance(TUNING.pickupChance)) {
      this.dropPickup(enemy.x, enemy.y, this.rng.pick(PICKUP_KINDS));
    }
  }

  onTurretDown(boss, x, y) {
    this.particles.explosion(x, y, COLORS.bossTurret, 1.3, this.rng);
    this.sound.explosion(false);
    this.shake = Math.max(this.shake, 5);
    const gained = SCORES.turret * this.multiplier * this.runDifficulty.scoreMul;
    this.score += gained;
    this.particles.scoreText(x, y - 12, `+${gained}`, COLORS.gold, 16);
  }

  dropPickup(x, y, kind) {
    if (kind === 'weapon' && this.weaponLevel >= WEAPONS.length - 1) kind = 'shield';
    if (kind === 'life' && this.lives >= 5) kind = 'weapon';
    this.pickups.push(makePickup(this.rng, x, y, kind));
  }

  applyPickup(kind) {
    const p = this.player;
    if (kind === 'weapon') {
      this.weaponLevel = Math.min(WEAPONS.length - 1, this.weaponLevel + 1);
      this.particles.scoreText(p.x, p.y - 34, WEAPONS[this.weaponLevel].name, COLORS.weaponPickup, 17);
      this.sound.powerup();
    } else if (kind === 'shield') {
      p.shieldT = 9;
      this.particles.scoreText(p.x, p.y - 34, 'SHIELD UP', COLORS.shield, 17);
      this.sound.shieldUp();
    } else if (kind === 'bomb') {
      this.bombs = Math.min(4, this.bombs + 1);
      this.particles.scoreText(p.x, p.y - 34, '+BOMB', COLORS.bombPickup, 17);
      this.sound.powerup();
    } else if (kind === 'life') {
      this.lives = Math.min(5, this.lives + 1);
      this.particles.scoreText(p.x, p.y - 34, '+HULL', COLORS.lifePickup, 17);
      this.sound.powerup();
    }
    this.score += 25;
  }

  hurtPlayer() {
    const p = this.player;
    if (!p.alive || p.invulnT > 0) return;
    if (p.shieldT > 0) {
      p.shieldT = 0;
      p.invulnT = 1.2;
      this.particles.explosion(p.x, p.y, COLORS.shield, 0.9, this.rng);
      this.sound.shieldUp();
      return;
    }
    p.alive = false;
    p.respawnT = 1.4;
    this.lives -= 1;
    this.weaponLevel = Math.max(0, this.weaponLevel - 1);
    this.combo = 0;
    this.multiplier = 1;
    this.comboT = 0;
    this.particles.explosion(p.x, p.y, COLORS.player, 2.2, this.rng);
    this.shake = Math.max(this.shake, 12);
    this.sound.playerDown();
    if (this.lives <= 0) {
      this.state = 'over';
      this.stateT = 0;
      this.sound.stopMusic();
      this.newBest = this.score > this.best;
      if (this.newBest) {
        this.best = this.score;
        saveBest(this.best);
      }
    }
  }

  // ---- demo scenes for screenshots -------------------------------------
  // A shot mode builds a deterministic mid-game scene and hands the ship
  // to a simple autopilot, so a headless browser can photograph real
  // gameplay. Normal play never touches this path.

  setupShot(name) {
    this.resetRun();
    this.state = 'playing';
    if (name === 'start') {
      this.state = 'title';
      return;
    }
    if (name === 'over') {
      this.score = 86420;
      this.wave = 7;
      this.sectorIndex = wavePlan(this.wave, this.runMode).sectorIndex;
      this.kills = 118;
      this.lives = 0;
      this.player.alive = false;
      this.newBest = true;
      this.best = Math.max(this.best, this.score);
      this.state = 'over';
      // A few drifting wrecks' worth of embers for mood.
      for (let i = 0; i < 26; i++) {
        this.particles.trail(this.rng.range(140, VIEW.width - 140), this.rng.range(80, 500), COLORS.darter, this.rng);
      }
      return;
    }
    const startWave = name === 'boss' ? TOTAL_WAVES : name === 'late' ? 10 : 3;
    this.wave = startWave - 1;
    this.nextWave();
    this.bannerT = 0;
    this.score = name === 'boss' ? 96400 : name === 'late' ? 58730 : 12780;
    this.kills = name === 'boss' ? 168 : name === 'late' ? 121 : 31;
    this.weaponLevel = name === 'boss' ? 3 : name === 'late' ? 4 : 2;
    this.lives = 3;
    this.bombs = 2;
    this.multiplier = 3;
    this.combo = 9;
    this.comboT = this.comboWindow;
    this.installDemoPilot();
    if (name === 'boss') {
      this.preSim(300);
      this.stageBossScene();
    } else if (name === 'late') {
      this.preSim(70);
      this.stageLateScene();
      this.preSim(45);
    } else {
      this.preSim(70);
      this.stageActionScene();
      this.preSim(45);
    }
  }

  // A dense late-campaign tableau for the fourth screenshot: sector 4,
  // wave 10 — the action cast plus a second carrier and a weaver stream,
  // so the frame proves how crowded the Dread Throne gets.
  stageLateScene() {
    this.stageActionScene();
    const diff = this.director.diff;
    const carrier = makeCarrier(this.rng, 880, diff);
    carrier.y = 120;
    carrier.t = 3;
    carrier.spawnT = 0.9;
    this.enemies.push(carrier);
    [240, 380, 520].forEach((x, i) => {
      const weaver = makeWeaver(this.rng, x, diff);
      weaver.y = 40 + i * 52;
      this.enemies.push(weaver);
    });
    const gunner = makeGunner(this.rng, 150, diff);
    gunner.y = gunner.hoverY = 250;
    gunner.fireT = 0.9;
    this.enemies.push(gunner);
  }

  // A composed mid-wave tableau for the action screenshot: a carrier
  // with its escort, two gunners, a darter file and a weaver, all placed
  // mid-flight and then simulated briefly so fire is already exchanged.
  stageActionScene() {
    const diff = this.director.diff;
    const carrier = makeCarrier(this.rng, 350, diff);
    carrier.y = 168;
    carrier.t = 2;
    carrier.spawnT = 0.5;
    const gunnerA = makeGunner(this.rng, 905, diff);
    gunnerA.y = gunnerA.hoverY = 215;
    gunnerA.fireT = 0.6;
    const gunnerB = makeGunner(this.rng, 640, diff);
    gunnerB.y = 70;
    gunnerB.hoverY = 165;
    this.enemies.push(carrier, gunnerA, gunnerB);
    [470, 580, 690].forEach((x, i) => {
      const darter = makeDarter(this.rng, x, diff);
      darter.y = 60 + i * 46;
      darter.baseX = x;
      this.enemies.push(darter);
    });
    const weaver = makeWeaver(this.rng, 205, diff);
    weaver.y = 110;
    this.enemies.push(weaver);
    // A lancer caught mid-charge, its telegraph line drawn on the player.
    const lancer = makeLancer(this.rng, 1010, diff);
    lancer.mode = 'aim';
    lancer.hoverY = 150;
    lancer.y = 150;
    lancer.aimT = 1.6;
    lancer.aimAngle = Math.PI / 2 + 0.42;
    this.enemies.push(lancer);
    this.dropPickup(560, 320, 'weapon');
  }

  // The boss, already scarred, caught the moment its radial burst opens.
  stageBossScene() {
    const boss = this.boss;
    if (!boss) return;
    boss.hp = Math.floor(boss.maxHp * 0.62);
    boss.phase = 2;
    boss.radialT = 0.05;
    const diff = this.director.diff;
    this.enemies.push(makeMite(this.rng, boss.x - 170, boss.y + 90, diff));
    this.enemies.push(makeMite(this.rng, boss.x + 180, boss.y + 70, diff));
    this.preSim(30);
  }

  installDemoPilot() {
    let dodge = 0;
    this.demoPilot = (dt) => {
      const p = this.player;
      // Threat assessment: slide away from the nearest incoming bullet.
      let threatX = 0;
      let nearest = 260;
      for (const b of this.enemyBullets) {
        const d = Math.hypot(b.x - p.x, b.y - p.y);
        if (d < nearest && b.vy > 0) { nearest = d; threatX = b.x; }
      }
      let targetX = p.x;
      if (nearest < 150) {
        dodge = p.x < threatX ? -1 : 1;
      }
      // Otherwise sit under the juiciest target.
      let bestY = -1;
      for (const e of this.enemies) {
        if (e.y > bestY && e.y < p.y - 120) { bestY = e.y; targetX = e.x; }
      }
      if (this.boss) targetX = this.boss.x + Math.sin(this.time * 0.9) * 60;
      const want = dodge !== 0 && nearest < 150 ? p.x + dodge * 190 : targetX;
      dodge = 0;
      const dx = Math.max(-1, Math.min(1, (want - p.x) / 60));
      const dy = Math.max(-1, Math.min(1, (VIEW.height - 150 - p.y) / 60));
      return { x: dx, y: dy };
    };
  }

  preSim(steps) {
    for (let i = 0; i < steps; i++) {
      this.starfield.update(STEP);
      this.stepPlaying(STEP);
      this.time += STEP;
    }
  }

  // ---- rendering --------------------------------------------------------

  render(ctx) {
    ctx.save();
    if (this.shake > 0.2) {
      ctx.translate(this.rng.range(-this.shake, this.shake) * 0.5, this.rng.range(-this.shake, this.shake) * 0.5);
    }
    this.starfield.draw(ctx);
    if (this.state !== 'title') {
      this.drawWorld(ctx);
    }
    ctx.restore();

    if (this.flash > 0) {
      ctx.fillStyle = `rgba(255,240,220,${(this.flash * 0.5).toFixed(3)})`;
      ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    }

    if (this.state === 'title') {
      drawTitle(ctx, this);
    } else {
      drawHUD(ctx, this);
      if (this.boss && this.state === 'playing') drawBossBar(ctx, this.boss);
      if (this.state === 'playing') drawWaveBanner(ctx, this);
      if (this.state === 'paused') drawPaused(ctx, this);
      if (this.state === 'over') drawGameOver(ctx, this);
      if (this.state === 'won') drawVictory(ctx, this);
    }
    drawVignette(ctx);
  }

  drawWorld(ctx) {
    for (const pickup of this.pickups) {
      ctx.save();
      ctx.translate(pickup.x, pickup.y);
      art.drawPickup(ctx, pickup.kind, pickup.t);
      ctx.restore();
    }
    // Enemy bullets under the ships, player bullets above.
    ctx.save();
    ctx.fillStyle = COLORS.enemyBullet;
    ctx.shadowColor = COLORS.enemyBullet;
    ctx.shadowBlur = 9;
    for (const b of this.enemyBullets) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffe9e0';
      ctx.beginPath();
      ctx.arc(b.x, b.y, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = COLORS.enemyBullet;
    }
    ctx.restore();

    // Lancer telegraphs: a dashed line down the dive line, brightening
    // as the charge completes, so the dive is always fair warning.
    for (const enemy of this.enemies) {
      if (enemy.kind !== 'lancer' || enemy.mode !== 'aim') continue;
      const charge = Math.min(1, Math.max(0, 1 - Math.max(0, enemy.aimT) / 0.85));
      ctx.save();
      ctx.strokeStyle = COLORS.lancer;
      ctx.globalAlpha = 0.25 + charge * 0.55;
      ctx.lineWidth = 1.6;
      ctx.setLineDash([9, 7]);
      ctx.beginPath();
      ctx.moveTo(enemy.x, enemy.y + 16);
      ctx.lineTo(enemy.x + Math.cos(enemy.aimAngle) * 640, enemy.y + Math.sin(enemy.aimAngle) * 640);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 0.5 + charge * 0.5;
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y + 16, 4 + charge * 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    for (const enemy of this.enemies) {
      ctx.save();
      ctx.translate(enemy.x, enemy.y);
      if (enemy.kind === 'boss') {
        art.drawBoss(ctx, enemy, this.time);
      } else {
        if (enemy.kind === 'lancer') ctx.rotate((enemy.angle ?? Math.PI / 2) - Math.PI / 2);
        ENEMY_ART[enemy.kind]?.(ctx, this.time + enemy.phase);
      }
      ctx.restore();
      if (enemy.flash > 0) {
        ctx.save();
        ctx.globalAlpha = Math.min(0.5, enemy.flash * 5);
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, Math.min(enemy.r * 0.9, 42), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      if ((enemy.kind === 'carrier' || enemy.kind === 'gunner' || enemy.kind === 'lancer') && enemy.hp < enemy.maxHp) {
        drawMiniBar(ctx, enemy);
      }
    }

    const p = this.player;
    if (p.alive) {
      const blink = p.invulnT > 0 && Math.sin(this.time * 26) > 0;
      if (!blink) {
        ctx.save();
        ctx.translate(p.x, p.y);
        art.drawPlayerShip(ctx, this.time, p.thrust);
        ctx.restore();
      }
      if (p.shieldT > 0) {
        ctx.save();
        ctx.strokeStyle = `rgba(67,245,255,${0.55 + Math.sin(this.time * 6) * 0.2})`;
        ctx.lineWidth = 2;
        ctx.shadowColor = COLORS.shield;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 30 + Math.sin(this.time * 4) * 2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }

    ctx.save();
    ctx.fillStyle = COLORS.bullet;
    ctx.shadowColor = COLORS.bullet;
    ctx.shadowBlur = 10;
    for (const b of this.playerBullets) {
      ctx.beginPath();
      ctx.ellipse(b.x, b.y, 3.2, 8, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    this.particles.draw(ctx);
  }
}

function circleHit(a, bx, by, br) {
  const dx = a.x - bx;
  const dy = a.y - by;
  const rr = a.r + br;
  return dx * dx + dy * dy < rr * rr;
}

function enemyColor(kind) {
  return {
    darter: COLORS.darter, weaver: COLORS.weaver, lancer: COLORS.lancer,
    gunner: COLORS.gunner, carrier: COLORS.carrier, mite: COLORS.mite,
  }[kind] ?? '#ffffff';
}

function drawMiniBar(ctx, enemy) {
  const w = enemy.r * 1.7;
  const frac = Math.max(0, enemy.hp / enemy.maxHp);
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  ctx.fillRect(enemy.x - w / 2, enemy.y - enemy.r - 12, w, 4);
  ctx.fillStyle = '#7dff9a';
  ctx.fillRect(enemy.x - w / 2, enemy.y - enemy.r - 12, w * frac, 4);
  ctx.restore();
}

function drawVignette(ctx) {
  const grad = ctx.createRadialGradient(
    VIEW.width / 2, VIEW.height / 2, VIEW.height * 0.42,
    VIEW.width / 2, VIEW.height / 2, VIEW.height * 0.95,
  );
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(1,2,8,0.5)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
}

function loadBest() {
  try {
    return Number(window.localStorage.getItem('voidstorm-best') ?? 0) || 0;
  } catch (err) {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem('voidstorm-best', String(value));
  } catch (err) { /* storage unavailable: the run still counts */ }
}
