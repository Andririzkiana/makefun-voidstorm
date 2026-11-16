// The wave director: turns a wave number into a timed queue of spawn
// events, and the difficulty curve that scales enemy toughness with it.
// Every fifth wave is a boss wave. Compositions mix formations (lines,
// vees, streams, escorted carriers) so consecutive waves feel different.

import { VIEW } from './config.js';
import { makeBoss, makeCarrier, makeDarter, makeGunner, makeWeaver } from './entities.js';

export function diffForWave(wave) {
  return {
    hpMul: 1 + (wave - 1) * 0.17,
    fireMul: 1 + (wave - 1) * 0.07,
    speedMul: Math.min(0.5, (wave - 1) * 0.03),
  };
}

function line(events, at, count, gap, make) {
  for (let i = 0; i < count; i++) {
    const x = (VIEW.width / (count + 1)) * (i + 1);
    events.push({ at: at + i * gap, spawn: (rng, diff) => make(rng, x, diff) });
  }
}

function vee(events, at, count, gap, make) {
  const cx = VIEW.width / 2;
  for (let i = 0; i < count; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const rank = Math.ceil(i / 2);
    const x = cx + side * rank * 74;
    events.push({ at: at + rank * gap, spawn: (rng, diff) => make(rng, x, diff) });
  }
}

function stream(events, at, count, gap, make, rng) {
  let x = rng.range(160, VIEW.width - 160);
  for (let i = 0; i < count; i++) {
    const sx = x;
    events.push({ at: at + i * gap, spawn: (r, diff) => make(r, sx, diff) });
    x = Math.max(90, Math.min(VIEW.width - 90, x + rng.range(-190, 190)));
  }
}

export function composeWave(wave, rng) {
  const events = [];
  const diff = diffForWave(wave);

  if (wave % 5 === 0) {
    events.push({ at: 0.6, spawn: () => makeBoss(diff) });
    stream(events, 7, 4, 2.6, makeDarter, rng);
    stream(events, 16, 4, 2.6, makeWeaver, rng);
    return events.sort((a, b) => a.at - b.at);
  }

  const budget = 3 + wave;
  let at = 0.5;
  let spent = 0;
  const patterns = ['line', 'vee', 'stream', 'gunners', 'carrier'];
  let patternIndex = (wave - 1) % patterns.length;

  while (spent < budget) {
    const pattern = patterns[patternIndex % patterns.length];
    patternIndex++;
    if (pattern === 'line') {
      const n = Math.min(7, 4 + Math.floor(wave / 2));
      line(events, at, n, 0.34, makeDarter);
      spent += n * 0.7;
      at += 2.6;
    } else if (pattern === 'vee') {
      const n = 5 + Math.min(4, wave);
      vee(events, at, n, 0.3, makeDarter);
      spent += n * 0.7;
      at += 2.8;
    } else if (pattern === 'stream') {
      const n = 4 + Math.min(5, wave);
      stream(events, at, n, 0.55, makeWeaver, rng);
      spent += n;
      at += 3 + n * 0.4;
    } else if (pattern === 'gunners') {
      const n = wave < 2 ? 2 : 3;
      const xs = n === 2 ? [VIEW.width * 0.32, VIEW.width * 0.68] : [VIEW.width * 0.24, VIEW.width * 0.5, VIEW.width * 0.76];
      xs.forEach((x, i) => {
        events.push({ at: at + i * 0.7, spawn: (r, d) => makeGunner(r, x, d) });
      });
      spent += n * 2.2;
      at += 3.4;
    } else if (pattern === 'carrier') {
      if (wave < 2) continue;
      const x = rng.range(300, VIEW.width - 300);
      events.push({ at, spawn: (r, d) => makeCarrier(r, x, d) });
      events.push({ at: at + 0.5, spawn: (r, d) => makeDarter(r, x - 130, d) });
      events.push({ at: at + 0.5, spawn: (r, d) => makeDarter(r, x + 130, d) });
      spent += 5;
      at += 4.2;
    }
  }
  return events.sort((a, b) => a.at - b.at);
}

export class WaveDirector {
  constructor(rng) {
    this.rng = rng;
    this.wave = 0;
    this.diff = diffForWave(1);
    this.queue = [];
    this.elapsed = 0;
    this.running = false;
  }

  start(wave) {
    this.wave = wave;
    this.diff = diffForWave(wave);
    this.queue = composeWave(wave, this.rng);
    this.elapsed = 0;
    this.running = true;
  }

  update(dt) {
    if (!this.running) return [];
    this.elapsed += dt;
    const due = [];
    while (this.queue.length > 0 && this.queue[0].at <= this.elapsed) {
      due.push(this.queue.shift());
    }
    return due;
  }

  get drained() {
    return this.running && this.queue.length === 0;
  }
}
