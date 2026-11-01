import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TILE, STEP, PLAYER, SNAKE, CONE, RABBIT, DEER } from '../src/config.js';
import { aim8 } from '../src/core/aim.js';
import { createEnemy, updateEnemy, stompEnemy } from '../src/core/enemies.js';
import { PROJECTILES } from '../src/core/projectiles.js';
import { createWorld, projectileRect } from '../src/core/world.js';
import { parseLevel } from '../src/core/level.js';
import { testLevel, castleMap, runSteps, near, types } from './helpers.js';

const SQ = Math.SQRT1_2;
const IDLE = { left: false, right: false, jumpHeld: false, jumpPressed: false };
const DIRS = {
  E: { dx: 1, dy: 0 },
  SE: { dx: SQ, dy: SQ },
  S: { dx: 0, dy: 1 },
  SW: { dx: -SQ, dy: SQ },
  W: { dx: -1, dy: 0 },
  NW: { dx: -SQ, dy: -SQ },
  N: { dx: 0, dy: -1 },
  NE: { dx: SQ, dy: -SQ },
};

const ARENA = 'C' + '.'.repeat(30) + 'G';
const groundLevel = () => testLevel([ARENA, '#'.repeat(ARENA.length)]);
const openLevel = () => testLevel([ARENA]);

function twoRoomLevel() {
  const row = 'C' + '.'.repeat(38) + 'G';
  return parseLevel({ id: 'two-rooms', map: castleMap([row, '#'.repeat(row.length)], [24]) });
}

const snakeAt = (col, row, extra = {}) => createEnemy({ kind: 'snake', x: (col + 0.5) * TILE, y: (row + 1) * TILE, ...extra });
const chickenAt = (col, row) => ({ x: (col + 0.5) * TILE, y: (row + 1) * TILE, h: PLAYER.h, facing: 1, dead: false });
const chickenCentredAt = (x, centreY) => ({ x, y: centreY + PLAYER.h / 2, h: PLAYER.h, facing: 1, dead: false });
const bodyCentreY = (e) => e.y - e.h / 2;

function shotsOver(e, level, steps, player) {
  const shots = [];
  for (let step = 1; step <= steps; step++) {
    const shot = updateEnemy(e, STEP, level, player);
    if (shot) shots.push({ step, shot });
  }
  return shots;
}

function firstShot(e, level, player, limit = 2 * Math.round(SNAKE.fireEvery / STEP)) {
  for (let step = 1; step <= limit; step++) {
    const shot = updateEnemy(e, STEP, level, player);
    if (shot) return shot;
  }
  return null;
}

function flyCone(cone, level, limit = 3000) {
  let aliveX = cone.x;
  let aliveY = cone.y;
  for (let step = 0; step < limit; step++) {
    if (!PROJECTILES.cone.move(cone, STEP, level, [])) return { removed: true, aliveX, aliveY };
    aliveX = cone.x;
    aliveY = cone.y;
  }
  return { removed: false, aliveX, aliveY };
}

const byAngle = (deg) => {
  const r = (deg * Math.PI) / 180;
  return aim8(50, 80, 50 + 30 * Math.cos(r), 80 + 30 * Math.sin(r));
};

test('aim8 picks the nearest of eight directions', () => {
  const axes = [
    [10, 0, 'E'],
    [10, 10, 'SE'],
    [0, 10, 'S'],
    [-10, 10, 'SW'],
    [-10, 0, 'W'],
    [-10, -10, 'NW'],
    [0, -10, 'N'],
    [10, -10, 'NE'],
  ];
  for (const [x, y, name] of axes) assert.deepEqual(aim8(100, 200, 100 + x, 200 + y), DIRS[name], name);

  const rounding = [
    [22, 'E'], [23, 'SE'], [67, 'SE'], [68, 'S'],
    [112, 'S'], [113, 'SW'], [157, 'SW'], [158, 'W'],
    [-22, 'E'], [-23, 'NE'], [-67, 'NE'], [-68, 'N'],
    [-112, 'N'], [-113, 'NW'], [-157, 'NW'], [-158, 'W'],
    [190, 'W'], [15, 'E'], [30, 'SE'], [75, 'S'], [-30, 'NE'], [-100, 'N'],
  ];
  for (const [deg, name] of rounding) {
    const got = byAngle(deg);
    assert.ok(near(got.dx, DIRS[name].dx) && near(got.dy, DIRS[name].dy), `${deg} degrees gave ${JSON.stringify(got)}, wanted ${name}`);
  }
});

test('aim8 on the same spot keeps the face-right default', () => {
  assert.deepEqual(aim8(5, 5, 5, 5), { dx: 1, dy: 0 });
  assert.deepEqual(aim8(0, 0, 0, 0), { dx: 1, dy: 0 });
});

test('aim8 returns a unit vector and a fresh object on every call', () => {
  for (let deg = 0; deg < 360; deg += 7) {
    const v = byAngle(deg);
    assert.ok(near(Math.hypot(v.dx, v.dy), 1), `${deg} degrees gave length ${Math.hypot(v.dx, v.dy)}`);
  }
  const a = aim8(0, 0, 10, 0);
  a.dx = 99;
  assert.deepEqual(aim8(0, 0, 10, 0), { dx: 1, dy: 0 });
});

test('PROJECTILES.cone reports the cone event and the cone size', () => {
  assert.equal(PROJECTILES.cone.event, 'cone');
  assert.equal(PROJECTILES.cone.size, CONE.size);
});

test('a cone leaves the map and is removed', () => {
  const level = openLevel();
  const margin = CONE.speed * STEP + 1e-9;

  const up = { kind: 'cone', x: 15.5 * TILE, y: 5 * TILE, vx: 0, vy: -CONE.speed };
  const upFlight = flyCone(up, level);
  assert.ok(upFlight.removed, 'a cone flying up is removed');
  assert.ok(up.y < -TILE && upFlight.aliveY >= -TILE && upFlight.aliveY < -TILE + margin, `up: removed at y ${up.y}, last seen at ${upFlight.aliveY}`);

  const down = { kind: 'cone', x: 15.5 * TILE, y: 10 * TILE, vx: 0, vy: CONE.speed };
  const downFlight = flyCone(down, level);
  assert.ok(downFlight.removed, 'a cone flying down into a pit is removed');
  assert.ok(down.y > level.height + TILE && downFlight.aliveY <= level.height + TILE, `down: removed at y ${down.y}, last seen at ${downFlight.aliveY}`);

  const slant = { kind: 'cone', x: 5 * TILE, y: 5 * TILE, vx: SQ * CONE.speed, vy: -SQ * CONE.speed };
  assert.ok(flyCone(slant, level).removed, 'a cone flying up and right is removed');
  assert.ok(slant.y < -TILE);

  const east = { kind: 'cone', x: 5 * TILE, y: 5 * TILE, vx: CONE.speed, vy: 0 };
  assert.ok(flyCone(east, level).removed, 'a cone flying sideways is removed at the map edge');
  assert.ok(east.x <= level.width);
});

test('a cone stops at a solid tile', () => {
  const row = 'C........#.....G';
  const level = testLevel([row, '#'.repeat(row.length)]);
  const half = CONE.size / 2;

  const east = { kind: 'cone', x: 5 * TILE, y: 10.5 * TILE, vx: CONE.speed, vy: 0 };
  assert.ok(flyCone(east, level).removed, 'the wall stops a cone flying east');
  assert.ok(east.x + half >= 9 * TILE, `stopped short of the wall at x ${east.x}`);
  assert.ok(east.x + half - CONE.speed * STEP < 9 * TILE, `flew into the wall to x ${east.x}`);

  const slant = { kind: 'cone', x: 5 * TILE, y: 9 * TILE, vx: SQ * CONE.speed, vy: SQ * CONE.speed };
  assert.ok(flyCone(slant, level).removed, 'the ground stops a cone flying down and right');
  assert.ok(slant.y + SQ * half >= 11 * TILE, `stopped above the ground at y ${slant.y}`);
  assert.ok(slant.y + SQ * half - SQ * CONE.speed * STEP < 11 * TILE, `sank into the ground to y ${slant.y}`);

  const clear = { kind: 'cone', x: 5 * TILE, y: 5 * TILE, vx: CONE.speed, vy: 0 };
  runSteps(100, () => assert.ok(PROJECTILES.cone.move(clear, STEP, level, []), 'a cone in open air keeps flying'));
});

test('a snake dies in one stomp', () => {
  for (const fly of [false, true]) {
    const e = snakeAt(10, 10, { fly });
    assert.equal(e.lives, SNAKE.lives);
    assert.equal(e.lives, 1);
    assert.equal(stompEnemy(e), 'defeated', `fly ${fly}`);
    assert.equal(e.alive, false);
  }
  const level = groundLevel();
  const winding = snakeAt(10, 10);
  runSteps(Math.round((SNAKE.fireEvery - SNAKE.windup / 2) / STEP), () => updateEnemy(winding, STEP, level, chickenAt(14, 10)));
  assert.equal(winding.winding, true, 'the snake is mid wind-up');
  assert.equal(stompEnemy(winding), 'defeated');
});

test('a walking snake sits on the ground and never moves', () => {
  const level = groundLevel();
  const e = snakeAt(10, 10);
  assert.equal(e.w, SNAKE.w);
  assert.equal(e.h, SNAKE.h);
  assert.equal(e.fly, false);
  runSteps(600, (i) => {
    updateEnemy(e, STEP, level, chickenAt(4 + (i % 12), 10));
    assert.equal(e.x, 10.5 * TILE);
    assert.equal(e.y, 11 * TILE);
  });
});

test('a flying snake hovers above the ground and bobs', () => {
  const level = groundLevel();
  const spec = { kind: 'snake', x: 10.5 * TILE, y: 11 * TILE, fly: true };
  const e = createEnemy(spec);
  const homeY = spec.y - TILE / 2 - SNAKE.lift;
  assert.equal(e.fly, true);
  assert.equal(e.w, SNAKE.w);
  assert.equal(e.h, SNAKE.h);

  const period = Math.round(SNAKE.bobPeriod / STEP);
  const startY = e.y;
  let low = Infinity;
  let high = -Infinity;
  runSteps(2 * period, (i) => {
    const before = e.y;
    updateEnemy(e, STEP, level, chickenAt(14, 10));
    assert.equal(e.prevBottom, before, 'the hitbox bottom of the last step is kept for stomp checks');
    assert.equal(e.x, spec.x, 'a flying snake stays above its post');
    assert.ok(e.y < spec.y - TILE / 2, `feet ${e.y} are not above the ground`);
    low = Math.min(low, bodyCentreY(e));
    high = Math.max(high, bodyCentreY(e));
    if (i === period - 1) assert.ok(near(e.y, startY, 1e-6), 'one bob period brings it back');
  });
  assert.ok(near(low, homeY - SNAKE.bob, 0.5), `lowest centre ${low}`);
  assert.ok(near(high, homeY + SNAKE.bob, 0.5), `highest centre ${high}`);
});

test('a chicken landing on a bobbing flying snake stomps and defeats it', () => {
  for (const delay of [0, 40, 80, 120, 160]) {
    const world = createWorld(groundLevel());
    const snake = createEnemy({ kind: 'snake', x: 10.5 * TILE, y: 11 * TILE, fly: true });
    world.enemies.push(snake);
    runSteps(delay, () => updateEnemy(snake, STEP, world.level, null));
    Object.assign(world.player, { x: snake.x, y: snake.y - snake.h - 40, vx: 0, vy: 0, onGround: false, prevBottom: snake.y - snake.h - 40, invuln: 0 });
    const events = [];
    runSteps(120, () => events.push(...world.step(STEP, IDLE)));
    const stomp = events.find((ev) => ev.type === 'stomp');
    assert.ok(stomp, `delay ${delay}: the chicken did not stomp (${types(events)})`);
    assert.equal(stomp.kind, 'snake');
    assert.equal(stomp.result, 'defeated');
    assert.equal(world.enemies.includes(snake), false);
  }
});

test('a rabbit is one stomp, a deer two', () => {
  const rabbit = createEnemy({ kind: 'rabbit', x: 100, y: 450 });
  assert.equal(rabbit.w, RABBIT.w);
  assert.equal(rabbit.h, RABBIT.h);
  assert.equal(rabbit.speed, RABBIT.speed);
  assert.equal(stompEnemy(rabbit), 'defeated');
  assert.equal(rabbit.alive, false);

  const deer = createEnemy({ kind: 'deer', x: 100, y: 450 });
  assert.equal(deer.w, DEER.w);
  assert.equal(deer.h, DEER.h);
  assert.equal(deer.speed, DEER.speed);
  assert.equal(deer.lives, 2);
  assert.equal(stompEnemy(deer), 'hurt');
  assert.equal(deer.alive, true);
  assert.equal(deer.lives, 1);
  assert.equal(deer.dizzy, DEER.dizzyTime);
  assert.equal(deer.speed, DEER.hurtSpeed);
  assert.equal(stompEnemy(deer), 'defeated');
  assert.equal(deer.alive, false);
});

for (const [kind, cfg] of [['rabbit', RABBIT], ['deer', DEER]]) {
  test(`a ${kind} walks left at its own speed and never walks off a ledge`, () => {
    const level = testLevel(['C...c.....G', '...###.....', '###########']);
    const e = createEnemy({ kind, x: level.enemies[0].x, y: level.enemies[0].y });
    updateEnemy(e, STEP, level);
    assert.equal(e.vx, -cfg.speed);
    let minX = e.x;
    let maxX = e.x;
    runSteps(30 * 120, () => {
      updateEnemy(e, STEP, level);
      minX = Math.min(minX, e.x);
      maxX = Math.max(maxX, e.x);
    });
    assert.ok(minX >= 3 * TILE - e.w / 2, `minX ${minX}`);
    assert.ok(maxX <= 6 * TILE + e.w / 2, `maxX ${maxX}`);
    assert.equal(e.y, 10 * TILE, 'still on top of the block');
  });
}

test('a snake throws a cone from its muzzle in the aim direction at cone speed', () => {
  const level = openLevel();
  const reach = 3 * TILE;
  const offsets = { E: [1, 0], SE: [1, 1], S: [0, 1], SW: [-1, 1], W: [-1, 0], NW: [-1, -1], N: [0, -1], NE: [1, -1] };
  for (const [name, [sx, sy]] of Object.entries(offsets)) {
    for (const fly of [false, true]) {
      const e = snakeAt(15, 6, { fly });
      const player = chickenCentredAt(e.x + sx * reach, bodyCentreY(e) + sy * reach);
      const shot = firstShot(e, level, player);
      assert.ok(shot, `${name} fly ${fly}: no cone`);
      assert.equal(shot.kind, 'cone');
      assert.ok(near(shot.vx, DIRS[name].dx * CONE.speed, 1e-6), `${name} fly ${fly}: vx ${shot.vx}`);
      assert.ok(near(shot.vy, DIRS[name].dy * CONE.speed, 1e-6), `${name} fly ${fly}: vy ${shot.vy}`);
      const offX = shot.x - e.x;
      const offY = shot.y - bodyCentreY(e);
      assert.ok(offX * DIRS[name].dx + offY * DIRS[name].dy > 0, `${name} fly ${fly}: the cone starts behind the snake`);
      assert.ok(near(offX * DIRS[name].dy - offY * DIRS[name].dx, 0, 1e-6), `${name} fly ${fly}: the cone starts off the aim line`);
    }
  }
});

test('a snake shoots only inside its range and room', () => {
  const level = twoRoomLevel();
  const fires = (snake, player) => shotsOver(snake, level, 600, player).length > 0;
  const centre = bodyCentreY(snakeAt(10, 10));

  assert.ok(fires(snakeAt(10, 10), chickenAt(14, 10)), 'a chicken in reach is shot at');
  assert.ok(fires(snakeAt(10, 10), chickenAt(22, 10)), 'exactly the maximum horizontal reach is inside');
  assert.equal(fires(snakeAt(10, 10), chickenAt(23, 10)), false, 'one tile past the maximum horizontal reach is outside');
  assert.equal(SNAKE.maxRange, 12);

  assert.ok(fires(snakeAt(21, 10), chickenAt(23, 10)), 'the last column of the room is inside');
  assert.equal(fires(snakeAt(21, 10), chickenAt(27, 10)), false, 'a chicken in the next room is out of reach however close');
  assert.equal(fires(snakeAt(27, 10), chickenAt(23, 10)), false, 'and the other way round');

  assert.ok(fires(snakeAt(10, 10), chickenCentredAt(14.5 * TILE, centre - 8 * TILE)), 'exactly eight tiles above is inside');
  assert.ok(fires(snakeAt(10, 10), chickenCentredAt(14.5 * TILE, centre + 8 * TILE)), 'exactly eight tiles below is inside');
  assert.equal(fires(snakeAt(10, 10), chickenCentredAt(14.5 * TILE, centre - 8 * TILE - 1)), false, 'above eight tiles is outside');
  assert.equal(fires(snakeAt(10, 10), chickenCentredAt(14.5 * TILE, centre + 8 * TILE + 1)), false, 'below eight tiles is outside');

  assert.equal(fires(snakeAt(10, 10), { ...chickenAt(14, 10), dead: true }), false, 'a dead chicken is left alone');
  assert.equal(fires(snakeAt(10, 10), null), false, 'no chicken, no cone');
});

test('a snake stays silent while its chicken is out of range and fires again when she returns', () => {
  const level = twoRoomLevel();
  const e = snakeAt(10, 10);
  const near14 = chickenAt(14, 10);
  const far = chickenAt(30, 10);
  const shots = [];
  for (let step = 1; step <= 600; step++) {
    const shot = updateEnemy(e, STEP, level, step >= 100 && step < 400 ? far : near14);
    if (shot) shots.push(step);
  }
  assert.ok(shots.every((step) => step < 100 || step >= 400), `fired while she was away: ${shots}`);
  assert.ok(shots.some((step) => step >= 400), 'fires again when she returns');
});

test('a world adds the snake cone as a projectile and a cone event, and the cone flies at the chicken', () => {
  const world = createWorld(groundLevel());
  world.enemies.push(snakeAt(10, 10));
  Object.assign(world.player, { x: 14.5 * TILE, y: 11 * TILE, onGround: true, invuln: 99 });
  let cone = null;
  let eventsSeen = [];
  for (let i = 0; i < 400 && !cone; i++) {
    const events = world.step(STEP, IDLE);
    if (events.some((ev) => ev.type === 'cone')) {
      eventsSeen = types(events);
      cone = world.projectiles.find((f) => f.kind === 'cone');
    }
  }
  assert.ok(cone, 'the world never produced a cone');
  assert.deepEqual(eventsSeen.filter((t) => t === 'cone'), ['cone']);
  assert.ok(cone.vx > 0, 'the cone flies east, towards the chicken');
  const rect = projectileRect(cone);
  assert.ok(near(rect.right - rect.left, CONE.size, 1e-6));
  const x = cone.x;
  world.step(STEP, IDLE);
  assert.ok(cone.x > x, 'the world moves the cone every step');
});
