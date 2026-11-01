import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TILE, STEP, PLAYER } from '../src/config.js';
import { createEnemy, updateEnemy, stompEnemy } from '../src/core/enemies.js';
import { createWorld } from '../src/core/world.js';
import { parseLevel } from '../src/core/level.js';
import { testLevel, castleMap } from './helpers.js';

const IDLE = { left: false, right: false, jumpHeld: false, jumpPressed: false };
const STOMP_STEPS = [400, 410, 700, 1000];

const round = (n) => Math.round(n * 1000) / 1000 + 0;
const chickenAt = (col) => ({ x: (col + 0.5) * TILE, y: 11 * TILE, h: PLAYER.h, facing: 1, dead: false });

function spiderLair() {
  const row = 'C' + '.'.repeat(18) + 'S' + '.'.repeat(4) + '#' + '.'.repeat(5) + 'G';
  const level = parseLevel({ id: 'lair', map: castleMap([row, '#'.repeat(row.length)], [24]) });
  return { level, e: createEnemy(level.enemies[0]) };
}

const SEA_ROW = 'C......H' + '......P' + '.'.repeat(32) + 'G';
const seaArena = () => testLevel([SEA_ROW, '#'.repeat(SEA_ROW.length)], { theme: 'sea' });

function sharkArena() {
  const level = seaArena();
  return { level, e: createEnemy(level.enemies[0]) };
}

function simulate({ level, e }, steps, player, stompAt = []) {
  const shots = [];
  const stomps = [];
  for (let step = 1; step <= steps; step++) {
    const shot = updateEnemy(e, STEP, level, player(step));
    if (shot) shots.push({ step, kind: shot.kind, x: round(shot.x), y: round(shot.y), vx: round(shot.vx), vy: round(shot.vy ?? 0) });
    if (!stompAt.includes(step)) continue;
    const result = stompEnemy(e);
    stomps.push({ step, result, lives: e.lives, alive: e.alive });
    if (!e.alive) break;
  }
  return { shots, stomps };
}

const awayDuring = (near, far, windows) => (step) => (windows.some(([from, to]) => step >= from && step <= to) ? far : near);

function pin(name, actual, shotCount) {
  if (shotCount !== undefined) assert.ok(shotCount >= 5, `${name}: only ${shotCount} shots recorded`);
  assert.deepEqual(actual, EXPECTED[name], JSON.stringify(actual));
}

function crabRun({ lives, dizzyAt } = {}) {
  const world = createWorld(seaArena());
  const shark = world.enemies[0];
  if (lives) shark.lives = lives;
  const [pearl] = world.pearls;
  Object.assign(world.player, { x: pearl.x, y: pearl.y, vx: 0, vy: 0, onGround: true });
  const pinches = [];
  const shells = [];
  const goalOpen = [];
  for (let step = 1; step <= 600; step++) {
    world.player.invuln = 99;
    if (step === dizzyAt) shark.dizzy = 0.5;
    const dizzyBefore = round(shark.dizzy);
    for (const ev of world.step(STEP, IDLE)) {
      if (ev.type === 'crabPinch') pinches.push({ step, result: ev.result, dizzyBefore, lives: shark.lives, dizzy: round(shark.dizzy) });
      if (ev.type === 'shell') shells.push(step);
      if (ev.type === 'goalOpen') goalOpen.push(step);
    }
  }
  return { pinches, shells, goalOpen, goalLocked: world.goal.locked };
}

const EXPECTED = {
  'spider: in range for 1200 steps': [
    { step: 145, kind: 'fireball', x: 834.5, y: 481, vx: -220, vy: 0 },
    { step: 289, kind: 'fireball', x: 834.5, y: 431, vx: -220, vy: 0 },
    { step: 325, kind: 'fireball', x: 834.5, y: 431, vx: -220, vy: 0 },
    { step: 469, kind: 'fireball', x: 834.5, y: 481, vx: -220, vy: 0 },
    { step: 505, kind: 'fireball', x: 834.5, y: 481, vx: -220, vy: 0 },
    { step: 541, kind: 'fireball', x: 834.5, y: 481, vx: -220, vy: 0 },
    { step: 685, kind: 'fireball', x: 834.5, y: 431, vx: -220, vy: 0 },
    { step: 829, kind: 'fireball', x: 834.5, y: 481, vx: -220, vy: 0 },
    { step: 865, kind: 'fireball', x: 834.5, y: 481, vx: -220, vy: 0 },
    { step: 1009, kind: 'fireball', x: 834.5, y: 431, vx: -220, vy: 0 },
    { step: 1045, kind: 'fireball', x: 834.5, y: 431, vx: -220, vy: 0 },
    { step: 1081, kind: 'fireball', x: 834.5, y: 431, vx: -220, vy: 0 },
  ],
  'spider: leaves range and returns': [
    { step: 145, kind: 'fireball', x: 834.5, y: 481, vx: -220, vy: 0 },
    { step: 389, kind: 'fireball', x: 834.5, y: 431, vx: -220, vy: 0 },
    { step: 425, kind: 'fireball', x: 834.5, y: 431, vx: -220, vy: 0 },
    { step: 569, kind: 'fireball', x: 834.5, y: 481, vx: -220, vy: 0 },
    { step: 605, kind: 'fireball', x: 834.5, y: 481, vx: -220, vy: 0 },
    { step: 641, kind: 'fireball', x: 834.5, y: 481, vx: -220, vy: 0 },
    { step: 785, kind: 'fireball', x: 834.5, y: 431, vx: -220, vy: 0 },
  ],
  'spider: leaves range mid wind-up and mid volley': [
    { step: 219, kind: 'fireball', x: 834.5, y: 481, vx: -220, vy: 0 },
    { step: 364, kind: 'fireball', x: 834.5, y: 431, vx: -220, vy: 0 },
    { step: 469, kind: 'fireball', x: 834.5, y: 481, vx: -220, vy: 0 },
    { step: 505, kind: 'fireball', x: 834.5, y: 481, vx: -220, vy: 0 },
    { step: 541, kind: 'fireball', x: 834.5, y: 481, vx: -220, vy: 0 },
    { step: 686, kind: 'fireball', x: 834.5, y: 431, vx: -220, vy: 0 },
    { step: 830, kind: 'fireball', x: 834.5, y: 481, vx: -220, vy: 0 },
    { step: 866, kind: 'fireball', x: 834.5, y: 481, vx: -220, vy: 0 },
  ],
  'spider: stomps': {
    shots: [
      { step: 145, kind: 'fireball', x: 834.5, y: 481, vx: -220, vy: 0 },
      { step: 289, kind: 'fireball', x: 834.5, y: 431, vx: -220, vy: 0 },
      { step: 325, kind: 'fireball', x: 834.5, y: 431, vx: -220, vy: 0 },
      { step: 642, kind: 'fireball', x: 834.5, y: 481, vx: -220, vy: 0 },
      { step: 678, kind: 'fireball', x: 834.5, y: 481, vx: -220, vy: 0 },
      { step: 942, kind: 'fireball', x: 834.5, y: 431, vx: -220, vy: 0 },
    ],
    stomps: [
      { step: 400, result: 'hurt', lives: 2, alive: true },
      { step: 410, result: 'bounce', lives: 2, alive: true },
      { step: 700, result: 'hurt', lives: 1, alive: true },
      { step: 1000, result: 'defeated', lives: 1, alive: false },
    ],
  },
  'shark: in range for 1200 steps': [
    { step: 169, kind: 'shell', x: 400.5, y: 479, vx: 240, vy: 0 },
    { step: 185, kind: 'shell', x: 400.5, y: 479, vx: 240, vy: 0 },
    { step: 353, kind: 'shell', x: 400.5, y: 429, vx: 240, vy: 0 },
    { step: 370, kind: 'shell', x: 400.5, y: 429, vx: 240, vy: 0 },
    { step: 387, kind: 'shell', x: 400.5, y: 429, vx: 240, vy: 0 },
    { step: 555, kind: 'shell', x: 400.5, y: 479, vx: 240, vy: 0 },
    { step: 572, kind: 'shell', x: 400.5, y: 479, vx: 240, vy: 0 },
    { step: 589, kind: 'shell', x: 400.5, y: 479, vx: 240, vy: 0 },
    { step: 605, kind: 'shell', x: 400.5, y: 479, vx: 240, vy: 0 },
    { step: 773, kind: 'shell', x: 400.5, y: 429, vx: 240, vy: 0 },
    { step: 790, kind: 'shell', x: 400.5, y: 429, vx: 240, vy: 0 },
    { step: 958, kind: 'shell', x: 400.5, y: 479, vx: 240, vy: 0 },
    { step: 975, kind: 'shell', x: 400.5, y: 479, vx: 240, vy: 0 },
    { step: 992, kind: 'shell', x: 400.5, y: 479, vx: 240, vy: 0 },
    { step: 1160, kind: 'shell', x: 400.5, y: 429, vx: 240, vy: 0 },
    { step: 1177, kind: 'shell', x: 400.5, y: 429, vx: 240, vy: 0 },
    { step: 1193, kind: 'shell', x: 400.5, y: 429, vx: 240, vy: 0 },
  ],
  'shark: chicken overhead': [
    { step: 169, kind: 'shell', x: 337.5, y: 418, vx: 0, vy: -240 },
    { step: 185, kind: 'shell', x: 337.5, y: 418, vx: 0, vy: -240 },
    { step: 353, kind: 'shell', x: 337.5, y: 418, vx: 0, vy: -240 },
    { step: 370, kind: 'shell', x: 337.5, y: 418, vx: 0, vy: -240 },
    { step: 387, kind: 'shell', x: 337.5, y: 418, vx: 0, vy: -240 },
    { step: 555, kind: 'shell', x: 337.5, y: 418, vx: 0, vy: -240 },
    { step: 572, kind: 'shell', x: 337.5, y: 418, vx: 0, vy: -240 },
    { step: 589, kind: 'shell', x: 337.5, y: 418, vx: 0, vy: -240 },
    { step: 605, kind: 'shell', x: 337.5, y: 418, vx: 0, vy: -240 },
    { step: 773, kind: 'shell', x: 337.5, y: 418, vx: 0, vy: -240 },
    { step: 790, kind: 'shell', x: 337.5, y: 418, vx: 0, vy: -240 },
    { step: 958, kind: 'shell', x: 337.5, y: 418, vx: 0, vy: -240 },
    { step: 975, kind: 'shell', x: 337.5, y: 418, vx: 0, vy: -240 },
    { step: 992, kind: 'shell', x: 337.5, y: 418, vx: 0, vy: -240 },
    { step: 1160, kind: 'shell', x: 337.5, y: 418, vx: 0, vy: -240 },
    { step: 1177, kind: 'shell', x: 337.5, y: 418, vx: 0, vy: -240 },
    { step: 1193, kind: 'shell', x: 337.5, y: 418, vx: 0, vy: -240 },
  ],
  'shark: leaves range and returns': [
    { step: 169, kind: 'shell', x: 400.5, y: 479, vx: 240, vy: 0 },
    { step: 185, kind: 'shell', x: 400.5, y: 479, vx: 240, vy: 0 },
    { step: 453, kind: 'shell', x: 400.5, y: 429, vx: 240, vy: 0 },
    { step: 470, kind: 'shell', x: 400.5, y: 429, vx: 240, vy: 0 },
    { step: 487, kind: 'shell', x: 400.5, y: 429, vx: 240, vy: 0 },
    { step: 655, kind: 'shell', x: 400.5, y: 479, vx: 240, vy: 0 },
    { step: 672, kind: 'shell', x: 400.5, y: 479, vx: 240, vy: 0 },
    { step: 689, kind: 'shell', x: 400.5, y: 479, vx: 240, vy: 0 },
    { step: 705, kind: 'shell', x: 400.5, y: 479, vx: 240, vy: 0 },
    { step: 873, kind: 'shell', x: 400.5, y: 429, vx: 240, vy: 0 },
    { step: 890, kind: 'shell', x: 400.5, y: 429, vx: 240, vy: 0 },
  ],
  'shark: leaves range mid wind-up and mid volley': [
    { step: 243, kind: 'shell', x: 400.5, y: 479, vx: 240, vy: 0 },
    { step: 260, kind: 'shell', x: 400.5, y: 479, vx: 240, vy: 0 },
    { step: 428, kind: 'shell', x: 400.5, y: 429, vx: 240, vy: 0 },
    { step: 513, kind: 'shell', x: 400.5, y: 479, vx: 240, vy: 0 },
    { step: 530, kind: 'shell', x: 400.5, y: 479, vx: 240, vy: 0 },
    { step: 547, kind: 'shell', x: 400.5, y: 479, vx: 240, vy: 0 },
    { step: 564, kind: 'shell', x: 400.5, y: 479, vx: 240, vy: 0 },
    { step: 732, kind: 'shell', x: 400.5, y: 429, vx: 240, vy: 0 },
    { step: 749, kind: 'shell', x: 400.5, y: 429, vx: 240, vy: 0 },
  ],
  'shark: stomps': {
    shots: [
      { step: 169, kind: 'shell', x: 400.5, y: 479, vx: 240, vy: 0 },
      { step: 185, kind: 'shell', x: 400.5, y: 479, vx: 240, vy: 0 },
      { step: 353, kind: 'shell', x: 400.5, y: 429, vx: 240, vy: 0 },
      { step: 370, kind: 'shell', x: 400.5, y: 429, vx: 240, vy: 0 },
      { step: 387, kind: 'shell', x: 400.5, y: 429, vx: 240, vy: 0 },
      { step: 666, kind: 'shell', x: 400.5, y: 479, vx: 240, vy: 0 },
      { step: 682, kind: 'shell', x: 400.5, y: 479, vx: 240, vy: 0 },
      { step: 699, kind: 'shell', x: 400.5, y: 479, vx: 240, vy: 0 },
      { step: 966, kind: 'shell', x: 400.5, y: 429, vx: 240, vy: 0 },
      { step: 982, kind: 'shell', x: 400.5, y: 429, vx: 240, vy: 0 },
    ],
    stomps: [
      { step: 400, result: 'hurt', lives: 2, alive: true },
      { step: 410, result: 'bounce', lives: 2, alive: true },
      { step: 700, result: 'hurt', lives: 1, alive: true },
      { step: 1000, result: 'defeated', lives: 1, alive: false },
    ],
  },
  'shark: fires at a chicken standing right next to it': [
    { step: 169, kind: 'shell', x: 400.5, y: 479, vx: 240, vy: 0 },
    { step: 185, kind: 'shell', x: 400.5, y: 479, vx: 240, vy: 0 },
    { step: 353, kind: 'shell', x: 400.5, y: 429, vx: 240, vy: 0 },
    { step: 370, kind: 'shell', x: 400.5, y: 429, vx: 240, vy: 0 },
    { step: 387, kind: 'shell', x: 400.5, y: 429, vx: 240, vy: 0 },
    { step: 555, kind: 'shell', x: 400.5, y: 479, vx: 240, vy: 0 },
    { step: 572, kind: 'shell', x: 400.5, y: 479, vx: 240, vy: 0 },
    { step: 589, kind: 'shell', x: 400.5, y: 479, vx: 240, vy: 0 },
    { step: 605, kind: 'shell', x: 400.5, y: 479, vx: 240, vy: 0 },
    { step: 773, kind: 'shell', x: 400.5, y: 429, vx: 240, vy: 0 },
    { step: 790, kind: 'shell', x: 400.5, y: 429, vx: 240, vy: 0 },
    { step: 958, kind: 'shell', x: 400.5, y: 479, vx: 240, vy: 0 },
    { step: 975, kind: 'shell', x: 400.5, y: 479, vx: 240, vy: 0 },
    { step: 992, kind: 'shell', x: 400.5, y: 479, vx: 240, vy: 0 },
    { step: 1160, kind: 'shell', x: 400.5, y: 429, vx: 240, vy: 0 },
    { step: 1177, kind: 'shell', x: 400.5, y: 429, vx: 240, vy: 0 },
    { step: 1193, kind: 'shell', x: 400.5, y: 429, vx: 240, vy: 0 },
  ],
  'crab: pinches the shark': {
    pinches: [
      { step: 173, result: 'hurt', dizzyBefore: 0, lives: 2, dizzy: 0.8 },
      { step: 282, result: 'hurt', dizzyBefore: 0, lives: 1, dizzy: 0.8 },
    ],
    shells: [169, 548, 564, 581],
    goalOpen: [],
    goalLocked: true,
  },
  'crab: pinch lands on a dizzy shark': {
    pinches: [
      { step: 173, result: 'hurt', dizzyBefore: 0.25, lives: 2, dizzy: 0.8 },
      { step: 282, result: 'hurt', dizzyBefore: 0, lives: 1, dizzy: 0.8 },
    ],
    shells: [548, 564],
    goalOpen: [],
    goalLocked: true,
  },
  'crab: pinch kills a one-life shark': {
    pinches: [{ step: 173, result: 'defeated', dizzyBefore: 0, lives: 0, dizzy: 0.8 }],
    shells: [169],
    goalOpen: [173],
    goalLocked: false,
  },
};

test('spider: in range for 1200 steps', () => {
  const { shots } = simulate(spiderLair(), 1200, () => chickenAt(14));
  pin('spider: in range for 1200 steps', shots, shots.length);
});

test('spider: leaves range and returns', () => {
  const { shots } = simulate(spiderLair(), 900, awayDuring(chickenAt(14), chickenAt(2), [[201, 300]]));
  pin('spider: leaves range and returns', shots, shots.length);
});

test('spider: leaves range mid wind-up and mid volley', () => {
  const { shots } = simulate(spiderLair(), 900, awayDuring(chickenAt(14), chickenAt(2), [[120, 170], [375, 420]]));
  pin('spider: leaves range mid wind-up and mid volley', shots, shots.length);
});

test('spider: stomps', () => {
  const record = simulate(spiderLair(), 1200, () => chickenAt(14), STOMP_STEPS);
  pin('spider: stomps', record, record.shots.length);
});

test('shark: in range for 1200 steps', () => {
  const { shots } = simulate(sharkArena(), 1200, () => chickenAt(14));
  pin('shark: in range for 1200 steps', shots, shots.length);
});

test('shark: chicken overhead', () => {
  const arena = sharkArena();
  const overhead = { x: arena.e.x + 10, y: arena.e.y - arena.e.h - 3 * TILE, h: PLAYER.h, facing: 1, dead: false };
  const { shots } = simulate(arena, 1200, () => overhead);
  assert.ok(shots.every((s) => s.vx === 0 && s.vy < 0), 'every shell goes straight up');
  pin('shark: chicken overhead', shots, shots.length);
});

test('shark: leaves range and returns', () => {
  const { shots } = simulate(sharkArena(), 900, awayDuring(chickenAt(14), chickenAt(30), [[201, 300]]));
  pin('shark: leaves range and returns', shots, shots.length);
});

test('shark: leaves range mid wind-up and mid volley', () => {
  const { shots } = simulate(sharkArena(), 900, awayDuring(chickenAt(14), chickenAt(30), [[150, 200], [435, 470]]));
  pin('shark: leaves range mid wind-up and mid volley', shots, shots.length);
});

test('shark: stomps', () => {
  const record = simulate(sharkArena(), 1200, () => chickenAt(14), STOMP_STEPS);
  pin('shark: stomps', record, record.shots.length);
});

test('shark: fires at a chicken standing right next to it', () => {
  const { shots } = simulate(sharkArena(), 1200, () => chickenAt(8));
  pin('shark: fires at a chicken standing right next to it', shots, shots.length);
});

test('crab: pinches the shark', () => {
  pin('crab: pinches the shark', crabRun());
});

test('crab: pinch lands on a dizzy shark', () => {
  const record = crabRun({ dizzyAt: 143 });
  assert.ok(record.pinches[0].dizzyBefore > 0, 'the shark is still dizzy when the first pinch lands');
  pin('crab: pinch lands on a dizzy shark', record);
});

test('crab: pinch kills a one-life shark', () => {
  const record = crabRun({ lives: 1 });
  assert.equal(record.pinches[0].lives, 0);
  assert.equal(record.goalLocked, false);
  pin('crab: pinch kills a one-life shark', record);
});
