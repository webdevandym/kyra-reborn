import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TILE, STEP, SHARK, SHELL, BUBBLE, CRAB, LIFT, DOLPHIN, FISH } from '../src/config.js';
import { createWorld } from '../src/core/world.js';
import { createEnemy, updateEnemy, stompEnemy } from '../src/core/enemies.js';
import { createMover, updateMovers } from '../src/core/platforms.js';
import { createGame } from '../src/core/game.js';
import { testLevel, mapFromBottom } from './helpers.js';

const IDLE = { left: false, right: false, jumpHeld: false, jumpPressed: false };

const sea = (rows) => testLevel(rows, { theme: 'sea' });

function run(world, seconds, { safe = false } = {}) {
  const events = [];
  for (let i = 0; i < Math.round(seconds / STEP); i++) {
    if (safe) world.player.invuln = 99;
    events.push(...world.step(STEP, IDLE));
  }
  return events;
}

const types = (events) => events.map((e) => e.type);

function placePlayer(world, x, y, extra = {}) {
  Object.assign(world.player, { x, y, vx: 0, vy: 0, onGround: true, invuln: 0 }, extra);
}

test('a sea level needs a shark', () => {
  assert.throws(() => sea(['C.......G', '#########']), /needs a shark/);
});

test('d and f over ground walk, over open water they swim', () => {
  const walking = sea(['C.d...f..GH.', '############']);
  assert.deepEqual(walking.enemies.filter((e) => e.kind !== 'shark').map((e) => [e.kind, e.swim]), [['dolphin', false], ['fish', false]]);
  const floating = sea(['C..d..f...HG', '............', '###..#######']);
  assert.deepEqual(floating.enemies.filter((e) => e.kind !== 'shark').map((e) => [e.kind, e.swim]), [['dolphin', true], ['fish', true]]);
});

test('o is a bubble, T a turquoise crystal, P a pearl and each V run one lift', () => {
  const level = sea(['C.o.T.P.HG', '..VV......', '##########']);
  assert.deepEqual(level.bubbles.map((b) => b.id), ['2,9']);
  assert.deepEqual(level.teals.map((t) => t.id), ['4,9']);
  assert.deepEqual(level.pearls.map((p) => [p.id, p.x, p.y]), [['6,9', 6.5 * TILE, 10 * TILE]]);
  assert.deepEqual(level.movers.map((m) => [m.axis, m.width / TILE]), [['y', 2]]);
  assert.throws(() => sea(['C.V.....HG', '##########']), /lift at 2,10 must be 2–4 tiles/);
});

test('a lift swings range tiles up and down, and carries the chicken with it', () => {
  const lift = createMover({ id: '4,8', col: 0, axis: 'y', width: 2 * TILE, x: 4 * TILE, y: 8 * TILE });
  const ys = [];
  for (let t = 0; t < LIFT.period; t += 0.05) {
    updateMovers([lift], t);
    ys.push(lift.y);
    assert.equal(lift.x, 4 * TILE);
  }
  assert.ok(Math.max(...ys) > 8 * TILE + 0.95 * LIFT.range * TILE);
  assert.ok(Math.min(...ys) < 8 * TILE - 0.95 * LIFT.range * TILE);

  const world = createWorld(testLevel(['.....HG.', '........', '........', '...VV...', '........', '........', 'C.......', '########'], { theme: 'sea' }));
  const m = world.movers[0];
  placePlayer(world, m.x + TILE, m.y, { invuln: 99, ride: m });
  run(world, 0.1, { safe: true });
  assert.ok(world.player.onGround && world.player.ride === m);
  for (let i = 0; i < 400; i++) {
    world.step(STEP, IDLE);
    assert.ok(Math.abs(world.player.y - m.y) < 1, `the chicken stays on the lift (${world.player.y} vs ${m.y})`);
  }
});

test('a dolphin on the floor has two lives, speeds up when hurt and never throws', () => {
  const level = sea(['C....d....HG', '############']);
  const dolphin = createEnemy(level.enemies[0]);
  assert.equal(dolphin.lives, 2);
  const player = { x: dolphin.x - 3 * TILE, y: dolphin.y, dead: false };
  for (let i = 0; i < 600; i++) assert.equal(updateEnemy(dolphin, STEP, level, player), null);
  assert.equal(stompEnemy(dolphin), 'hurt');
  assert.equal(dolphin.speed, DOLPHIN.hurtSpeed);
  assert.equal(stompEnemy(dolphin), 'defeated');
});

test('a swimming dolphin and fish bob in open water and never sink to the floor', () => {
  const level = sea(['C...d..f..HG', '............', '............', '############']);
  const [dolphin, fish] = level.enemies.slice(0, 2).map(createEnemy);
  assert.equal(dolphin.swim, true);
  const floor = 12 * TILE;
  for (let i = 0; i < 1200; i++) {
    updateEnemy(dolphin, STEP, level);
    updateEnemy(fish, STEP, level);
    assert.ok(dolphin.y < floor && fish.y < floor);
  }
});

test('a fish has one life and is faster than a rat', () => {
  const level = sea(['C....f....HG', '############']);
  const fish = createEnemy(level.enemies[0]);
  assert.ok(FISH.speed > 120);
  assert.equal(stompEnemy(fish), 'defeated');
});

const arena = () => sea(['C......H.........G', '##################']);

test('a shark has three lives and stands still; each stomp makes it dizzy and throws the chicken back', () => {
  const world = createWorld(arena());
  const shark = world.enemies[0];
  assert.equal(shark.lives, SHARK.lives);
  const x = shark.x;
  placePlayer(world, shark.x - 20, shark.y - shark.h - 60, { vy: 200, onGround: false });
  const stomp = run(world, 0.2).find((e) => e.type === 'stomp');
  assert.equal(stomp.kind, 'shark');
  assert.equal(stomp.result, 'hurt');
  assert.equal(shark.lives, SHARK.lives - 1);
  assert.ok(shark.dizzy > 0);
  assert.equal(shark.x, x);
  assert.notEqual(world.player.vx, 0);
});

test('a shark fires volleys of 2, 3 and 4 shells at the chicken, low and high in turn, and nothing while dizzy', () => {
  const world = createWorld(arena());
  const shark = world.enemies[0];
  placePlayer(world, shark.x - 8 * TILE, shark.y, { invuln: 99 });
  const shots = [];
  for (let i = 0; i < Math.round(9 / STEP); i++) {
    world.player.invuln = 99;
    const seen = world.projectiles.length;
    world.step(STEP, IDLE);
    for (const shell of world.projectiles.slice(seen)) shots.push({ t: world.time, y: shell.y, vx: shell.vx });
  }
  const volleys = [];
  for (const s of shots) {
    const last = volleys[volleys.length - 1];
    if (last && s.t - last[last.length - 1].t < SHARK.fireEvery * 0.6) last.push(s);
    else volleys.push([s]);
  }
  assert.deepEqual(volleys.slice(0, 3).map((v) => v.length), [2, 3, 4]);
  assert.notEqual(volleys[0][0].y, volleys[1][0].y);
  assert.ok(shots.every((s) => s.vx < 0), 'the shells fly toward the chicken');
  shark.dizzy = 5;
  world.projectiles = [];
  run(world, 2, { safe: true });
  assert.equal(world.projectiles.length, 0);
});

test('a shark shoots straight up when the chicken is above it', () => {
  const world = createWorld(arena());
  const shark = world.enemies[0];
  shark.cooldown = 0.01;
  let shell = null;
  for (let i = 0; i < 20 && !shell; i++) {
    placePlayer(world, shark.x + 10, shark.y - shark.h - 3 * TILE, { onGround: false, invuln: 99 });
    world.step(STEP, IDLE);
    shell = world.projectiles[0];
  }
  assert.ok(shell, 'fired');
  assert.equal(shell.vx, 0);
  assert.ok(shell.vy < 0);
});

test('a shell that hits a wall or leaves the top of the level disappears', () => {
  const world = createWorld(sea(['C..H.#....G', '###########']));
  world.projectiles.push({ kind: 'shell', x: 5.2 * TILE, y: 10 * TILE, vx: -SHELL.speed, vy: 0 });
  world.projectiles.push({ kind: 'shell', x: 8 * TILE, y: 10 * TILE, vx: 0, vy: -SHELL.speed });
  placePlayer(world, 0.5 * TILE, 11 * TILE, { invuln: 99 });
  run(world, 2, { safe: true });
  assert.equal(world.projectiles.filter((p) => p.y < 10 * TILE && p.vy < 0).length, 0);
  assert.equal(world.projectiles.filter((p) => p.vx < 0 && p.x > 5 * TILE).length, 0);
});

test('the finish stays locked until every shark is gone, then goalOpen fires once', () => {
  const world = createWorld(sea(['C...H...H..G', '############']));
  assert.equal(world.goal.locked, true);
  const [a, b] = world.enemies;
  placePlayer(world, world.goal.x, world.goal.y, { invuln: 99 });
  run(world, 0.1, { safe: true });
  assert.equal(world.done, false);

  a.lives = 1;
  placePlayer(world, a.x, a.y - a.h - 40, { vy: 300, onGround: false });
  let events = run(world, 0.3);
  assert.ok(events.some((e) => e.type === 'stomp' && e.result === 'defeated'));
  assert.equal(world.goal.locked, true);
  assert.ok(!types(events).includes('goalOpen'));

  b.lives = 1;
  placePlayer(world, b.x, b.y - b.h - 40, { vy: 300, onGround: false });
  events = run(world, 0.3);
  assert.equal(types(events).filter((t) => t === 'goalOpen').length, 1);
  assert.equal(world.goal.locked, false);
  placePlayer(world, world.goal.x, world.goal.y, { invuln: 99 });
  run(world, 0.1, { safe: true });
  assert.equal(world.done, true);
});

test('a turquoise crystal gives a shield that absorbs one touch from any enemy', () => {
  const level = sea(['C.T.......f.H...G', '#################']);
  const world = createWorld(level);
  placePlayer(world, level.teals[0].x, level.teals[0].y + 20);
  const events = run(world, 0.05);
  assert.ok(types(events).includes('shieldUp'));
  assert.equal(world.player.shield, true);
  assert.equal(world.teals.length, 0);

  const fish = world.enemies.find((e) => e.kind === 'fish');
  placePlayer(world, fish.x, fish.y);
  const popped = run(world, 0.05);
  assert.ok(types(popped).includes('shieldPop'));
  assert.equal(world.player.dead, false);
  assert.equal(world.player.shield, false);
  assert.ok(world.player.invuln > 0.5);

  placePlayer(world, fish.x, fish.y);
  assert.ok(types(run(world, 0.05)).includes('hit'));
});

test('the castle shield still does not stop an enemy touch', () => {
  const world = createWorld(testLevel(['C........G', '##########']));
  world.enemies.push(createEnemy({ kind: 'carrot', x: 3 * TILE, y: 11 * TILE }));
  placePlayer(world, 3 * TILE, 11 * TILE);
  world.player.shield = true;
  assert.ok(types(run(world, 0.05)).includes('hit'));
});

test('a shell is stopped by a shield and costs a life without one', () => {
  const world = createWorld(arena());
  placePlayer(world, 3 * TILE, 11 * TILE);
  Object.assign(world.player, { shield: true, shieldAll: true });
  world.projectiles.push({ kind: 'shell', x: 3 * TILE, y: 11 * TILE - 20, vx: -SHELL.speed, vy: 0 });
  assert.ok(types(run(world, 0.05)).includes('shieldPop'));
  assert.equal(world.player.dead, false);
  placePlayer(world, 3 * TILE, 11 * TILE);
  world.projectiles.push({ kind: 'shell', x: 3 * TILE, y: 11 * TILE - 20, vx: -SHELL.speed, vy: 0 });
  assert.ok(types(run(world, 0.05)).includes('hit'));
});

test('a bubble that drifts over a crystal carries it off; touching the bubble returns the crystal and gives a parachute', () => {
  const world = createWorld(sea(['C.........o..r..H..G', '####################']));
  const [bubble] = world.bubbles;
  const events = run(world, 5, { safe: true });
  assert.ok(types(events).includes('bubbleGrab'));
  assert.equal(world.crystals.length, 0);
  assert.ok(bubble.carry);

  placePlayer(world, bubble.x, bubble.y + 20, { onGround: false, invuln: 99 });
  const touched = run(world, 0.02, { safe: true });
  const crystal = touched.find((e) => e.type === 'crystal');
  assert.equal(crystal?.id, '13,10');
  assert.ok(types(touched).includes('bubble'));
  assert.equal(world.bubbles.length, 0);
  assert.equal(world.player.bubble, true);
});

test('a chicken in a bubble falls slowly like on a parachute, and the bubble pops when it lands', () => {
  const tall = () => createWorld(testLevel(['C.........HG', '............', '............', '............', '............', '............', '............', '............', '############'], { theme: 'sea' }));
  const world = tall();
  placePlayer(world, 3 * TILE, 3 * TILE, { onGround: false, bubble: true, invuln: 99 });
  let fastest = 0;
  let events = [];
  for (let i = 0; i < Math.round(6 / STEP) && world.player.bubble; i++) {
    world.player.invuln = 99;
    events = world.step(STEP, IDLE);
    fastest = Math.max(fastest, world.player.vy);
  }
  assert.ok(fastest <= BUBBLE.fallSpeed + 1e-9, `fell at ${fastest}`);
  assert.ok(types(events).includes('bubblePop'));
  assert.equal(world.player.bubble, false);

  const plain = tall();
  placePlayer(plain, 3 * TILE, 3 * TILE, { onGround: false });
  let plainFastest = 0;
  for (let i = 0; i < 120; i++) {
    plain.player.invuln = 99;
    plain.step(STEP, IDLE);
    plainFastest = Math.max(plainFastest, plain.player.vy);
  }
  assert.ok(plainFastest > BUBBLE.fallSpeed * 2);
});

test('touching a pearl lets a crab out, which pinches the nearest shark twice and then leaves', () => {
  const level = sea(['C.P....H....H..G', '################']);
  const world = createWorld(level);
  placePlayer(world, level.pearls[0].x, level.pearls[0].y, { invuln: 99 });
  assert.ok(types(run(world, 0.05, { safe: true })).includes('pearlOpen'));
  assert.equal(world.crabs.length, 1);
  placePlayer(world, 1 * TILE, 11 * TILE, { invuln: 99 });
  const all = run(world, 8, { safe: true });
  assert.equal(all.filter((e) => e.type === 'crabPinch').length, CRAB.pinches);
  assert.equal(world.crabs.length, 0);
  const [near, far] = level.enemies.filter((e) => e.kind === 'shark');
  assert.equal(world.enemies.find((e) => e.x === near.x).lives, SHARK.lives - CRAB.pinches);
  assert.equal(world.enemies.find((e) => e.x === far.x).lives, SHARK.lives);
});

test('a crab that finishes the last shark opens the finish', () => {
  const world = createWorld(sea(['C.P.H.....G', '###########']));
  world.enemies[0].lives = 1;
  placePlayer(world, world.pearls[0].x, world.pearls[0].y, { invuln: 99 });
  const events = run(world, 4, { safe: true });
  assert.ok(events.some((e) => e.type === 'crabPinch' && e.result === 'defeated'));
  assert.ok(types(events).includes('goalOpen'));
  assert.equal(world.goal.locked, false);
  assert.equal(world.enemies.length, 0);
});

test('a sea level loads into the game with its finish locked', () => {
  const map = mapFromBottom(['C.....H...G', '###########']);
  const game = createGame([{ id: 'sea1', theme: 'sea', map }]);
  game.confirm();
  assert.equal(game.level.theme, 'sea');
  assert.equal(game.world.goal.locked, true);
});
