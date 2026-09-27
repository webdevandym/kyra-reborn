import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TILE, STEP, PLAYER, RAIN, FIREBALL, SPIDER } from '../src/config.js';
import { createWorld, fireballRect } from '../src/core/world.js';
import { parseLevel } from '../src/core/level.js';
import { bodyRect, overlaps } from '../src/core/rect.js';
import { rainPhase } from '../src/core/hazards.js';
import { testLevel, castleMap } from './helpers.js';

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

test('a star needs two stomps and bounces the chicken both times', () => {
  const world = createWorld(testLevel(['C.........*.................G', '#############################']));
  const star = world.enemies[0];
  dropOnto(world, star);
  const first = [];
  for (let i = 0; i < 120 && !first.length; i++) first.push(...world.step(STEP, IDLE).filter((e) => e.type === 'stomp'));
  assert.equal(first[0].kind, 'star');
  assert.equal(first[0].result, 'hurt');
  assert.equal(world.player.vy, -PLAYER.stompBounce);
  assert.equal(world.enemies.length, 1);
  assert.equal(star.lives, 1);

  dropOnto(world, star, 30);
  const second = [];
  for (let i = 0; i < 120 && !second.length; i++) second.push(...world.step(STEP, IDLE).filter((e) => e.type === 'stomp'));
  assert.equal(second[0].result, 'defeated');
  assert.equal(world.enemies.length, 0);
  assert.equal(world.done, false);
});

const LAIR = ['C.....m.......S.O.#K...c...G', '############################'];
const lair = () => parseLevel({ id: 'lair', theme: 'castle', map: castleMap(LAIR, [18]) });
const FLOOR = 11 * TILE;

function fireballAt(x, height, vx = -FIREBALL.speed) {
  return { x, y: FLOOR - height, vx };
}

function stepUntil(world, input, type, maxSeconds = 10) {
  const events = [];
  for (let i = 0; i < Math.round(maxSeconds / STEP); i++) {
    const batch = world.step(STEP, input);
    events.push(...batch);
    if (batch.some((e) => e.type === type)) return events;
  }
  assert.fail(`no '${type}' event within ${maxSeconds}s`);
}

test('a spider in range fires, and its low fireball flies to a standing chicken and hits it', () => {
  const level = parseLevel({ id: 'lair', theme: 'castle', map: castleMap(['...C..........S.O.#K...c...G', LAIR[1]], [18]) });
  const world = createWorld(level);
  const events = stepUntil(world, IDLE, 'hit');
  const fire = events.find((e) => e.type === 'fire');
  assert.ok(fire, 'the spider fired');
  assert.equal(fire.y, FLOOR - FIREBALL.lowY);
  assert.ok(types(events).indexOf('fire') < types(events).indexOf('hit'));
});

test('a low fireball overlaps a standing chicken; a high one clears it but catches a chicken 30 px up', () => {
  const standing = bodyRect({ x: 100, y: FLOOR, w: PLAYER.w, h: PLAYER.h });
  const hopping = bodyRect({ x: 100, y: FLOOR - 30, w: PLAYER.w, h: PLAYER.h });
  assert.equal(overlaps(standing, fireballRect(fireballAt(100, FIREBALL.lowY))), true);
  assert.equal(overlaps(standing, fireballRect(fireballAt(100, FIREBALL.highY))), false);
  assert.equal(overlaps(hopping, fireballRect(fireballAt(100, FIREBALL.highY))), true);
});

test('a high fireball flies over a standing chicken and vanishes at the level edge', () => {
  const world = createWorld(testLevel(['.....C..........G', '#################']));
  world.player.invuln = 0;
  world.projectiles.push(fireballAt(world.player.x + 3 * TILE, FIREBALL.highY));
  run(world, IDLE, 2);
  assert.equal(world.done, false);
  assert.deepEqual(world.projectiles, []);
});

test('fireballs fly at FIREBALL.speed, pass through enemies and vanish at a wall', () => {
  const world = createWorld(testLevel(['C...#.....c........G', '####################']));
  const carrot = world.enemies[0];
  const ball = fireballAt(carrot.x + TILE, FIREBALL.lowY);
  world.projectiles.push(ball);
  const x = ball.x;
  world.step(STEP, IDLE);
  assert.ok(Math.abs(x - ball.x - FIREBALL.speed * STEP) < 1e-9);
  let minX = ball.x;
  for (let i = 0; i < 240 && world.projectiles.length; i++) {
    world.step(STEP, IDLE);
    if (world.projectiles.length) minX = Math.min(minX, world.projectiles[0].x);
  }
  assert.equal(carrot.alive, true, 'the carrot is not hurt');
  assert.deepEqual(world.projectiles, []);
  assert.ok(minX >= 5 * TILE + FIREBALL.size / 2 - FIREBALL.speed * STEP, `stopped at ${minX}`);
});

test('stomping a rat gives the chicken a shield once, even after a second rat', () => {
  const world = createWorld(testLevel(['C.......m.......m......G', '########################']));
  const [first, second] = world.enemies;
  dropOnto(world, first);
  const one = stepUntil(world, IDLE, 'stomp');
  assert.deepEqual(types(one).filter((t) => t === 'shieldUp'), ['shieldUp']);
  assert.equal(world.player.shield, true);
  run(world, IDLE, 1);
  dropOnto(world, second);
  const two = stepUntil(world, IDLE, 'stomp');
  assert.equal(types(two).includes('shieldUp'), false);
  assert.equal(world.player.shield, true);
});

test('a shield takes one fireball: it pops, the chicken lives and gets stomp grace; the next fireball hits', () => {
  const world = createWorld(testLevel(['C...............G', '#################']));
  const p = world.player;
  p.shield = true;
  p.invuln = 0;
  world.projectiles.push(fireballAt(p.x + 20, FIREBALL.lowY));
  const events = world.step(STEP, IDLE);
  assert.deepEqual(types(events), ['shieldPop']);
  assert.equal(p.shield, false);
  assert.equal(p.invuln, PLAYER.stompGrace);
  assert.equal(world.done, false);
  assert.deepEqual(world.projectiles, []);
  run(world, IDLE, PLAYER.stompGrace + STEP);
  world.projectiles.push(fireballAt(p.x + 20, FIREBALL.lowY));
  assert.deepEqual(types(world.step(STEP, IDLE)), ['hit']);
});

test('the shield does not help against walking into an enemy', () => {
  const world = createWorld(testLevel(['C.....c.........G', '#################']));
  world.player.shield = true;
  world.player.invuln = 0;
  assert.ok(types(run(world, RIGHT, 2)).includes('hit'));
});

test('two fireballs reaching a shielded chicken in the same step pop the shield once and do not kill', () => {
  const world = createWorld(testLevel(['C...............G', '#################']));
  const p = world.player;
  p.shield = true;
  p.invuln = 0;
  world.projectiles.push(fireballAt(p.x + 20, FIREBALL.lowY), fireballAt(p.x + 24, FIREBALL.lowY));
  assert.deepEqual(types(world.step(STEP, IDLE)), ['shieldPop']);
  assert.equal(world.done, false);
  assert.equal(p.shield, false);
});

test('a chicken behind the spider is shot at toward the wall, and those shots vanish at the wall', () => {
  const level = parseLevel({ id: 'lair', theme: 'castle', map: castleMap(['C.............S...O.....#K..G', '#############################'], [24]) });
  const world = createWorld(level);
  const spider = world.enemies[0];
  const p = world.player;
  p.x = spider.x + (SPIDER.minRange + 0.5) * TILE;
  p.invuln = 99;
  stepUntil(world, IDLE, 'fire');
  assert.equal(spider.dir, 1, 'it turned to face the chicken');
  const [ball] = world.projectiles;
  assert.ok(ball.vx > 0);
  let maxX = ball.x;
  for (let i = 0; i < 360 && world.projectiles.includes(ball); i++) {
    world.step(STEP, IDLE);
    maxX = Math.max(maxX, ball.x);
  }
  assert.equal(world.projectiles.includes(ball), false, 'the shot vanished');
  assert.ok(maxX + FIREBALL.size / 2 <= 24 * TILE + FIREBALL.speed * STEP, `it reached x ${maxX}, the wall starts at ${24 * TILE}`);
});

test('stomping the spider opens the portal once', () => {
  const world = createWorld(lair());
  const spider = world.enemies.find((e) => e.kind === 'spider');
  dropOnto(world, spider);
  const events = stepUntil(world, IDLE, 'stomp');
  const open = events.find((e) => e.type === 'portalOpen');
  assert.ok(open);
  assert.deepEqual({ x: open.x, y: open.y }, { x: 16.5 * TILE, y: FLOOR });
  assert.equal(world.portal.open, true);
  assert.equal(world.portal.openedAt, world.time);
});

test('a closed portal does nothing, and an open one moves the chicken to the checkpoint', () => {
  const world = createWorld(lair());
  const p = world.player;
  p.x = world.portal.x;
  p.invuln = 0;
  world.enemies = [];
  assert.equal(types(world.step(STEP, IDLE)).includes('portal'), false);
  world.portal.open = true;
  world.projectiles.push(fireballAt(p.x - 4 * TILE, FIREBALL.highY));
  const events = world.step(STEP, IDLE);
  const portal = events.find((e) => e.type === 'portal');
  assert.ok(portal);
  assert.deepEqual(portal.to, { x: 19.5 * TILE, y: FLOOR });
  assert.equal(portal.from.x, 16.5 * TILE);
  assert.equal(p.x, 19.5 * TILE);
  assert.equal(p.y, FLOOR);
  assert.equal(p.vx, 0);
  assert.equal(p.vy, 0);
  assert.equal(p.invuln, PLAYER.spawnGrace);
  assert.deepEqual(world.projectiles, []);
  assert.equal(world.checkpointReached, true);
});

test('createWorld with a start places the chicken there with only that room\'s enemies', () => {
  const level = lair();
  const fresh = createWorld(level);
  assert.equal(fresh.checkpointReached, false);
  assert.deepEqual(fresh.enemies.map((e) => e.kind), ['rat', 'spider', 'carrot']);
  assert.equal(fresh.portal.open, false);
  const world = createWorld(level, new Set(), { start: level.checkpoint });
  assert.equal(world.player.x, level.checkpoint.x);
  assert.equal(world.player.y, level.checkpoint.y);
  assert.deepEqual(world.enemies.map((e) => e.kind), ['carrot']);
  assert.equal(world.checkpointReached, true);
});

test('a level without a portal has no portal in its world', () => {
  assert.equal(createWorld(testLevel(['C...G', '#####'])).portal, null);
});
