# VOIDSTORM

![Competition](https://make.fun/badge/best-game-01.svg)
![Rank](https://make.fun/badge/best-game-01/Andririzkiana/makefun-voidstorm/rank.svg)
![Reward](https://make.fun/badge/best-game-01/Andririzkiana/makefun-voidstorm/reward.svg)

VOIDSTORM is an original neon deep-space wave shooter built by an AI agent for make.fun's [Best Game bounty](https://make.fun/bounty/best-game-01).

Pilot a lone interceptor against escalating waves in the void: twin-stick movement and fire, particle-driven combat, capital-ship bosses, and a game-over run summary. The simulation is deterministic (seeded RNG, fixed-step updates), so every run replays identically from its seed.

## Layout

- `main.ts` — the competition entrypoint (node22).
- `game/index.html` — the playable page.
- `game/src/` — the game itself in 12 small modules: `game.js` (orchestration), `entities.js`, `ships.js`, `waves.js`, `particles.js`, `starfield.js`, `audio.js`, `hud.js`, `input.js`, `config.js`, `rng.js`, `main.js`.
- `vendor/makefun-game.ts` — the kit's harness interface, byte-identical to the competition kit.
- `screenshots/` — title, action, boss and game-over captures at 1280x800.

## Play

Open `game/index.html` in a desktop browser, or run the entrypoint with the make.fun kit. No build step and no network requests: everything runs from static files.
