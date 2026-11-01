import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TILE, STEP, ROWS, PLAYER, RULES, MONKEY } from '../src/config.js';
import { createEnemy, updateEnemy, stompEnemy } from '../src/core/enemies.js';
import { createWorld, recallMonkey } from '../src/core/world.js';
import { startArriving } from '../src/core/monkey.js';
import { createGame } from '../src/core/game.js';
import { parseLevel, tileAt, roomAt } from '../src/core/level.js';
import { runSteps, types } from './helpers.js';

const IDLE = { left: false, right: false, jumpHeld: false, jumpPressed: false };
const COLS = 92;
const WALLS = [30, 61];
const FLOOR = (ROWS - 1) * TILE;
const BUBBLE_COL = 40;
const MARKS = { 0: 'C', 27: 'O', 28: 'n', 32: 'K', [BUBBLE_COL]: 'M', 58: 'O', 59: 'n', 90: 'n', 91: 'G' };
const DIZZY_STEPS = Math.ceil(MONKEY.dizzyTime / STEP) + 2;
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
const monkeyOf = (world) => world.enemies.find((e) => e.kind === 'monkey');
const monkeyEvents = (events) => events.filter((e) => e.type === 'monkeyState');
const tick = (game) => () => game.tick(STEP, IDLE);

function chickenAt(col, { facing = 1, y = FLOOR, onGround = true } = {}) {
  return { x: colX(col), y, w: PLAYER.w, h: PLAYER.h, facing, onGround, dead: false };
}

function awakeMonkey(level, col = BUBBLE_COL) {
  const m = createEnemy({ kind: 'monkey', x: colX(col), y: FLOOR });
  const beside = chickenAt(col);
  updateEnemy(m, STEP, level, beside);
  updateEnemy(m, STEP, level, beside);
  assert.equal(m.mode, 'awake');
  assert.equal(m.onGround, true);
  m.pending.length = 0;
  return m;
}

function standAt(p, x, y = FLOOR) {
  Object.assign(p, { x, y, prevBottom: y, vx: 0, vy: 0, onGround: true, jumping: false });
}

function dropOnto(p, m) {
  const y = m.y - m.h + 4;
  Object.assign(p, { x: m.x, y, prevBottom: y, vx: 0, vy: 120, onGround: false, jumping: false, invuln: 0 });
}

function stompAndWait(p, m, step) {
  dropOnto(p, m);
  const events = step();
  standAt(p, m.x - 3 * TILE);
  runSteps(DIZZY_STEPS, () => events.push(...step()));
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

function startGame() {
  const game = createGame([forestDef()]);
  game.confirm();
  while (game.state === 'intro') game.tick(STEP, IDLE);
  assert.equal(game.state, 'playing');
  return game;
}

function wake(game) {
  const m = monkeyOf(game.world);
  standAt(game.world.player, m.x - 3 * TILE);
  const events = game.tick(STEP, IDLE);
  assert.equal(m.mode, 'awake');
  return { m, events };
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

test('a sleeping monkey is inert and harmless', () => {
  const level = forest();
  const spec = level.enemies.find((e) => e.kind === 'monkey');
  const world = createWorld(level);
  const m = monkeyOf(world);
  assert.equal(m.mode, 'asleep');
  assert.equal(m.inert, true);
  assert.equal(m.hidden, false);
  assert.equal(m.lives, MONKEY.lives);
  assert.equal(m.w, MONKEY.w);
  assert.equal(m.h, MONKEY.h);
  assert.deepEqual([m.x, m.y], [spec.x, spec.y]);

  const p = world.player;
  standAt(p, m.x - (MONKEY.wakeRange + 1) * TILE);
  p.invuln = 0;
  const events = [];
  runSteps(Math.round(3 / STEP), () => events.push(...world.step(STEP, IDLE)));
  assert.equal(m.mode, 'asleep');
  assert.equal(m.inert, true);
  assert.deepEqual([m.x, m.y], [spec.x, spec.y], 'it floats at its bubble without falling');
  assert.deepEqual(monkeyEvents(events), []);
  assert.equal(p.dead, false);
  assert.ok(world.enemies.includes(m));
});

test('it wakes inside the wake range in its room and not outside it', () => {
  const level = forest({ marks: { [BUBBLE_COL]: '.', 33: 'M' } });
  const spec = level.enemies.find((e) => e.kind === 'monkey');
  const reach = MONKEY.wakeRange * TILE;
  const at = (x, extra = {}) => ({ ...chickenAt(0), x, ...extra });

  const staysAsleep = (player, why) => {
    const m = createEnemy(spec);
    runSteps(60, () => updateEnemy(m, STEP, level, player));
    assert.equal(m.mode, 'asleep', why);
    assert.equal(m.inert, true, why);
    assert.deepEqual(m.pending, [], why);
  };
  staysAsleep(at(spec.x + reach + 1), 'just outside the wake range');
  assert.notEqual(roomAt(level, spec.x - reach), roomAt(level, spec.x));
  staysAsleep(at(spec.x - reach), 'in range but in the room before');
  staysAsleep(at(spec.x + TILE, { dead: true }), 'a dead chicken');
  staysAsleep(null, 'no chicken');

  for (const x of [spec.x + reach, spec.x - 1.5 * TILE]) {
    const m = createEnemy(spec);
    updateEnemy(m, STEP, level, at(x));
    assert.equal(m.mode, 'awake');
    assert.equal(m.inert, false);
    assert.equal(m.hidden, false);
    assert.deepEqual(m.pending, [{ type: 'monkeyState', state: 'awake', lives: MONKEY.lives, woke: true }]);
  }

  const world = createWorld(forest());
  const m = monkeyOf(world);
  standAt(world.player, m.x - 3 * TILE);
  const events = world.step(STEP, IDLE);
  assert.deepEqual(monkeyEvents(events), [{ type: 'monkeyState', state: 'awake', lives: MONKEY.lives, woke: true }]);
  assert.deepEqual(m.pending, [], 'the world drains the wake event');
});

test('the monkey chases lazily at 150, well below the chicken walk speed', () => {
  assert.equal(MONKEY.speed, 150);
  assert.ok(MONKEY.speed < PLAYER.walkSpeed);
});

test('an awake monkey chases the chicken and jumps a wall and a gap', () => {
  const level = forest({ blocks: { 44: 2 }, pits: [50, 51] });
  const m = awakeMonkey(level);
  const chicken = chickenAt(55);
  updateEnemy(m, STEP, level, chicken);
  assert.equal(m.dir, 1);
  assert.equal(m.vx, MONKEY.speed);

  for (const col of [55, 36]) {
    chicken.x = colX(col);
    let highest = m.y;
    let lowest = m.y;
    runSteps(Math.round(6 / STEP), () => {
      updateEnemy(m, STEP, level, chicken);
      highest = Math.min(highest, m.y);
      lowest = Math.max(lowest, m.y);
    });
    assert.ok(highest <= FLOOR - 2 * TILE, `climbed over the two-tile wall towards column ${col}, highest feet ${highest}`);
    assert.equal(lowest, FLOOR, `never dropped into the gap towards column ${col}`);
    assert.equal(m.alive, true);
    assert.equal(m.mode, 'awake');
    assert.ok(Math.abs(m.x - chicken.x) <= MONKEY.speed * STEP, `caught up with the chicken at column ${col}: x ${m.x}`);
    assert.equal(m.y, FLOOR);
  }

  const flat = forest();
  const under = awakeMonkey(flat);
  updateEnemy(under, STEP, flat, chickenAt(BUBBLE_COL, { y: FLOOR - 3 * TILE }));
  assert.ok(under.vy < 0, 'jumps towards a chicken standing clearly above it');

  const below = awakeMonkey(flat);
  updateEnemy(below, STEP, flat, chickenAt(BUBBLE_COL, { y: FLOOR - 3 * TILE, onGround: false }));
  assert.equal(below.onGround, true, 'does not jump up into a chicken in mid-air coming down to stomp it');
});

test('a stomp costs one life and makes it dizzy, the fifth stomp defeats it', () => {
  const level = forest();
  const m = awakeMonkey(level);
  const chicken = chickenAt(BUBBLE_COL + 3);
  for (let lives = MONKEY.lives - 1; lives >= 1; lives--) {
    assert.equal(stompEnemy(m), 'hurt');
    assert.equal(m.lives, lives);
    assert.equal(m.dizzy, MONKEY.dizzyTime);
    assert.deepEqual(m.pending.splice(0), [{ type: 'monkeyState', state: 'awake', lives }]);
    assert.equal(stompEnemy(m), 'bounce', 'a stomp while dizzy only bounces');
    assert.equal(m.lives, lives);
    assert.deepEqual(m.pending, []);
    const x = m.x;
    runSteps(Math.round(MONKEY.dizzyTime / STEP) - 1, () => updateEnemy(m, STEP, level, chicken));
    assert.equal(m.x, x, 'stands still while dizzy');
    runSteps(3, () => updateEnemy(m, STEP, level, chicken));
    assert.equal(m.dizzy, 0);
    assert.ok(m.x > x, 'chases again once the dizziness wears off');
  }
  assert.equal(stompEnemy(m), 'defeated');
  assert.equal(m.alive, false);
  assert.equal(m.lives, 0);
  assert.deepEqual(m.pending, [{ type: 'monkeyState', state: 'dead', lives: 0 }]);

  const world = createWorld(forest());
  const wm = monkeyOf(world);
  const p = world.player;
  const step = () => world.step(STEP, IDLE);
  standAt(p, wm.x - 3 * TILE);
  step();
  dropOnto(p, wm);
  const hurt = step();
  const watched = (events) => events.filter((e) => e.type === 'stomp' || e.type === 'monkeyState');
  assert.deepEqual(watched(hurt), [
    { type: 'stomp', kind: 'monkey', result: 'hurt', x: wm.x, y: wm.y - wm.h },
    { type: 'monkeyState', state: 'awake', lives: MONKEY.lives - 1 },
  ]);
  assert.equal(p.vx, wm.dir * MONKEY.knockback, 'the same knock-back as the spider and shark');
  standAt(p, wm.x - 3 * TILE);
  runSteps(DIZZY_STEPS, step);
  for (let i = 0; i < MONKEY.lives - 2; i++) stompAndWait(p, wm, step);
  dropOnto(p, wm);
  const last = step();
  assert.deepEqual(watched(last).map((e) => e.result ?? e.state), ['defeated', 'dead']);
  assert.deepEqual(monkeyEvents(last), [{ type: 'monkeyState', state: 'dead', lives: 0 }]);
  assert.equal(monkeyOf(world), undefined);
});

test('a monkey that falls below the map comes back next to the chicken', () => {
  const level = forest({ pits: [44, 45, 46, 47, 48] });
  const m = awakeMonkey(level);
  const chicken = chickenAt(53, { facing: 1 });
  let deepest = m.y;
  for (let i = 0; m.mode === 'awake' && i < 5 / STEP; i++) {
    updateEnemy(m, STEP, level, chicken);
    deepest = Math.max(deepest, m.y);
    assert.equal(m.alive, true, 'falling into a pit is never a free kill');
  }
  assert.equal(m.mode, 'arriving');
  assert.ok(deepest - m.h > level.height, `fell out of the map first, feet at ${deepest}`);
  assert.equal(m.hidden, true);
  assert.equal(m.inert, true);

  let hiddenSteps = 0;
  while (m.mode === 'arriving' && hiddenSteps < 5 / STEP) {
    updateEnemy(m, STEP, level, chicken);
    hiddenSteps++;
    assert.equal(m.alive, true);
  }
  assert.ok(Math.abs(hiddenSteps * STEP - MONKEY.arriveDelay) <= 1.5 * STEP, `hidden for ${hiddenSteps} steps`);
  assert.equal(m.mode, 'awake');
  assert.equal(m.hidden, false);
  assert.equal(m.inert, false);
  assert.equal(m.lives, MONKEY.lives);
  assert.equal(m.x, chicken.x - 4 * TILE, 'four tiles behind her');
  assert.equal(m.y, FLOOR);
  assert.equal(m.onGround, true);
});

test('an arriving monkey never lands inside a block or over a pit, and waits hidden while there is nowhere to stand', () => {
  const arriving = (level) => {
    const m = monkeyOf(createWorld(level));
    startArriving(m);
    return m;
  };
  const arriveSteps = Math.ceil(MONKEY.arriveDelay / STEP) + 1;

  const blocked = forest({ blocks: { 36: 3 } });
  const m = arriving(blocked);
  runSteps(arriveSteps, () => updateEnemy(m, STEP, blocked, chickenAt(40, { facing: 1 })));
  assert.equal(m.mode, 'awake');
  assert.equal(m.x, colX(44), 'the block behind her sends it to her other side');
  assert.equal(m.y, FLOOR);
  assert.equal(insideSolid(blocked, m), false);

  const pits = forest({ pits: [36, 44] });
  const w = arriving(pits);
  runSteps(arriveSteps * 2, () => updateEnemy(w, STEP, pits, chickenAt(40, { facing: -1 })));
  assert.equal(w.mode, 'arriving', 'pits on both sides: it keeps waiting');
  assert.equal(w.hidden, true);
  assert.equal(w.alive, true);
  updateEnemy(w, STEP, pits, chickenAt(41, { facing: -1 }));
  assert.equal(w.mode, 'awake');
  assert.equal(w.x, colX(45));
  assert.equal(w.y, FLOOR);
});

test('the monkey progress on game follows monkeyState events', () => {
  const game = createGame([forestDef()]);
  assert.deepEqual(game.monkey, { state: 'asleep', lives: MONKEY.lives });
  game.confirm();
  while (game.state === 'intro') game.tick(STEP, IDLE);

  const { m, events } = wake(game);
  assert.deepEqual(monkeyEvents(events), [{ type: 'monkeyState', state: 'awake', lives: MONKEY.lives, woke: true }], 'the event reaches the game queue');
  assert.deepEqual(game.monkey, { state: 'awake', lives: MONKEY.lives });

  stompAndWait(game.world.player, m, tick(game));
  assert.deepEqual(game.monkey, { state: 'awake', lives: MONKEY.lives - 1 });

  game.quitToTitle();
  assert.deepEqual(game.monkey, { state: 'asleep', lives: MONKEY.lives }, 'the title preview starts it asleep');
  assert.equal(monkeyOf(game.world).mode, 'asleep');

  game.confirm();
  while (game.state === 'intro') game.tick(STEP, IDLE);
  wake(game);
  assert.equal(game.monkey.state, 'awake');
  game.newGame();
  assert.deepEqual(game.monkey, { state: 'asleep', lives: MONKEY.lives }, 'entering a level starts it asleep');
  assert.equal(monkeyOf(game.world).mode, 'asleep');
});

test('a monkey killed in part 2 is not rebuilt after the chicken dies in part 3', () => {
  const game = startGame();
  const { m } = wake(game);
  for (let i = 0; i < MONKEY.lives; i++) stompAndWait(game.world.player, m, tick(game));
  assert.deepEqual(game.monkey, { state: 'dead', lives: 0 });
  assert.equal(monkeyOf(game.world), undefined);

  game.checkpoint = { ...game.level.checkpoint };
  const part3 = game.level.rooms[2];
  standAt(game.world.player, part3.left + 2 * TILE);
  runSteps(10, tick(game));
  assert.equal(roomAt(game.level, game.world.player.x), part3);

  const events = dieAndRespawn(game);
  assert.ok(types(events).includes('respawn'));
  assert.equal(monkeyOf(game.world), undefined);
  assert.deepEqual(game.monkey, { state: 'dead', lives: 0 });
});

test('after a respawn an awake monkey is back asleep in its bubble with the lives it had left, visible and inert, and wakes again near the chicken with a woke-flagged event', () => {
  const game = startGame();
  const { m } = wake(game);
  stompAndWait(game.world.player, m, tick(game));
  assert.deepEqual(game.monkey, { state: 'awake', lives: MONKEY.lives - 1 });

  game.checkpoint = { ...game.level.checkpoint };
  dieAndRespawn(game);
  const level = game.level;
  const spec = level.enemies.find((e) => e.kind === 'monkey');
  const p = game.world.player;
  const back = monkeyOf(game.world);
  assert.deepEqual([p.x, p.y], [level.checkpoint.x, level.checkpoint.y]);
  assert.equal(back.mode, 'asleep');
  assert.equal(back.hidden, false);
  assert.equal(back.inert, true);
  assert.equal(back.lives, MONKEY.lives - 1);
  assert.deepEqual([back.x, back.y], [spec.x, spec.y]);

  assert.ok(Math.abs(back.x - p.x) > MONKEY.wakeRange * TILE, 'the savepoint is outside the wake range');
  p.invuln = 0;
  const waiting = [];
  runSteps(Math.round(2 / STEP), () => waiting.push(...game.tick(STEP, IDLE)));
  assert.equal(back.mode, 'asleep', 'it stays in its bubble until she comes near');
  assert.equal(back.inert, true);
  assert.deepEqual([back.x, back.y], [spec.x, spec.y]);
  assert.deepEqual(monkeyEvents(waiting), []);
  assert.equal(p.dead, false);

  const { events } = wake(game);
  assert.deepEqual(monkeyEvents(events), [{ type: 'monkeyState', state: 'awake', lives: MONKEY.lives - 1, woke: true }]);
  assert.equal(back.inert, false);
  assert.equal(back.hidden, false);
  assert.equal(back.lives, MONKEY.lives - 1);
  assert.deepEqual(game.monkey, { state: 'awake', lives: MONKEY.lives - 1 });
});

test('recallMonkey sends an awake monkey back into arriving and leaves a sleeping one in its bubble', () => {
  const world = createWorld(forest());
  const m = monkeyOf(world);
  recallMonkey(world);
  assert.equal(m.mode, 'asleep');
  assert.equal(m.hidden, false);

  standAt(world.player, m.x - 3 * TILE);
  world.step(STEP, IDLE);
  assert.equal(m.mode, 'awake');
  recallMonkey(world);
  assert.equal(m.mode, 'arriving');
  assert.equal(m.hidden, true);
  assert.equal(m.inert, true);
  assert.equal(m.lives, MONKEY.lives);
});
