export const TILE = 45;
export const ROWS = 12;
export const VIEW_W = 960;
export const VIEW_H = 540;
export const STEP = 1 / 120;
export const MAX_FRAME = 0.1;
export const GRAVITY = 2400;
export const MAX_FALL = 1000;

export const PLAYER = {
  w: 34,
  h: 40,
  walkSpeed: 260,
  groundAccel: 2200,
  groundDecel: 2800,
  airAccel: 1500,
  jumpVelocity: 900,
  jumpCut: 320,
  coyoteTime: 0.1,
  jumpBuffer: 0.12,
  stompBounce: 650,
  stompBounceHeld: 900,
  stompTolerance: 12,
  stompGrace: 0.35,
  spawnGrace: 1.0,
  squashTime: 0.14,
};

export const CARROT = { w: 30, h: 38, speed: 60 };

export const ZOMBIE = {
  bigW: 50,
  bigH: 86,
  bigSpeed: 40,
  smallW: 34,
  smallH: 46,
  smallSpeed: 120,
  dizzyTime: 0.6,
};

export const STAR = { w: 36, h: 36, speed: 70, hurtSpeed: 110, dizzyTime: 0.6 };

export const PROPELLER = { w: 30, h: 36, speed: 60, range: 3, bob: 6, bobPeriod: 1.0, lift: 16 };
export const BEE = { w: 32, h: 28, speed: 120, range: 4, bob: 30, bobPeriod: 1.6, lift: 0 };
export const BAT = { w: 36, h: 26, speed: 120, range: 4, bob: 30, bobPeriod: 1.6, lift: 0 };
export const FLYER = { phasePerCol: 1.3 };
export const MOVER = { range: 2, period: 5, phasePerCol: 1.3 };
export const RAIN = { dry: 2.4, warn: 0.8, rain: 1.6, dropSpeed: 600, width: 2, phasePerCol: 0.7 };

export const CRYSTAL = { size: 26 };
export const GOAL = { w: 44, h: 64 };

export const RULES = {
  startLives: 3,
  maxLives: 9,
  crystalsPerLife: 5,
  introTime: 1.4,
  dyingTime: 1.0,
  fallLimit: 200,
};

export const CAMERA = { anchor: 0.4, lookahead: 60, smoothing: 8 };
export const BOIL = { fps: 6, jitter: 1.2 };

export const COLORS = {
  paper: '#FBFCFF',
  gridMinor: '#E3ECFA',
  gridMajor: '#CCDBF3',
  ink: '#2340A8',
  inkSoft: '#9FB2E3',
  margin: '#EF8A8F',
  desk: '#D9E3F2',
  chicken: '#FFFDF5',
  chickenWing: '#F3EAD6',
  comb: '#E5484D',
  beak: '#F59E0B',
  carrot: '#FF8A3D',
  leaves: '#3FAE49',
  zombie: '#9CC28A',
  zombieStripe: '#6F9A5E',
  zombieMouth: '#3B2F4A',
  bee: '#FFD84D',
  beeWing: 'rgba(236, 243, 255, 0.6)',
  teeth: '#FFFFFF',
  eyeWhite: '#FFFFFF',
  crystal: '#F43F5E',
  crystalLight: '#FDA4AF',
  goal: '#22C55E',
  goalLight: '#BBF7D0',
  grass: '#8BD17C',
  dirt: '#F0DDB5',
  platform: '#F7C873',
  sign: '#FFF1C1',
  heart: '#E5484D',
  star: '#FFD84D',
  confetti: ['#F43F5E', '#22C55E', '#FFD84D', '#2340A8', '#FF8A3D', '#9FB2E3'],
  skyWash: '#ECE8FA',
  cloud: '#FFFFFF',
  cloudShade: '#DCE4F7',
  rainCloud: '#B9C3DD',
  rainCloudDark: '#8E9AC0',
  rain: '#5B7BD5',
  starEnemy: '#FFC83D',
  bat: '#7C6AA6',
  batWing: '#B7A9D9',
  moon: '#FFF1A8',
  moonCheek: '#F9A8B8',
};
