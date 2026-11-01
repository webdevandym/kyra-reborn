import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TILE, STEP, ROWS, RULES, PLAYER, GRANDMA, STICK, BALL } from '../src/config.js';
import { aim8 } from '../src/core/aim.js';
import { createEnemy, updateEnemy, stompEnemy } from '../src/core/enemies.js';
import { PROJECTILES } from '../src/core/projectiles.js';
import { createWorld, projectileRect } from '../src/core/world.js';
import { createGame } from '../src/core/game.js';
import { parseLevel, tileAt, roomAt } from '../src/core/level.js';
import { runSteps, types } from './helpers.js';

const IDLE = { left: false, right: false, jumpHeld: false, jumpPressed: false };
const COLS = 64;
const WALLS = [12, 25];
const FLOOR = (ROWS - 1) * TILE;
const HOUSE_COL = 40;
const MARKS = { 0: 'C', 4: 'n', 11: 'O', 14: 'K', 16: 'M', 21: 'n', 23: 'O', 28: 'n', [HOUSE_COL]: 'U', 62: 'G' };
const EPS = 1e-6;

function forestDef({ marks = {}, pits = [], blocks = {} } = {}) {
  const feet = { ...MARKS, ...marks };
  const map = Array.from({ length: ROWS }, (_, row) =>
    Array.from({ length: COLS }, (_, col) => {
      if (WALLS.includes(col)) return '#';
      if (row === ROWS - 1) return pits.includes(col) ? '.' : '#';
      if (row >= ROWS - 1 - (blocks[col] ?? 0)) return '#';
      return row === ROWS - 2 ? (feet[col] ?? '.') : '.';
    }).join(''),
  );
  return { id: 'wood', theme: 'forest', map };
}

const forest = (options) => parseLevel(forestDef(options));
const colX = (col) => (col + 0.5) * TILE;
const HOUSE = { x: colX(HOUSE_COL), y: FLOOR };
const grandmasOf = (world) => world.enemies.filter((e) => e.kind === 'grandma');
const grandmaOf = (world) => grandmasOf(world)[0];
const snakesOf = (world) => world.enemies.filter((e) => e.kind === 'snake');
const ofType = (events, type) => events.filter((e) => e.type === type);
const chickenAt = (col, y = FLOOR) => ({ x: colX(col), y, w: PLAYER.w, h: PLAYER.h, facing: 1, onGround: true, dead: false });
const plateau = (from, to, height) => Object.fromEntries(Array.from({ length: to - from + 1 }, (_, i) => [from + i, height]));

function standAt(p, x, y = FLOOR) {
  Object.assign(p, { x, y, prevBottom: y, vx: 0, vy: 0, onGround: true, jumping: false });
}

function stomp(world, e, step = () => world.step(STEP, IDLE)) {
  const y = e.y - e.h + 4;
  Object.assign(world.player, { x: e.x, y, prevBottom: y, vx: 0, vy: 120, onGround: false, jumping: false, invuln: 99 });
  const events = step();
  assert.ok(events.some((ev) => ev.type === 'stomp' && ev.kind === e.kind), `stomped the ${e.kind} at x ${e.x}`);
  return events;
}

function callGrandma(world, step) {
  const events = [];
  for (const snake of snakesOf(world)) events.push(...stomp(world, snake, step));
  return events;
}

function stompGrandma(world, g) {
  const events = [];
  standAt(world.player, g.x + 6 * TILE);
  for (let i = 0; i < 600 && (g.dizzy > 0 || !g.onGround); i++) events.push(...world.step(STEP, IDLE));
  assert.equal(g.dizzy, 0);
  assert.equal(g.onGround, true);
  events.push(...stomp(world, g));
  return events;
}

function insideSolid(level, e) {
  for (let col = Math.floor((e.x - e.w / 2) / TILE); col <= Math.floor((e.x + e.w / 2 - EPS) / TILE); col++) {
    for (let row = Math.floor((e.y - e.h) / TILE); row <= Math.floor((e.y - EPS) / TILE); row++) {
      if (tileAt(level, col, row) === 'solid') return true;
    }
  }
  return false;
}

function assertSafe(level, g, room, ground, why) {
  assert.equal(g.alive, true, why);
  assert.ok(g.x - g.w / 2 >= room.left - EPS && g.x + g.w / 2 <= room.right + EPS, `${why}: inside her room, x ${g.x}`);
  assert.ok(g.y <= ground + EPS, `${why}: never below her ground, feet at ${g.y}`);
  assert.equal(insideSolid(level, g), false, `${why}: never inside a wall`);
}

function simulate(level, g, chicken, seconds, each = () => {}) {
  let flying = [];
  const shots = [];
  runSteps(Math.round(seconds / STEP), (step) => {
    const shot = updateEnemy(g, STEP, level, chicken);
    if (shot) {
      flying.push(shot);
      shots.push({ step, shot });
    }
    flying = flying.filter((f) => PROJECTILES[f.kind].move(f, STEP, level, []));
    each(step);
  });
  return shots;
}

function firstThrow(level, g, chicken) {
  for (let i = 0; i < Math.round(3 / STEP); i++) {
    const shot = updateEnemy(g, STEP, level, chicken);
    if (shot) return shot;
  }
  return null;
}

function startGame() {
  const game = createGame([forestDef()]);
  game.confirm();
  while (game.state === 'intro') game.tick(STEP, IDLE);
  assert.equal(game.state, 'playing');
  return game;
}

function dieAndRespawn(game) {
  const p = game.world.player;
  standAt(p, p.x, game.level.height + RULES.fallLimit + 1);
  const events = game.tick(STEP, IDLE);
  assert.equal(game.state, 'dying');
  for (let i = 0; game.state === 'dying' && i < 1000; i++) events.push(...game.tick(STEP, IDLE));
  assert.equal(game.state, 'playing');
  return events;
}

test('she comes out only when the last snake dies and a house stands', () => {
  const level = forest();
  assert.deepEqual(level.house, HOUSE);

  for (const order of [[0, 1, 2], [2, 0, 1]]) {
    const world = createWorld(level);
    assert.deepEqual(world.house, HOUSE);
    const snakes = snakesOf(world);
    order.forEach((i, n) => {
      const last = n === order.length - 1;
      const events = stomp(world, snakes[i]);
      assert.deepEqual(ofType(events, 'grandmaOut'), last ? [{ type: 'grandmaOut', ...HOUSE }] : [], `snake ${i + 1}, order ${order}`);
      assert.equal(grandmasOf(world).length, last ? 1 : 0);
    });
    const g = grandmaOf(world);
    assert.deepEqual([g.x, g.y, g.w, g.h, g.lives, g.phase, g.alive], [HOUSE.x, HOUSE.y, GRANDMA.w, GRANDMA.h, GRANDMA.lives, 'sticks', true]);
    assert.equal(world.goal.locked, true, 'the house and the grandmother keep the crystal locked');
    standAt(world.player, colX(55));
    world.step(STEP, IDLE);
    assert.equal(g.onGround, true, 'she stands on the ground at the door');
    assert.equal(g.y, FLOOR);
    assert.equal(roomAt(level, g.x), level.rooms[2]);
  }

  const world = createWorld(level);
  callGrandma(world);
  const extra = createEnemy({ kind: 'snake', x: colX(50), y: FLOOR });
  world.enemies.push(extra);
  assert.deepEqual(ofType(stomp(world, extra), 'grandmaOut'), [], 'she comes out once per world');
  assert.equal(grandmasOf(world).length, 1);

  const bare = createWorld(forest({ marks: { [HOUSE_COL]: '.' } }));
  assert.equal(bare.house, null);
  assert.deepEqual(ofType(callGrandma(bare), 'grandmaOut'), []);
  assert.deepEqual(grandmasOf(bare), []);
});

test('a world rebuilt after the chicken dies has the house and the snakes again and no grandmother until the last snake dies', () => {
  const game = startGame();
  const tick = () => game.tick(STEP, IDLE);
  assert.deepEqual(ofType(callGrandma(game.world, tick), 'grandmaOut'), [{ type: 'grandmaOut', ...HOUSE }]);
  assert.deepEqual(game.checkpoint, { x: game.level.checkpoint.x, y: game.level.checkpoint.y });

  dieAndRespawn(game);
  const world = game.world;
  assert.deepEqual(world.house, HOUSE);
  assert.deepEqual(grandmasOf(world), [], 'she is not rebuilt');
  assert.deepEqual(snakesOf(world).map((s) => s.x), [colX(21), colX(28)]);
  assert.equal(world.goal.locked, true);

  assert.deepEqual(ofType(callGrandma(world, tick), 'grandmaOut'), [{ type: 'grandmaOut', ...HOUSE }]);
  assert.equal(grandmasOf(world).length, 1);
});

test('she throws three sticks, fetching each, then balls without end', () => {
  const level = forest();
  const room = level.rooms[2];
  const world = createWorld(level);
  callGrandma(world);
  const g = grandmaOf(world);
  const p = world.player;
  standAt(p, colX(50));
  p.invuln = 1e9;

  const throws = [];
  const trace = [];
  runSteps(Math.round(45 / STEP), (step) => {
    const centre = { x: g.x, y: g.y - g.h / 2 };
    for (const ev of world.step(STEP, IDLE)) {
      if (ev.type === 'stickThrow' || ev.type === 'ball') throws.push({ step, type: ev.type, x: ev.x, y: ev.y, centre });
    }
    trace.push({ stickAt: g.stickAt && { ...g.stickAt }, x: g.x, vx: g.vx, phase: g.phase });
    assertSafe(level, g, room, FLOOR, `step ${step}`);
  });

  const kinds = throws.map((t) => t.type);
  assert.deepEqual(kinds.slice(0, 3), ['stickThrow', 'stickThrow', 'stickThrow']);
  assert.ok(kinds.slice(3).every((k) => k === 'ball'), kinds.join());
  assert.ok(kinds.length - 3 >= 10, `${kinds.length - 3} balls`);

  for (const t of throws) {
    const len = Math.hypot(t.x - t.centre.x, t.y - t.centre.y);
    const aim = aim8(t.centre.x, t.centre.y, p.x, p.y - p.h / 2);
    assert.ok(Math.abs((t.x - t.centre.x) / len - aim.dx) < 1e-9 && Math.abs((t.y - t.centre.y) / len - aim.dy) < 1e-9, `${t.type} at step ${t.step} aims with aim8`);
  }

  const third = throws[2].step;
  assert.ok(trace.slice(0, third).every((t) => t.phase === 'sticks'));
  assert.ok(trace.slice(third).every((t) => t.phase === 'balls'));
  assert.ok(trace.slice(third).every((t) => Math.abs(t.vx) <= GRANDMA.speed), 'the third stick is not fetched');

  for (const k of [0, 1]) {
    const from = throws[k].step + 1;
    const window = trace.slice(from, throws[k + 1].step);
    const landed = window.findIndex((t) => t.stickAt);
    assert.ok(landed >= 0, `stick ${k + 1} landed`);
    const spot = window[landed].stickAt;
    const picked = window.findIndex((t, i) => i > landed && !t.stickAt);
    assert.ok(picked > landed, `stick ${k + 1} picked up`);
    const target = Math.min(Math.max(spot.x, room.left + GRANDMA.w / 2), room.right - GRANDMA.w / 2);
    assert.ok(Math.abs(window[picked].x - target) <= 1, `picked up stick ${k + 1} at x ${window[picked].x}, stick at ${spot.x}`);
    const again = throws[k + 1].step - (from + picked);
    assert.ok(Math.abs(again - GRANDMA.throwEvery / STEP) <= 1, `threw stick ${k + 2} ${again} steps after picking up stick ${k + 1}`);
  }

  const balls = throws.slice(3).map((t) => t.step);
  const gaps = balls.map((s, i) => s - (i === 0 ? third : balls[i - 1]));
  assert.ok(gaps.every((gap) => Math.abs(gap - GRANDMA.throwEvery / STEP) <= 1), `ball gaps ${gaps}`);
});

test('a stick that lands far away is fetched without leaving the room or falling', () => {
  const level = forest({ pits: [46, 47] });
  const room = level.rooms[2];
  const edge = { left: room.left + GRANDMA.w / 2, right: 46 * TILE - GRANDMA.w / 2 };
  const spots = [
    { why: 'on the floor far along her ground', at: { x: colX(27), y: FLOOR - 8 }, to: colX(27), reachable: true },
    { why: 'on the floor across the pit', at: { x: colX(60), y: FLOOR - 8 }, to: edge.right },
    { why: 'high off the ground', at: { x: colX(33), y: 2 * TILE }, to: colX(33) },
    { why: 'inside the wall', at: { x: colX(25), y: FLOOR - TILE }, to: edge.left },
    { why: 'in the room before hers', at: { x: colX(18), y: FLOOR - 8 }, to: edge.left },
    { why: 'above the map', at: { x: colX(36), y: -2 * TILE }, to: colX(36) },
    { why: 'down the pit below the map', at: { x: colX(46), y: level.height + TILE }, to: edge.right },
  ];
  for (const { why, at, to, reachable } of spots) {
    const g = createEnemy({ kind: 'grandma', ...HOUSE });
    const chicken = chickenAt(HOUSE_COL + 2);
    assert.equal(firstThrow(level, g, chicken)?.kind, 'stick', why);
    g.stickAt = { ...at };
    let arrived = null;
    let regained = null;
    let fastest = 0;
    const shots = simulate(level, g, chicken, 12, (step) => {
      assertSafe(level, g, room, FLOOR, why);
      assert.ok(g.x <= edge.right + EPS, `${why}: never over the pit, x ${g.x}`);
      fastest = Math.max(fastest, Math.abs(g.vx));
      if (arrived === null && Math.abs(g.x - to) <= 1) arrived = step;
      if (regained === null && g.stickAt === null) regained = step;
    });
    assert.notEqual(arrived, null, `${why}: reached the nearest standing spot ${to}`);
    assert.notEqual(regained, null, `${why}: has her stick again`);
    const waited = (regained - arrived) * STEP;
    if (reachable) {
      assert.ok(waited <= 2 * STEP + EPS, `${why}: picked it up on arrival, waited ${waited}s`);
      assert.equal(fastest, GRANDMA.runSpeed, `${why}: ran to it`);
    } else {
      assert.ok(waited > 0.25 && waited <= 1.5, `${why}: gave up after a short wait of ${waited}s`);
    }
    assert.equal(shots[0]?.shot.kind, 'stick', `${why}: carried on throwing`);
  }

  const g = createEnemy({ kind: 'grandma', ...HOUSE });
  const across = chickenAt(55);
  let landedAt = null;
  const shots = simulate(level, g, across, 12, () => {
    assertSafe(level, g, room, FLOOR, 'a stick thrown over the pit');
    assert.ok(g.x <= edge.right + EPS, `never over the pit, x ${g.x}`);
    landedAt ??= g.stickAt && { ...g.stickAt };
  });
  assert.ok(landedAt && landedAt.x > 48 * TILE, `the stick flew over the pit to x ${landedAt?.x}`);
  assert.ok(shots.length >= 2, 'she carried on throwing from her side of the pit');
});

test('she never walks off an edge', () => {
  const cases = [
    { why: 'a plateau', level: forest({ blocks: plateau(36, 44, 2) }), ground: FLOOR - 2 * TILE },
    { why: 'ground between two pits', level: forest({ pits: [35, 45] }), ground: FLOOR },
  ];
  const span = { left: 36 * TILE + GRANDMA.w / 2, right: 45 * TILE - GRANDMA.w / 2 };
  for (const { why, level, ground } of cases) {
    const room = level.rooms[2];
    for (const col of [52, 29]) {
      const g = createEnemy({ kind: 'grandma', x: colX(40), y: ground });
      let minX = g.x;
      let maxX = g.x;
      simulate(level, g, chickenAt(col), 20, () => {
        assertSafe(level, g, room, ground, `${why}, chicken at column ${col}`);
        assert.ok(g.x >= span.left - EPS && g.x <= span.right + EPS, `${why}: stays on her ground, x ${g.x}`);
        minX = Math.min(minX, g.x);
        maxX = Math.max(maxX, g.x);
      });
      const edge = col > 40 ? maxX : minX;
      assert.ok(Math.abs(edge - (col > 40 ? span.right : span.left)) <= 1, `${why}: walked up to the edge towards column ${col}, reached ${edge}`);
    }
  }
});

test('a stomp costs one life and the fourth defeats her', () => {
  const level = forest();
  const g = createEnemy({ kind: 'grandma', ...HOUSE });
  const chicken = chickenAt(50);
  updateEnemy(g, STEP, level, chicken);
  for (let lives = GRANDMA.lives - 1; lives >= 1; lives--) {
    assert.equal(stompEnemy(g), 'hurt');
    assert.equal(g.lives, lives);
    assert.equal(g.dizzy, GRANDMA.dizzyTime);
    assert.equal(g.winding, false);
    assert.equal(stompEnemy(g), 'bounce', 'a stomp while dizzy only bounces');
    assert.equal(g.lives, lives);
    const x = g.x;
    let shots = 0;
    runSteps(Math.round(GRANDMA.dizzyTime / STEP) - 1, () => {
      if (updateEnemy(g, STEP, level, chicken)) shots += 1;
      assert.equal(g.winding, false);
    });
    assert.equal(g.x, x, 'stands still while dizzy');
    assert.equal(shots, 0, 'throws nothing while dizzy');
    runSteps(3, () => updateEnemy(g, STEP, level, chicken));
    assert.equal(g.dizzy, 0);
    assert.ok(g.x > x, 'walks again once the dizziness wears off');
  }
  assert.equal(stompEnemy(g), 'defeated');
  assert.equal(g.alive, false);
  assert.equal(g.lives, 0);

  const world = createWorld(level);
  callGrandma(world);
  const wg = grandmaOf(world);
  const p = world.player;
  const hurt = stompGrandma(world, wg);
  assert.deepEqual(ofType(hurt, 'stomp').at(-1), { type: 'stomp', kind: 'grandma', result: 'hurt', x: wg.x, y: wg.y - wg.h });
  assert.equal(p.vx, wg.dir * GRANDMA.knockback, 'the chicken is knocked back');
  assert.equal(wg.lives, GRANDMA.lives - 1);
  for (let i = 0; i < GRANDMA.lives - 2; i++) stompGrandma(world, wg);
  const last = stompGrandma(world, wg);
  assert.equal(ofType(last, 'stomp').at(-1).result, 'defeated');
  assert.deepEqual(grandmasOf(world), []);
});

test('her defeat removes the house, emits houseGone and opens the lock once', () => {
  const level = forest();
  const goalOpen = { type: 'goalOpen', x: level.goal.x, y: level.goal.y };
  const watched = (events) => events.filter((e) => ['stomp', 'houseGone', 'goalOpen'].includes(e.type));

  const world = createWorld(level, new Set(), { start: level.checkpoint, monkey: { state: 'dead', lives: 0 } });
  const all = callGrandma(world);
  const g = grandmaOf(world);
  assert.equal(world.goal.locked, true);
  for (let i = 0; i < GRANDMA.lives - 1; i++) all.push(...stompGrandma(world, g));
  assert.equal(world.goal.locked, true);
  assert.deepEqual(world.house, HOUSE);
  const last = stompGrandma(world, g);
  all.push(...last);
  assert.deepEqual(watched(last), [
    { type: 'stomp', kind: 'grandma', result: 'defeated', x: g.x, y: g.y - g.h },
    { type: 'houseGone', ...HOUSE },
    goalOpen,
  ]);
  assert.equal(world.house, null);
  assert.equal(world.goal.locked, false);
  assert.deepEqual(ofType(all, 'houseGone'), [{ type: 'houseGone', ...HOUSE }]);
  assert.deepEqual(ofType(all, 'goalOpen'), [goalOpen]);

  const rabbit = createEnemy({ kind: 'rabbit', x: colX(50), y: FLOOR });
  world.enemies.push(rabbit);
  assert.deepEqual(ofType(stomp(world, rabbit), 'goalOpen'), [], 'a later defeat does not open it again');
  standAt(world.player, world.goal.x);
  assert.ok(types(world.step(STEP, IDLE)).includes('goal'));

  const early = createWorld(level);
  callGrandma(early);
  const eg = grandmaOf(early);
  const kills = [];
  for (let i = 0; i < GRANDMA.lives; i++) kills.push(...stompGrandma(early, eg));
  assert.deepEqual(ofType(kills, 'houseGone'), [{ type: 'houseGone', ...HOUSE }]);
  assert.deepEqual(ofType(kills, 'goalOpen'), [], 'the monkey still holds the lock');
  assert.equal(early.house, null);
  assert.equal(early.goal.locked, true);

  const m = early.enemies.find((e) => e.kind === 'monkey');
  standAt(early.player, m.x - 3 * TILE);
  for (let i = 0; i < 240 && !(m.mode === 'awake' && m.onGround); i++) early.step(STEP, IDLE);
  m.lives = 1;
  assert.deepEqual(ofType(stomp(early, m), 'goalOpen'), [goalOpen]);
  assert.equal(early.goal.locked, false);
});

test('balls and sticks kill the chicken on contact', () => {
  for (const [kind, cfg] of [['ball', BALL], ['stick', STICK]]) {
    const world = createWorld(forest());
    world.enemies = [];
    const p = world.player;
    standAt(p, colX(6));
    p.invuln = 0;
    const owner = { stickAt: null };
    const shot = { kind, x: p.x + 3 * TILE, y: p.y - p.h / 2, vx: -cfg.speed, vy: 0, owner };
    assert.deepEqual(projectileRect(shot), { left: shot.x - cfg.size / 2, right: shot.x + cfg.size / 2, top: shot.y - cfg.size / 2, bottom: shot.y + cfg.size / 2 });
    world.projectiles.push(shot);
    const events = [];
    for (let i = 0; i < 120 && !world.done; i++) events.push(...world.step(STEP, IDLE));
    assert.equal(p.dead, true, kind);
    assert.deepEqual(ofType(events, 'hit').length, 1, kind);
    assert.equal(owner.stickAt, null, `a ${kind} spent on the chicken is not left lying`);
  }
});

test('a stick cleared by a warp does not leave her stuck', () => {
  const level = forest();
  const room = level.rooms[2];
  const world = createWorld(level);
  callGrandma(world);
  const g = grandmaOf(world);
  const p = world.player;
  standAt(p, colX(50));
  p.invuln = 1e9;
  let first = null;
  for (let i = 0; first === null && i < Math.round(3 / STEP); i++) {
    if (ofType(world.step(STEP, IDLE), 'stickThrow').length) first = i;
  }
  assert.notEqual(first, null);
  world.projectiles = [];

  let second = null;
  let lying = false;
  let ran = false;
  for (let i = 0; second === null && i < Math.round(15 / STEP); i++) {
    const events = world.step(STEP, IDLE);
    lying ||= g.stickAt !== null;
    ran ||= Math.abs(g.vx) > GRANDMA.speed;
    if (ofType(events, 'stickThrow').length) second = i + 1;
  }
  assert.equal(lying, false, 'no stickAt: nothing to fetch');
  assert.equal(ran, false, 'she does not run after a stick that is gone');
  assert.notEqual(second, null, 'she throws again');
  const longestFlight = (room.right - room.left + level.height + 4 * TILE) / STICK.speed;
  assert.ok(second * STEP <= longestFlight + GRANDMA.throwEvery + 0.1, `threw again after ${second * STEP}s`);
});

test('with no chicken, a dead chicken or a chicken in another room she does nothing dangerous', () => {
  const level = forest();
  const chickens = [
    ['no chicken', null],
    ['a dead chicken', { ...chickenAt(HOUSE_COL + 2), dead: true }],
    ['a chicken in another room', chickenAt(20)],
  ];
  for (const [why, chicken] of chickens) {
    const g = createEnemy({ kind: 'grandma', ...HOUSE });
    let shots = 0;
    let wound = false;
    runSteps(Math.round(6 / STEP), () => {
      if (updateEnemy(g, STEP, level, chicken)) shots += 1;
      wound ||= g.winding;
    });
    assert.equal(shots, 0, why);
    assert.equal(wound, false, why);
    assert.deepEqual([g.x, g.y, g.onGround, g.alive], [HOUSE.x, HOUSE.y, true, true], why);
  }
});

test('a throw from above the chicken goes straight down', () => {
  const level = forest({ blocks: { [HOUSE_COL]: 4 } });
  const top = FLOOR - 4 * TILE;
  const g = createEnemy({ kind: 'grandma', x: colX(HOUSE_COL), y: top });
  const chicken = chickenAt(HOUSE_COL + 1);
  const shot = firstThrow(level, g, chicken);
  assert.equal(shot.kind, 'stick');
  assert.deepEqual([shot.vx, shot.vy], [0, STICK.speed]);
  assert.deepEqual(aim8(g.x, g.y - g.h / 2, chicken.x, chicken.y - chicken.h / 2), { dx: 0, dy: 1 });
  assert.equal(g.y, top, 'she is still on her pillar');
});

test('she winds up before every throw and jumps every jumpEvery seconds while grounded', () => {
  const level = forest();
  const g = createEnemy({ kind: 'grandma', ...HOUSE });
  const takeoffs = [];
  const winding = [];
  let grounded = true;
  const shots = simulate(level, g, chickenAt(HOUSE_COL + 9), 40, (step) => {
    winding[step] = g.winding;
    if (grounded && g.vy < 0) takeoffs.push(step);
    grounded = g.onGround;
  });
  assert.ok(shots.length >= 10, `${shots.length} throws`);
  const windSteps = GRANDMA.windup / STEP;
  for (const { step } of shots) {
    let wound = 0;
    while (winding[step - 1 - wound]) wound += 1;
    assert.ok(Math.abs(wound - windSteps) <= 1, `wound up for ${wound} steps before the throw at step ${step}`);
    assert.equal(winding[step], false, 'the windup ends with the throw');
  }
  assert.ok(takeoffs.length >= 10, `${takeoffs.length} jumps`);
  const gaps = takeoffs.slice(1).map((s, i) => s - takeoffs[i]);
  assert.ok(gaps.every((gap) => Math.abs(gap - GRANDMA.jumpEvery / STEP) <= 1), `jump gaps ${gaps}`);
});

test('a stick flies straight and tells its owner where it stopped, a ball flies straight', () => {
  const level = forest();
  assert.equal(PROJECTILES.stick.event, 'stickThrow');
  assert.equal(PROJECTILES.stick.size, STICK.size);
  assert.equal(PROJECTILES.ball.event, 'ball');
  assert.equal(PROJECTILES.ball.size, BALL.size);

  const owner = { stickAt: null };
  const stick = { kind: 'stick', x: colX(30), y: FLOOR - 30, vx: STICK.speed, vy: 0, owner };
  while (PROJECTILES.stick.move(stick, STEP, level, [])) {
    assert.equal(stick.y, FLOOR - 30);
    assert.equal(owner.stickAt, null, 'nothing to fetch while it flies');
  }
  assert.deepEqual(owner.stickAt, { x: stick.x, y: stick.y });
  assert.ok(stick.x + STICK.size / 2 >= level.width && stick.x < level.width, `stopped at the right edge, x ${stick.x}`);

  const up = { kind: 'stick', x: colX(30), y: FLOOR - 30, vx: 0, vy: -STICK.speed, owner };
  while (PROJECTILES.stick.move(up, STEP, level, []));
  assert.deepEqual(owner.stickAt, { x: up.x, y: up.y });
  assert.ok(up.y < -TILE, 'left the map at the top');

  const loose = { kind: 'stick', x: colX(30), y: FLOOR - 30, vx: 0, vy: STICK.speed };
  while (PROJECTILES.stick.move(loose, STEP, level, []));
  assert.ok(loose.y < FLOOR, 'an ownerless stick stops at the ground without throwing');

  const SQ = Math.SQRT1_2;
  const ball = { kind: 'ball', x: colX(30), y: FLOOR - 30, vx: BALL.speed * SQ, vy: -BALL.speed * SQ };
  let steps = 0;
  while (PROJECTILES.ball.move(ball, STEP, level, [])) {
    steps += 1;
    assert.ok(Math.abs(ball.x - colX(30) - steps * STEP * BALL.speed * SQ) < 1e-6);
    assert.ok(Math.abs(ball.y - (FLOOR - 30) + steps * STEP * BALL.speed * SQ) < 1e-6);
  }
  assert.ok(steps > 0);
});
