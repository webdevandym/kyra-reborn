import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TILE, STEP, PLAYER, RAIN } from '../src/config.js';
import { createWorld } from '../src/core/world.js';
import { rainPhase } from '../src/core/hazards.js';
import { testLevel } from './helpers.js';

const IDLE = { left: false, right: false, jumpHeld: false, jumpPressed: false };
const RIGHT = { ...IDLE, right: true };

function run(world, input, seconds) {
  const events = [];
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i++) events.push(...world.step(STEP, input));
  return events;
}

const types = (events) => events.map((e) => e.type);

function dropOnto(world, enemy, height = 100) {
  const p = world.player;
  p.x = enemy.x;
  p.y = enemy.y - enemy.h - height;
  p.vy = 0;
  p.onGround = false;
  p.invuln = 0;
}

test('createWorld leaves out crystals that were already collected', () => {
  const level = testLevel(['C.r.r.r..G', '##########']);
  const world = createWorld(level, new Set(['4,10']));
  assert.deepEqual(world.crystals.map((c) => c.id), ['2,10', '6,10']);
  assert.equal(world.enemies.length, 0);
  assert.equal(world.player.x, level.spawn.x);
});

test('walking through a crystal collects it once and emits a crystal event', () => {
  const world = createWorld(testLevel(['C..r.......G', '############']));
  const events = run(world, RIGHT, 1);
  const crystals = events.filter((e) => e.type === 'crystal');
  assert.equal(crystals.length, 1);
  assert.equal(crystals[0].id, '3,10');
  assert.equal(world.crystals.length, 0);
});

test('jumping emits jump then land', () => {
  const world = createWorld(testLevel(['C.........G', '###########']));
  const events = [...world.step(STEP, { ...IDLE, jumpPressed: true, jumpHeld: true }), ...run(world, { ...IDLE, jumpHeld: true }, 1.2)];
  assert.deepEqual(types(events), ['jump', 'land']);
});

test('landing on a carrot defeats it and bounces the chicken up', () => {
  const world = createWorld(testLevel(['C....c.........G', '################']));
  dropOnto(world, world.enemies[0]);
  let stomp = null;
  for (let i = 0; i < 120 && !stomp; i++) stomp = world.step(STEP, IDLE).find((e) => e.type === 'stomp');
  assert.ok(stomp, 'stomped');
  assert.equal(stomp.kind, 'carrot');
  assert.equal(stomp.result, 'defeated');
  assert.equal(world.enemies.length, 0);
  assert.equal(world.player.vy, -PLAYER.stompBounce);
  assert.equal(world.done, false);
});

test('holding jump while stomping bounces higher', () => {
  const world = createWorld(testLevel(['C....c.........G', '################']));
  dropOnto(world, world.enemies[0]);
  for (let i = 0; i < 120 && world.enemies.length; i++) world.step(STEP, { ...IDLE, jumpHeld: true });
  assert.equal(world.player.vy, -PLAYER.stompBounceHeld);
});

test('a big zombie needs two stomps', () => {
  const world = createWorld(testLevel(['C.........Z.................G', '#############################']));
  const zombie = world.enemies[0];
  dropOnto(world, zombie);
  const first = [];
  for (let i = 0; i < 120 && !first.length; i++) first.push(...world.step(STEP, IDLE).filter((e) => e.type === 'stomp'));
  assert.equal(first[0].result, 'shrunk');
  assert.equal(world.enemies.length, 1);
  assert.equal(zombie.size, 'small');

  dropOnto(world, zombie, 30);
  const second = [];
  for (let i = 0; i < 120 && !second.length; i++) second.push(...world.step(STEP, IDLE).filter((e) => e.type === 'stomp'));
  assert.equal(second[0].result, 'defeated');
  assert.equal(world.enemies.length, 0);
});

test('a carrot walking into the chicken after spawn grace is a hit and ends the world', () => {
  const world = createWorld(testLevel(['C..c......G', '###########']));
  const events = run(world, IDLE, 3);
  assert.deepEqual(types(events).filter((t) => t === 'hit'), ['hit']);
  assert.equal(world.done, true);
  assert.equal(world.player.dead, true);
  assert.deepEqual(world.step(STEP, RIGHT), []);
});

test('spawn grace protects the chicken from an early touch', () => {
  const world = createWorld(testLevel(['Cc........G', '###########']));
  const events = run(world, IDLE, PLAYER.spawnGrace * 0.9);
  assert.ok(!types(events).includes('hit'));
  assert.equal(world.player.dead, false);
});

test('landing between two carrots stomps one and the grace ignores the other', () => {
  const level = testLevel(['C....cc........G', '################']);
  const world = createWorld(level);
  const [a, b] = world.enemies;
  const p = world.player;
  p.x = (a.x + b.x) / 2;
  p.y = a.y - a.h - 60;
  p.vy = 0;
  p.onGround = false;
  p.invuln = 0;
  const events = [];
  for (let i = 0; i < 60; i++) events.push(...world.step(STEP, IDLE));
  assert.ok(types(events).includes('stomp'));
  assert.ok(!types(events).includes('hit'));
  assert.equal(p.dead, false);
});

test('touching the green crystal wins the level', () => {
  const world = createWorld(testLevel(['C....G', '######']));
  const events = run(world, RIGHT, 2);
  assert.ok(types(events).includes('goal'));
  assert.equal(world.done, true);
  assert.equal(world.player.won, true);
});

for (const [kind, map] of [
  ['propeller', ['C........p..........G', '#####################']],
  ['bee', ['.........b...........', 'C...................G', '#####################']],
]) {
  test(`landing on a ${kind} from above defeats it and bounces the chicken up`, () => {
    const world = createWorld(testLevel(map));
    dropOnto(world, world.enemies[0], 20);
    let stomp = null;
    for (let i = 0; i < 120 && !stomp; i++) stomp = world.step(STEP, IDLE).find((e) => e.type === 'stomp');
    assert.ok(stomp, 'stomped');
    assert.equal(stomp.kind, kind);
    assert.equal(stomp.result, 'defeated');
    assert.equal(world.enemies.length, 0);
    assert.equal(world.player.vy, -PLAYER.stompBounce);
    assert.equal(world.done, false);
  });
}

test('walking into a propeller carrot from the side is a hit', () => {
  const world = createWorld(testLevel(['C........p..........G', '#####################']));
  world.player.invuln = 0;
  const events = run(world, RIGHT, 3);
  assert.ok(!types(events).includes('stomp'));
  assert.deepEqual(types(events).filter((t) => t === 'hit'), ['hit']);
  assert.equal(world.player.dead, true);
});

test('falling into a gap is a hit, with the feathers at the bottom edge of the screen', () => {
  const world = createWorld(testLevel(['C......G', '##...###']));
  const events = run(world, RIGHT, 3);
  const hits = events.filter((e) => e.type === 'hit');
  assert.equal(hits.length, 1);
  assert.equal(hits[0].y, world.level.height - 30);
  assert.equal(world.done, true);
  assert.equal(world.player.dead, true);
});

test('a chicken standing on a moving cloud is carried with it', () => {
  const world = createWorld(testLevel(['C.........G', '..~~~......', '###########']));
  const [mover] = world.movers;
  const p = world.player;
  p.x = mover.x + mover.w / 2;
  p.y = mover.y;
  p.vy = 0;
  p.onGround = true;
  run(world, IDLE, 0.05);
  assert.equal(p.ride, mover);
  const offset = p.x - mover.x;
  const startX = mover.x;
  run(world, IDLE, 1);
  assert.ok(Math.abs(mover.x - startX) > 10, 'the cloud moved');
  assert.ok(Math.abs(p.x - mover.x - offset) < 0.5, 'the chicken kept its place on the cloud');
  assert.equal(p.y, mover.y);
  assert.equal(p.ride, mover);
});

const PERIOD = RAIN.dry + RAIN.warn + RAIN.rain;
const RAIN_START = RAIN.dry + RAIN.warn;
const RAIN_MAP = [
  '............R.....',
  '..................',
  '..................',
  '..................',
  'C................G',
  '##################',
];

function rainWorld() {
  const world = createWorld(testLevel(RAIN_MAP));
  return { world, cloud: world.rain[0] };
}

function standUnder(world, cloud) {
  world.player.x = cloud.x;
  world.player.invuln = 0;
}

function clockTo(world, cloud, u) {
  world.time = u - cloud.col * RAIN.phasePerCol + PERIOD * 4 - STEP;
}

test('standing under a rain cloud is safe while it is dry or warning, and a hit once the rain reaches the chicken', () => {
  for (const u of [RAIN.dry * 0.5, RAIN.dry + RAIN.warn * 0.5]) {
    const { world, cloud } = rainWorld();
    standUnder(world, cloud);
    clockTo(world, cloud, u);
    assert.ok(!types(world.step(STEP, IDLE)).includes('hit'), `hit at u = ${u}`);
  }
  const { world, cloud } = rainWorld();
  standUnder(world, cloud);
  clockTo(world, cloud, RAIN_START + 0.6);
  assert.deepEqual(types(world.step(STEP, IDLE)).filter((t) => t === 'hit'), ['hit']);
  assert.equal(world.done, true);
});

test('spawn grace and stomp grace protect the chicken from rain', () => {
  const { world, cloud } = rainWorld();
  standUnder(world, cloud);
  world.player.invuln = 0.5;
  clockTo(world, cloud, RAIN_START + 0.6);
  assert.ok(!types(world.step(STEP, IDLE)).includes('hit'));
});

test('each rain cloud announces rainStart once per cycle', () => {
  const { world } = rainWorld();
  const events = run(world, IDLE, PERIOD);
  const starts = events.filter((e) => e.type === 'rainStart');
  assert.equal(starts.length, 1);
  assert.deepEqual(Object.keys(starts[0]).sort(), ['type', 'x', 'y']);
});

test('rain at level start never reaches a chicken at its spawn', () => {
  const { world, cloud } = rainWorld();
  assert.equal(rainPhase(cloud, 0), 'rain');
  assert.ok(!types(run(world, IDLE, PERIOD)).includes('hit'));
});
