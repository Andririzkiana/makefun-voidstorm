// Bootstrap: wire the canvas, input and sound to the Game, then run the
// fixed-step loop. Query parameters exist for the screenshot rig only —
// ?shot=start|action|boss|late|over builds a deterministic scene and
// ?seed=<n> pins the random generator. Plain play uses neither.

import { Game } from './game.js';
import { Input } from './input.js';
import { SoundSynth } from './audio.js';
import { seedFromClock } from './rng.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const errorBox = document.getElementById('err');

window.addEventListener('error', (event) => {
  if (errorBox) errorBox.textContent = `Error: ${event.message}`;
});

const params = new URLSearchParams(window.location.search);
const seedParam = Number(params.get('seed'));
const seed = Number.isFinite(seedParam) && seedParam > 0 ? seedParam : seedFromClock();
const shot = params.get('shot');

const input = new Input(canvas);
const sound = new SoundSynth();
const game = new Game({ input, sound, seed, shot });
window.__voidstorm = game;

// Browsers let audio start only after a gesture; the first key or click
// unlocks the synth, and title-screen confirms also flow through here.
window.addEventListener('keydown', () => sound.unlock(), { passive: true });
window.addEventListener('pointerdown', () => sound.unlock(), { passive: true });

const STEP = 1 / 60;
let last = performance.now();
let accumulator = 0;

function frame(now) {
  requestAnimationFrame(frame);
  let elapsed = (now - last) / 1000;
  last = now;
  if (elapsed > 0.25) elapsed = 0.25;
  accumulator += elapsed;
  while (accumulator >= STEP) {
    game.step(STEP);
    accumulator -= STEP;
  }
  game.render(ctx);
}

requestAnimationFrame(frame);
