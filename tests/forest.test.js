import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TILE, STEP, PLAYER, PORTAL, RULES, MONKEY } from '../src/config.js';
import { parseLevel, solidTop, roomIndex } from '../src/core/level.js';
import { createWorld, goalBlocked } from '../src/core/world.js';
import { createGame } from '../src/core/game.js';
import levels from '../src/levels/index.js';
import { mapFromBottom, castleMap, testLevel, runSteps, types } from './helpers.js';

const WALLS = [12, 25];
const FEET = ['C...n......O', '.', '.K..M...n.O.', '.', '..w.....U..G'].join('');
const GROUND = '#'.repeat(FEET.length);

const put = (row, col, ch) => row.slice(0, col) + ch + row.slice(col + 1);

function forestDef({ upper = '.'.repeat(FEET.length), feet = FEET, ground = GROUND, walls = WALLS, extra = {} } = {}) {
  const map = mapFromBottom([upper, feet, ground]).map((line) => [...line].map((ch, col) => (walls.includes(col) ? '#' : ch)).join(''));
  return { id: 'wood', theme: 'forest', map, ...extra };
}

function forest(options) {
  return parseLevel(forestDef(options));
}

function rejects(options, pattern) {
  assert.throws(() => forest(options), (err) => {
    assert.match(err.message, /^wood: /);
    assert.match(err.message, pattern);
    return true;
  });
}

const feetOf = (col) => ({ x: (col + 0.5) * TILE, y: 11 * TILE });

test('a valid forest map parses with three rooms, two portals, a savepoint, a monkey and three snakes', () => {
  const level = forest();
  assert.equal(level.theme, 'forest');
  assert.deepEqual(level.rooms, [
    { left: 0, right: 12 * TILE, kind: null },
    { left: 13 * TILE, right: 25 * TILE, kind: null },
    { left: 26 * TILE, right: 38 * TILE, kind: null },
  ]);
  assert.deepEqual(level.portals, [feetOf(11), feetOf(23)]);
  assert.deepEqual(level.checkpoint, feetOf(14));
  assert.deepEqual(level.spawn, feetOf(0));
  assert.deepEqual(level.goal, feetOf(37));
  assert.deepEqual(level.house, feetOf(34));
  assert.deepEqual(level.enemies.filter((e) => e.kind === 'monkey'), [{ kind: 'monkey', ...feetOf(17) }]);
  assert.deepEqual(level.enemies.filter((e) => e.kind === 'snake').map((e) => e.x), [4.5 * TILE, 21.5 * TILE, 28.5 * TILE]);
});

test('a forest level needs exactly three rooms', () => {
  rejects({ walls: [12] }, /exactly three rooms/);
  rejects({ walls: [12, 25, 31] }, /exactly three rooms/);
});

test('a forest level needs exactly three snakes', () => {
  rejects({ feet: put(FEET, 4, '.') }, /exactly three snakes/);
  rejects({ feet: put(FEET, 6, 'n') }, /exactly three snakes/);
});

test('a forest level needs exactly one snake in each room', () => {
  rejects({ feet: put(put(FEET, 4, '.'), 15, 'n') }, /one snake in each room/);
  rejects({ feet: put(put(FEET, 28, '.'), 6, 'w') }, /one snake in each room/);
});

test('a forest level needs exactly one monkey', () => {
  rejects({ feet: put(FEET, 17, '.') }, /exactly one monkey 'M'/);
  rejects({ feet: put(FEET, 19, 'M') }, /exactly one monkey 'M'/);
});

test('the forest monkey must be in the second room', () => {
  rejects({ feet: put(put(FEET, 17, '.'), 8, 'M') }, /monkey 'M' must be in the second room/);
  rejects({ feet: put(put(FEET, 17, '.'), 30, 'M') }, /monkey 'M' must be in the second room/);
});

test('a forest level needs a checkpoint and a second checkpoint is refused', () => {
  rejects({ feet: put(FEET, 14, '.') }, /needs a checkpoint 'K'/);
  rejects({ feet: put(FEET, 16, 'K') }, /more than one checkpoint 'K'/);
});

test('the forest checkpoint must be in the second room', () => {
  rejects({ feet: put(put(FEET, 14, '.'), 2, 'K') }, /checkpoint 'K' must be in the second room/);
  rejects({ feet: put(put(FEET, 14, '.'), 30, 'K') }, /checkpoint 'K' must be in the second room/);
});

test('the forest checkpoint stands 1.5 tiles inside the second room, where portal 1 drops the chicken', () => {
  rejects({ feet: put(put(FEET, 14, '.'), 13 + 2, 'K') }, /1\.5 tiles inside the second room/);
  rejects({ feet: put(put(FEET, 14, '.'), 13, 'K') }, /1\.5 tiles inside the second room/);
  assert.equal(forest().checkpoint.x, forest().rooms[1].left + 1.5 * TILE);
});

test('the forest checkpoint must stand on solid ground', () => {
  rejects({ ground: put(GROUND, 14, '.') }, /checkpoint 'K' must stand on solid ground/);
  rejects({ ground: put(GROUND, 14, '=') }, /checkpoint 'K' must stand on solid ground/);
});

test('a forest level needs exactly two portals', () => {
  rejects({ feet: put(FEET, 11, '.') }, /exactly two portals 'O'/);
  rejects({ feet: put(FEET, 20, 'O') }, /exactly two portals 'O'/);
});

test('forest portals must be one in the first room and one in the second room', () => {
  rejects({ feet: put(put(FEET, 23, '.'), 8, 'O') }, /one portal 'O' in the first room and one in the second room/);
  rejects({ feet: put(put(FEET, 23, '.'), 30, 'O') }, /one portal 'O' in the first room and one in the second room/);
  rejects({ feet: put(put(FEET, 11, '.'), 18, 'O') }, /one portal 'O' in the first room and one in the second room/);
});

test('forest portals are listed left to right even when the second one is on a higher row', () => {
  const level = forest({ upper: put('.'.repeat(FEET.length), 23, 'O'), feet: put(FEET, 23, '.') });
  assert.deepEqual(level.portals, [feetOf(11), { x: 23.5 * TILE, y: 10 * TILE }]);
});

test('a forest level has at most one house U', () => {
  rejects({ feet: put(FEET, 31, 'U') }, /more than one house 'U'/);
  const none = forest({ feet: put(FEET, 34, '.') });
  assert.equal(none.house, null);
});

test('a forest level still needs a chicken start and a green crystal', () => {
  rejects({ feet: put(FEET, 0, '.') }, /missing chicken start 'C'/);
  rejects({ feet: put(FEET, 37, '.') }, /missing green crystal 'G'/);
});

test('a reads as a rabbit, e as a deer and n as a snake, all standing on the bottom edge of their tile', () => {
  const level = forest({ feet: put(put(FEET, 2, 'a'), 6, 'e') });
  assert.deepEqual(level.enemies.filter((e) => e.kind === 'rabbit'), [{ kind: 'rabbit', ...feetOf(2) }]);
  assert.deepEqual(level.enemies.filter((e) => e.kind === 'deer'), [{ kind: 'deer', ...feetOf(6) }]);
  assert.deepEqual(level.enemies.find((e) => e.x === 4.5 * TILE), { kind: 'snake', ...feetOf(4) });
});

test('w marks a flying snake', () => {
  const level = forest();
  const snakes = level.enemies.filter((e) => e.kind === 'snake');
  assert.deepEqual(snakes.map((e) => e.fly), [undefined, undefined, true]);
  assert.deepEqual(snakes[2], { kind: 'snake', ...feetOf(28), fly: true });
  const flyingFirst = forest({ feet: put(put(FEET, 4, 'w'), 28, 'n') });
  assert.deepEqual(flyingFirst.enemies.filter((e) => e.kind === 'snake').map((e) => e.fly), [true, undefined, undefined]);
});

test('a e n w M U are unknown characters outside the forest', () => {
  for (const ch of 'aenwMU') {
    for (const theme of ['meadow', 'sky', 'castle', 'sea']) {
      const map = mapFromBottom([`C.${ch}.G`, '######']);
      assert.throws(() => parseLevel({ id: 'plain', theme, map }), new RegExp(`plain: unknown character '${ch}' at 2,10`));
    }
  }
});

test('a castle level still allows exactly one portal', () => {
  const castle = (feet) => parseLevel({ id: 'keep', theme: 'castle', map: castleMap([feet, '#'.repeat(feet.length)], [11]) });
  assert.deepEqual(castle('C.m.S..O...#K..r..G').portal, feetOf(7));
  assert.throws(() => castle('C.m.S..O.O.#K..r..G'), /keep: more than one portal 'O'/);
});

test('forest portals are listed in portals and the castle portal is not', () => {
  const level = forest();
  assert.equal(level.portal, null);
  assert.deepEqual(level.portals, [feetOf(11), feetOf(23)]);

  const castle = parseLevel({ id: 'keep', theme: 'castle', map: castleMap(['C.m.S..O...#K..r..G', '#'.repeat(19)], [11]) });
  assert.deepEqual(castle.portal, feetOf(7));
  assert.deepEqual(castle.portals, []);
});

test('portals is empty and house is null for every non-forest theme', () => {
  for (const theme of ['meadow', 'sky', 'sea']) {
    const level = parseLevel({ id: 'plain', theme, map: mapFromBottom(['C.H.G', '#####']) });
    assert.deepEqual(level.portals, []);
    assert.equal(level.house, null);
  }
});

const IDLE = { left: false, right: false, jumpHeld: false, jumpPressed: false };
const RIGHT = { ...IDLE, right: true };
const FLOOR = 11 * TILE;
const NO_HOUSE = put(FEET, 34, '.');
const KEEP = { id: 'keep', theme: 'castle', map: castleMap(['C.............S.O.#K......c..G', '#'.repeat(30)], [18]) };

const monkeyOf = (world) => world.enemies.find((e) => e.kind === 'monkey');
const snakesOf = (world) => world.enemies.filter((e) => e.kind === 'snake');
const ofType = (events, type) => events.filter((e) => e.type === type);
const goalOpen = (level) => ({ type: 'goalOpen', x: level.goal.x, y: level.goal.y });

function standAt(p, x, y = FLOOR) {
  Object.assign(p, { x, y, prevBottom: y, vx: 0, vy: 0, onGround: true, jumping: false });
}

function kill(world, e) {
  const p = world.player;
  if (e.kind === 'monkey') {
    standAt(p, e.x - 3 * TILE);
    p.invuln = 99;
    for (let i = 0; i < 240 && !(e.mode === 'awake' && e.onGround); i++) world.step(STEP, IDLE);
    assert.equal(e.mode, 'awake');
    assert.equal(e.onGround, true);
  }
  if (e.lives > 1) e.lives = 1;
  const y = e.y - e.h + 4;
  Object.assign(p, { x: e.x, y, prevBottom: y, vx: 0, vy: 120, onGround: false, jumping: false, invuln: 99 });
  const events = world.step(STEP, IDLE);
  assert.ok(events.some((ev) => ev.type === 'stomp' && ev.kind === e.kind && ev.result === 'defeated'), `the ${e.kind} at x ${e.x} is defeated`);
  return events;
}

function touchGoal(world) {
  standAt(world.player, world.goal.x);
  world.player.invuln = 99;
  return world.step(STEP, IDLE);
}

function startGame(def) {
  const game = createGame([def]);
  game.confirm();
  while (game.state === 'intro') game.tick(STEP, IDLE);
  assert.equal(game.state, 'playing');
  return game;
}

function warpThrough(game, index) {
  const gate = game.world.portals[index];
  gate.open = true;
  standAt(game.world.player, gate.x, gate.y);
  return game.tick(STEP, IDLE);
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

test("killing the snake of a part opens that part's portal", () => {
  const world = createWorld(forest({ feet: put(FEET, 2, 'a') }));
  assert.deepEqual(world.portals, [
    { ...feetOf(11), w: PORTAL.w, h: PORTAL.h, open: false, openedAt: 0, room: 0 },
    { ...feetOf(23), w: PORTAL.w, h: PORTAL.h, open: false, openedAt: 0, room: 1 },
  ]);
  const [one, two, three] = snakesOf(world);
  const rabbit = world.enemies.find((e) => e.kind === 'rabbit');
  const opened = (e) => ofType(kill(world, e), 'portalOpen');

  assert.deepEqual(opened(rabbit), [], 'a rabbit opens nothing');
  assert.deepEqual(opened(two), [{ type: 'portalOpen', ...feetOf(23) }]);
  assert.deepEqual(world.portals.map((g) => g.open), [false, true], 'only the portal of its own part');
  assert.equal(world.portals[1].openedAt, world.time);
  assert.deepEqual(opened(one), [{ type: 'portalOpen', ...feetOf(11) }]);
  assert.deepEqual(world.portals.map((g) => g.open), [true, true]);
  assert.equal(world.portals[0].openedAt, world.time);
  assert.deepEqual(opened(three), [], 'the last part has no portal');
});

test('an open portal moves the chicken to the next part and emits warp', () => {
  const level = forest({ feet: put(FEET, 27, '#') });
  const world = createWorld(level);
  const p = world.player;
  const m = monkeyOf(world);
  const entrance = (room) => level.rooms[room].left + 1.5 * TILE;

  world.portals[0].open = true;
  standAt(p, world.portals[0].x);
  p.invuln = 0;
  world.projectiles.push({ kind: 'cone', x: p.x - 4 * TILE, y: FLOOR - 3 * TILE, vx: 0, vy: 0 });
  const first = world.step(STEP, IDLE);
  assert.deepEqual(ofType(first, 'warp'), [{ type: 'warp', from: { x: 11.5 * TILE, y: FLOOR }, to: { x: entrance(1), y: FLOOR } }]);
  assert.deepEqual([p.x, p.y, p.vx, p.vy, p.onGround], [entrance(1), FLOOR, 0, 0, true]);
  assert.equal(p.invuln, PLAYER.spawnGrace);
  assert.deepEqual(world.projectiles, []);
  assert.deepEqual(ofType(first, 'portal'), [], 'not the castle portal event');
  assert.equal(m.mode, 'asleep', 'a sleeping monkey stays in its bubble');

  standAt(p, m.x - 3 * TILE);
  world.step(STEP, IDLE);
  assert.equal(m.mode, 'awake');
  world.portals[1].open = true;
  standAt(p, world.portals[1].x);
  const second = world.step(STEP, IDLE);
  assert.equal(solidTop(level, 27), 10 * TILE);
  assert.deepEqual(ofType(second, 'warp').map((e) => e.to), [{ x: entrance(2), y: 10 * TILE }], 'standing on the ground at the entrance of part 3');
  assert.deepEqual([p.x, p.y], [entrance(2), 10 * TILE]);
  assert.equal(m.mode, 'arriving', 'an awake monkey follows her through');
  assert.equal(m.hidden, true);
});

test('a closed portal does nothing', () => {
  const world = createWorld(forest());
  world.enemies = [];
  const p = world.player;
  for (const gate of world.portals) {
    standAt(p, gate.x);
    const events = world.step(STEP, IDLE);
    assert.deepEqual(ofType(events, 'warp'), []);
    assert.deepEqual([p.x, p.y], [gate.x, FLOOR]);
    assert.equal(gate.open, false);
  }
});

test("the savepoint is reached once when the chicken's x passes the flag", () => {
  const level = forest();
  const flag = level.checkpoint;
  const world = createWorld(level);
  world.enemies = [];
  const p = world.player;
  const saves = (events) => ofType(events, 'savepoint');
  assert.equal(world.checkpointReached, false);

  standAt(p, flag.x - 1);
  assert.deepEqual(saves(world.step(STEP, IDLE)), []);
  assert.equal(world.checkpointReached, false);

  standAt(p, flag.x);
  assert.deepEqual(saves(world.step(STEP, IDLE)), [{ type: 'savepoint', x: flag.x, y: flag.y }]);
  assert.equal(world.checkpointReached, true);

  standAt(p, flag.x - TILE);
  const later = [];
  runSteps(Math.round(1 / STEP), () => later.push(...world.step(STEP, RIGHT)));
  assert.ok(p.x > flag.x + 2 * TILE, `walked back past the flag to x ${p.x}`);
  assert.deepEqual(saves(later), []);
});

test('portal 2 does not move the savepoint', () => {
  const game = startGame(forestDef());
  const level = game.level;
  const flag = { x: level.checkpoint.x, y: level.checkpoint.y };
  assert.equal(game.checkpoint, null);

  const one = warpThrough(game, 0);
  assert.deepEqual(types(one).filter((t) => t === 'warp' || t === 'savepoint'), ['warp', 'savepoint'], 'portal 1 drops her on the flag');
  assert.deepEqual(game.checkpoint, flag);

  const two = warpThrough(game, 1);
  assert.deepEqual(types(two).filter((t) => t === 'warp' || t === 'savepoint'), ['warp']);
  assert.equal(game.world.player.x, level.rooms[2].left + 1.5 * TILE);
  assert.deepEqual(game.checkpoint, flag);

  dieAndRespawn(game);
  assert.deepEqual([game.world.player.x, game.world.player.y], [flag.x, flag.y]);
});

test('after death the world restarts at the savepoint with checkpointReached set', () => {
  const game = startGame(forestDef());
  const level = game.level;
  dieAndRespawn(game);
  assert.equal(game.checkpoint, null, 'dying in part 1 restarts at C');
  assert.deepEqual([game.world.player.x, game.world.player.y], [level.spawn.x, level.spawn.y]);
  assert.equal(game.world.checkpointReached, false);

  warpThrough(game, 0);
  dieAndRespawn(game);
  const world = game.world;
  assert.deepEqual([world.player.x, world.player.y], [level.checkpoint.x, level.checkpoint.y]);
  assert.equal(world.checkpointReached, true);
  assert.deepEqual(snakesOf(world).map((s) => s.x), [21.5 * TILE, 28.5 * TILE], 'the snake of part 1 stays gone');
  assert.deepEqual(world.portals.map((g) => g.open), [false, false]);

  const after = [];
  runSteps(10, () => after.push(...game.tick(STEP, IDLE)));
  assert.equal(game.state, 'playing');
  assert.deepEqual(ofType(after, 'savepoint'), [], 'standing on the flag again fires nothing');
});

test('the castle portal still sets the checkpoint', () => {
  const game = startGame(KEEP);
  const { world, level } = game;
  const moves = (events) => types(events).filter((t) => t === 'portal' || t === 'warp' || t === 'savepoint');
  assert.deepEqual(world.portals, []);

  standAt(world.player, level.checkpoint.x + TILE);
  world.player.invuln = 99;
  assert.deepEqual(moves(game.tick(STEP, IDLE)), [], 'walking past K is no savepoint in the castle');
  assert.equal(world.checkpointReached, false);
  assert.equal(game.checkpoint, null);

  world.portal.open = true;
  standAt(world.player, world.portal.x);
  assert.deepEqual(moves(game.tick(STEP, IDLE)), ['portal']);
  assert.deepEqual(game.checkpoint, { x: level.checkpoint.x, y: level.checkpoint.y });
  assert.equal(world.checkpointReached, true);
});

test('goalBlocked holds while a shark, snake, monkey or grandmother lives or the house stands', () => {
  for (const kind of ['shark', 'snake', 'monkey', 'grandma']) {
    assert.equal(goalBlocked({ enemies: [{ kind, alive: true }] }), true, kind);
    assert.equal(goalBlocked({ enemies: [{ kind, alive: false }] }), false, `a defeated ${kind}`);
  }
  assert.equal(goalBlocked({ enemies: ['rabbit', 'deer', 'spider', 'fish'].map((kind) => ({ kind, alive: true })) }), false);
  assert.equal(goalBlocked({ enemies: [], house: { x: 0, y: 0 } }), true);
  assert.equal(goalBlocked({ enemies: [], house: null }), false);
});

test('the crystal stays locked until the monkey and every snake are dead and then opens exactly once', () => {
  const level = forest({ feet: put(NO_HOUSE, 31, 'a') });
  for (const last of ['monkey', 'snake']) {
    const world = createWorld(level);
    assert.equal(world.goal.locked, true);
    touchGoal(world);
    assert.equal(world.done, false, 'the caged crystal cannot be taken');

    const blockers = last === 'monkey' ? [...snakesOf(world), monkeyOf(world)] : [monkeyOf(world), ...snakesOf(world)];
    blockers.forEach((e, i) => {
      const final = i === blockers.length - 1;
      assert.deepEqual(ofType(kill(world, e), 'goalOpen'), final ? [goalOpen(level)] : [], `${e.kind} ${i + 1} of 4, ${last} last`);
      assert.equal(world.goal.locked, !final);
    });

    const rabbit = world.enemies.find((e) => e.kind === 'rabbit');
    assert.deepEqual(ofType(kill(world, rabbit), 'goalOpen'), [], 'a later defeat does not open it again');
    assert.ok(types(touchGoal(world)).includes('goal'));
    assert.equal(world.done, true);
  }
});

test('with the monkey already dead on respawn the lock does not wait for it', () => {
  const level = forest({ feet: NO_HOUSE });
  const fromSavepoint = (monkey) => createWorld(level, new Set(), { start: level.checkpoint, monkey });

  const awake = fromSavepoint({ state: 'awake', lives: 2 });
  assert.equal(monkeyOf(awake).mode, 'asleep');
  for (const snake of snakesOf(awake)) kill(awake, snake);
  assert.equal(awake.goal.locked, true, 'an awake monkey still holds the lock');

  const world = fromSavepoint({ state: 'dead', lives: 0 });
  assert.equal(monkeyOf(world), undefined);
  const [two, three] = snakesOf(world);
  assert.deepEqual([two.x, three.x], [21.5 * TILE, 28.5 * TILE], 'the snake of part 1 is not rebuilt');
  assert.equal(world.goal.locked, true);
  assert.deepEqual(ofType(kill(world, two), 'goalOpen'), []);
  assert.deepEqual(ofType(kill(world, three), 'goalOpen'), [goalOpen(level)]);
  assert.equal(world.goal.locked, false);
});

test('the sea lock still opens when the last shark dies', () => {
  const level = testLevel(['C..f..H....H..G', '###############'], { theme: 'sea' });
  const world = createWorld(level);
  const fish = world.enemies.find((e) => e.kind === 'fish');
  const [a, b] = world.enemies.filter((e) => e.kind === 'shark');
  assert.equal(world.goal.locked, true);
  assert.deepEqual(ofType(kill(world, fish), 'goalOpen'), [], 'a fish is no blocker');
  assert.deepEqual(ofType(kill(world, a), 'goalOpen'), []);
  assert.equal(world.goal.locked, true);
  assert.deepEqual(ofType(kill(world, b), 'goalOpen'), [goalOpen(level)]);
  assert.equal(world.goal.locked, false);
});

test('a finish without sharks, snakes or a monkey is never locked and a defeat there emits no goalOpen', () => {
  const world = createWorld(testLevel(['C...c....G', '##########']));
  assert.equal(world.goal.locked, false);
  assert.deepEqual(ofType(kill(world, world.enemies[0]), 'goalOpen'), []);
  assert.equal(createWorld(parseLevel(KEEP)).goal.locked, false);
});

const LOCKS = new Set(['snake', 'monkey', 'grandma']);

function tickRun(run) {
  const events = run.game.tick(STEP, IDLE);
  run.events.push(...events);
  assert.ok(run.game.state === 'playing' || events.some((ev) => ev.type === 'goal'), `the game is ${run.game.state}`);
  return events;
}

function tickUntil(run, done, what, limit = 1200) {
  for (let i = 0; i < limit && !done(); i++) tickRun(run);
  assert.ok(done(), what);
}

function startForestLevel(def) {
  const index = levels.indexOf(def);
  assert.ok(index >= 0, `${def.id} is in the level list`);
  const game = createGame(levels);
  game.selectLevel(index);
  game.confirm();
  const run = { game, events: [] };
  while (game.state === 'intro') run.events.push(...game.tick(STEP, IDLE));
  assert.equal(game.state, 'playing');
  return run;
}

function parkOnGround(run, col) {
  const { world, level } = run.game;
  const y = solidTop(level, col);
  assert.ok(y < level.height, `ground at column ${col}`);
  standAt(world.player, (col + 0.5) * TILE, y);
  world.player.invuln = 99;
}

function stompOnce(run, e) {
  const y = e.y - e.h + 4;
  Object.assign(run.game.world.player, { x: e.x, y, prevBottom: y, vx: 0, vy: 120, onGround: false, jumping: false, invuln: 99 });
  const stomp = tickRun(run).find((ev) => ev.type === 'stomp' && ev.kind === e.kind);
  assert.ok(stomp, `the ${e.kind} at x ${e.x} is stomped`);
  return stomp.result;
}

function stompSnakeOf(run, part) {
  const { world, level } = run.game;
  const snake = world.enemies.find((e) => e.kind === 'snake' && roomIndex(level, e.x) === part);
  assert.ok(snake, `a snake in part ${part + 1}`);
  const from = run.events.length;
  assert.equal(stompOnce(run, snake), 'defeated');
  return run.events.slice(from);
}

function stompOut(run, e, safeCol) {
  const lives = e.lives;
  for (let stomp = 1; stomp <= lives; stomp++) {
    parkOnGround(run, safeCol);
    tickUntil(run, () => !e.hidden && !e.inert && e.onGround && e.dizzy === 0, `the ${e.kind} is ready for stomp ${stomp}`);
    assert.equal(stompOnce(run, e), stomp < lives ? 'hurt' : 'defeated', `stomp ${stomp} of ${lives} on the ${e.kind}`);
  }
}

function takePortal(run, index) {
  const { world, level } = run.game;
  const gate = world.portals[index];
  assert.equal(gate.open, true, `portal ${index + 1} is open`);
  standAt(world.player, gate.x, gate.y);
  world.player.invuln = 99;
  const warp = tickRun(run).find((ev) => ev.type === 'warp');
  const x = level.rooms[index + 1].left + 1.5 * TILE;
  assert.deepEqual(warp?.to, { x, y: solidTop(level, Math.floor(x / TILE)) }, `portal ${index + 1} drops the chicken at the start of part ${index + 2}`);
}

function wakeMonkey(run) {
  const { world, level } = run.game;
  const monkey = world.enemies.find((e) => e.kind === 'monkey');
  assert.equal(monkey?.mode, 'asleep');
  const col = Math.floor(monkey.x / TILE);
  const near = [-3, 3, -2, 2, -1, 1, 0].map((d) => col + d).find((c) => roomIndex(level, (c + 0.5) * TILE) === 1 && solidTop(level, c) < level.height);
  parkOnGround(run, near);
  tickUntil(run, () => monkey.mode === 'awake', 'the monkey wakes');
  return monkey;
}

function finishForestLevel(def) {
  const run = startForestLevel(def);
  const { game } = run;
  const { level } = game;
  const opens = (events, i) => events.some((ev) => ev.type === 'portalOpen' && ev.x === level.portals[i].x);

  assert.ok(opens(stompSnakeOf(run, 0), 0), 'snake 1 opens portal 1');
  takePortal(run, 0);
  assert.deepEqual(game.checkpoint, { x: level.checkpoint.x, y: level.checkpoint.y }, 'portal 1 drops the chicken on the savepoint');

  const monkey = wakeMonkey(run);
  assert.ok(opens(stompSnakeOf(run, 1), 1), 'snake 2 opens portal 2');
  takePortal(run, 1);
  assert.equal(monkey.mode, 'arriving', 'the awake monkey follows through portal 2');
  tickUntil(run, () => monkey.mode === 'awake' && !monkey.hidden, 'the monkey arrives');
  assert.equal(roomIndex(level, monkey.x), 2, 'the monkey arrives in part 3');

  const lastSnake = stompSnakeOf(run, 2);
  assert.equal(ofType(lastSnake, 'grandmaOut').length, level.house ? 1 : 0, 'the grandmother comes out exactly when the last snake dies');
  if (level.house) {
    assert.ok(game.world.house, 'the house stands while the grandmother lives');
    assert.equal(game.world.goal.locked, true, 'the crystal is locked while the grandmother lives');
  }
  const safeCol = level.rooms[2].left / TILE + 1;
  const nextLock = () => game.world.enemies.find((o) => LOCKS.has(o.kind));
  for (let e = nextLock(); e; e = nextLock()) {
    assert.equal(game.world.goal.locked, true, `the crystal is locked while the ${e.kind} lives`);
    stompOut(run, e, safeCol);
  }

  const { goal, player } = game.world;
  assert.equal(goal.locked, false, 'every lock is beaten');
  standAt(player, goal.x, goal.y);
  player.invuln = 99;
  assert.ok(tickRun(run).some((ev) => ev.type === 'goal'), 'the chicken takes the crystal');
  return run;
}

test('level15 can be finished in a scripted run', () => {
  const def = levels.find((d) => d.id === 'level15');
  const { game, events } = finishForestLevel(def);
  const last = levels.indexOf(def) === levels.length - 1;
  assert.equal(game.state, last ? 'victory' : 'levelComplete');
  assert.equal(ofType(events, 'savepoint').length, 1);
  assert.deepEqual(game.checkpoint, { x: game.level.checkpoint.x, y: game.level.checkpoint.y });
  assert.equal(ofType(events, 'warp').length, 2);
  assert.equal(ofType(events, 'goalOpen').length, 1);
  assert.equal(events.filter((ev) => ev.type === 'stomp' && ev.kind === 'monkey').length, MONKEY.lives);
  assert.deepEqual(ofType(events, 'death'), []);
});

test('level16 can be finished in a scripted run', () => {
  const def = levels.find((d) => d.id === 'level16');
  const { game, events } = finishForestLevel(def);
  const last = levels.indexOf(def) === levels.length - 1;
  assert.equal(game.state, last ? 'victory' : 'levelComplete');
  assert.equal(ofType(events, 'savepoint').length, 1);
  assert.deepEqual(game.checkpoint, { x: game.level.checkpoint.x, y: game.level.checkpoint.y });
  assert.equal(ofType(events, 'warp').length, 2);
  assert.equal(ofType(events, 'goalOpen').length, 1);
  assert.equal(events.filter((ev) => ev.type === 'stomp' && ev.kind === 'monkey').length, MONKEY.lives);
  assert.deepEqual(ofType(events, 'death'), []);
});

test('level17 can be finished in a scripted run including the grandmother', () => {
  const def = levels.find((d) => d.id === 'level17');
  const { game, events } = finishForestLevel(def);
  assert.equal(game.state, 'victory');
  assert.equal(ofType(events, 'savepoint').length, 1);
  assert.deepEqual(game.checkpoint, { x: game.level.checkpoint.x, y: game.level.checkpoint.y });
  assert.equal(ofType(events, 'warp').length, 2);
  assert.equal(ofType(events, 'grandmaOut').length, 1);
  assert.equal(events.filter((ev) => ev.type === 'stomp' && ev.kind === 'monkey').length, MONKEY.lives);
  const grandma = events.filter((ev) => ev.type === 'stomp' && ev.kind === 'grandma');
  assert.deepEqual(grandma.map((ev) => ev.result), ['hurt', 'hurt', 'hurt', 'defeated']);
  const defeat = events.indexOf(grandma[grandma.length - 1]);
  assert.deepEqual(events.slice(defeat + 1, defeat + 3).map((ev) => ev.type), ['houseGone', 'goalOpen'], 'her defeat removes the house and then opens the crystal');
  assert.equal(ofType(events, 'houseGone').length, 1);
  assert.equal(game.world.house, null);
  assert.equal(ofType(events, 'goalOpen').length, 1);
  assert.deepEqual(ofType(events, 'death'), []);
});
