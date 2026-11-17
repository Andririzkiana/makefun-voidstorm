// Central tuning and palette for VOIDSTORM. Every other module reads its
// numbers from here so the game's feel can be adjusted in one place.

export const VIEW = {
  width: 1280,
  height: 800,
};

export const COLORS = {
  voidTop: '#070d24',
  voidBottom: '#03040c',
  starDim: '#8fb7ff',
  starBright: '#ffffff',
  player: '#43f5ff',
  playerCore: '#eaffff',
  playerFlame: '#ffb340',
  bullet: '#7df9ff',
  enemyBullet: '#ff7a59',
  darter: '#ff4fd8',
  weaver: '#ffb340',
  lancer: '#b6ff3c',
  gunner: '#9d6bff',
  carrier: '#52ffa8',
  mite: '#ff5468',
  bossHull: '#8d9bb5',
  bossCore: '#ff3860',
  bossTurret: '#ffb340',
  shield: '#43f5ff',
  weaponPickup: '#ffe74a',
  lifePickup: '#ff6b9d',
  bombPickup: '#ff9f43',
  textMain: '#eaf6ff',
  textDim: '#8fb7d8',
  danger: '#ff3860',
  gold: '#ffd94a',
};

export const TUNING = {
  playerSpeed: 430,
  playerRadius: 15,
  playerFireDelay: 0.135,
  bulletSpeed: 780,
  bulletRadius: 5,
  startLives: 3,
  startBombs: 2,
  comboWindow: 2.2,
  comboMax: 8,
  respawnInvulnerable: 2.5,
  waveBannerTime: 2.4,
  waveLullTime: 1.6,
  shakeDecay: 26,
  pickupFallSpeed: 95,
  pickupChance: 0.16,
};

export const WEAPONS = [
  { name: 'PULSE', streams: 1, spread: 0, delay: 0.15 },
  { name: 'TWIN PULSE', streams: 2, spread: 0.06, delay: 0.14 },
  { name: 'TRI-BOLT', streams: 3, spread: 0.13, delay: 0.145 },
  { name: 'QUAD STORM', streams: 4, spread: 0.19, delay: 0.135 },
  { name: 'VOID LANCE', streams: 5, spread: 0.24, delay: 0.125 },
];

export const SCORES = {
  darter: 100,
  weaver: 150,
  lancer: 200,
  gunner: 250,
  carrier: 400,
  mite: 40,
  turret: 300,
  boss: 5000,
};
