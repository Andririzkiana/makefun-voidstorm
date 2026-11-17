// Run modes and difficulty levels. A run is shaped by two choices made
// on the title screen: a DIFFICULTY (CADET / PILOT / ACE) that scales
// enemy hull, fire rate and speed while multiplying the score, and a
// MODE — the counted CAMPAIGN of campaign.js, or ENDLESS, where waves
// keep coming and the difficulty curve never stops rising.
//
// This module owns the selection state the title screen edits and the
// pure function that folds a difficulty into a wave's difficulty curve.

export const DIFFICULTIES = [
  {
    id: 'cadet', name: 'CADET', scoreMul: 1,
    hpMul: 0.8, fireMul: 0.7, speedMul: 0.9,
    blurb: 'A KINDER VOID',
  },
  {
    id: 'pilot', name: 'PILOT', scoreMul: 2,
    hpMul: 1.0, fireMul: 1.0, speedMul: 1.0,
    blurb: 'THE INTENDED FIGHT',
  },
  {
    id: 'ace', name: 'ACE', scoreMul: 3,
    hpMul: 1.3, fireMul: 1.3, speedMul: 1.12,
    blurb: 'THE VOID SHOOTS BACK',
  },
];

export const MODES = [
  { id: 'campaign', name: 'CAMPAIGN', blurb: '12 WAVES · 4 SECTORS · ONE DREADNOUGHT' },
  { id: 'endless', name: 'ENDLESS', blurb: 'NO FINAL WAVE · SURVIVE THE DEEPENING DARK' },
];

// Fold a difficulty into the wave director's base curve. Fire rate is
// capped so ACE on a late wave stays fierce but fair.
export function applyDifficulty(base, difficulty) {
  if (!difficulty) return base;
  return {
    hpMul: base.hpMul * difficulty.hpMul,
    fireMul: Math.min(2.6, base.fireMul * difficulty.fireMul),
    speedMul: base.speedMul * difficulty.speedMul,
  };
}

// The title-screen selection: which difficulty and mode the next run
// will use. Arrow keys (or WASD) move it; the game reads the result
// when the player confirms the launch.
export class ModeSelect {
  constructor() {
    this.difficultyIndex = 1; // PILOT — the intended fight.
    this.modeIndex = 0; // CAMPAIGN.
  }

  get difficulty() {
    return DIFFICULTIES[this.difficultyIndex];
  }

  get mode() {
    return MODES[this.modeIndex].id;
  }

  get modeEntry() {
    return MODES[this.modeIndex];
  }

  handleInput(input) {
    if (input.wasPressed('ArrowUp') || input.wasPressed('KeyW')) {
      this.difficultyIndex = (this.difficultyIndex + DIFFICULTIES.length - 1) % DIFFICULTIES.length;
      return true;
    }
    if (input.wasPressed('ArrowDown') || input.wasPressed('KeyS')) {
      this.difficultyIndex = (this.difficultyIndex + 1) % DIFFICULTIES.length;
      return true;
    }
    if (input.wasPressed('ArrowLeft') || input.wasPressed('KeyA') || input.wasPressed('ArrowRight') || input.wasPressed('KeyD')) {
      this.modeIndex = (this.modeIndex + 1) % MODES.length;
      return true;
    }
    for (let i = 0; i < DIFFICULTIES.length; i++) {
      if (input.wasPressed(`Digit${i + 1}`)) {
        this.difficultyIndex = i;
        return true;
      }
    }
    return false;
  }
}
