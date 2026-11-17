// The counted campaign: twelve waves across four named sectors, with
// the Dreadnought waiting as the wave-12 finale. This module is the
// single source of truth for that structure — the wave director, the
// HUD and the banners all read their framing from here.
//
// In ENDLESS mode there is no finale: the sectors cycle, a Dreadnought
// anchors every fifth wave, and the difficulty curve keeps rising.

export const BOSS_NAME = 'DREADNOUGHT';
export const BOSS_TITLE = 'VOID CAPITAL SHIP';

export const WAVES_PER_SECTOR = 3;
export const TOTAL_WAVES = 12;

export const SECTORS = [
  { name: 'EMBER REACH', flavor: 'FIRST CONTACT IN THE BURNING DARK' },
  { name: 'HALCYON DRIFT', flavor: 'THE QUIET BEFORE THE SWARM' },
  { name: 'SHATTERED VEIL', flavor: 'WRECKAGE ON EVERY CHANNEL' },
  { name: 'THE DREAD THRONE', flavor: 'THE CAPITAL SHIP AWAITS' },
];

// Everything the rest of the game needs to know about one wave: which
// sector frames it, whether it opens that sector, and whether the
// Dreadnought anchors it.
export function wavePlan(wave, mode) {
  const sectorIndex = Math.floor((wave - 1) / WAVES_PER_SECTOR) % SECTORS.length;
  const sectorStart = (wave - 1) % WAVES_PER_SECTOR === 0;
  if (mode === 'endless') {
    return {
      sector: SECTORS[sectorIndex],
      sectorIndex,
      sectorStart,
      isBoss: wave % 5 === 0,
      isFinale: false,
    };
  }
  return {
    sector: SECTORS[sectorIndex],
    sectorIndex,
    sectorStart,
    isBoss: wave === TOTAL_WAVES,
    isFinale: wave === TOTAL_WAVES,
  };
}

export function sectorForWave(wave, mode) {
  return wavePlan(wave, mode).sector;
}
