import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STEP, RULES } from '../src/config.js';
import { createGame } from '../src/core/game.js';
import { mapFromBottom } from './helpers.js';

const IDLE = { left: false, right: false, jumpHeld: false, jumpPressed: false };
const RIGHT = { ...IDLE, right: true };

const def = (id, rows) => ({ id, map: mapFromBottom(rows) });
const EMPTY_RUN = def('run', ['C' + '.'.repeat(38) + 'G', '#'.repeat(40)]);
const FIVE_CRYSTALS = def('five', ['C.rrrrr' + '.'.repeat(30) + 'G', '#'.repeat(38)]);
const CRYSTALS_THEN_CARROT = def('carrot', ['C.rr......c' + '.'.repeat(20) + 'G', '#'.repeat(32)]);
const SHORT = def('short', ['C...G', '#####']);

function play(game, input, seconds) {
  const events = [];
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i++) events.push(...game.tick(STEP, input));
  return events;
}

function playUntil(game, input, type, maxSeconds = 10) {
  const events = [];
  const steps = Math.round(maxSeconds / STEP);
  for (let i = 0; i < steps; i++) {
    const batch = game.tick(STEP, input);
    events.push(...batch);
    if (batch.some((e) => e.type === type)) return events;
  }
  assert.fail(`no '${type}' event within ${maxSeconds}s`);
}

function start(game) {
  game.confirm();
  play(game, IDLE, RULES.introTime + STEP);
  assert.equal(game.state, 'playing');
}

const types = (events) => events.map((e) => e.type);

test('a new game waits on the title screen with 3 lives and no points', () => {
  const game = createGame([EMPTY_RUN]);
  assert.equal(game.state, 'title');
  assert.equal(game.lives, RULES.startLives);
  assert.equal(game.points, 0);
  const x = game.world.player.x;
  assert.deepEqual(play(game, RIGHT, 1), []);
  assert.equal(game.world.player.x, x, 'nothing moves on the title screen');
});

test('confirm on the title shows the level intro, then play starts', () => {
  const game = createGame([EMPTY_RUN]);
  game.confirm();
  assert.equal(game.state, 'intro');
  const events = play(game, RIGHT, RULES.introTime / 2);
  assert.deepEqual(types(events), ['levelStart']);
  assert.equal(game.state, 'intro');
  play(game, RIGHT, RULES.introTime);
  assert.equal(game.state, 'playing');
});

test('every 5 crystals give an extra life', () => {
  const game = createGame([FIVE_CRYSTALS]);
  start(game);
  const events = play(game, RIGHT, 1.5);
  assert.equal(game.points, 5);
  assert.equal(game.lives, RULES.startLives + 1);
  assert.equal(types(events).filter((t) => t === 'life').length, 1);
  assert.deepEqual(game.levelCrystals(), { got: 5, total: 5 });
});

test('lives never go above the cap', () => {
  const game = createGame([FIVE_CRYSTALS]);
  start(game);
  game.lives = RULES.maxLives;
  const events = play(game, RIGHT, 1.5);
  assert.equal(game.lives, RULES.maxLives);
  assert.equal(types(events).filter((t) => t === 'life').length, 0);
});

test('touching a carrot costs a life and restarts the level but keeps collected crystals', () => {
  const game = createGame([CRYSTALS_THEN_CARROT]);
  start(game);
  const events = playUntil(game, RIGHT, 'death');
  assert.ok(types(events).includes('hit'));
  assert.equal(game.state, 'dying');
  assert.equal(game.lives, RULES.startLives - 1);
  assert.equal(game.points, 2);

  const after = play(game, IDLE, RULES.dyingTime + STEP);
  assert.ok(types(after).includes('respawn'));
  assert.equal(game.state, 'playing');
  assert.equal(game.world.player.x, game.level.spawn.x, 'chicken back at the start');
  assert.equal(game.world.crystals.length, 0, 'collected crystals stay collected');
  assert.equal(game.world.enemies.length, 1, 'the carrot is back');
  assert.equal(game.points, 2);
});

test('losing the last life is game over, and confirm starts again from the picked level (level 1 by default) with fresh lives', () => {
  const game = createGame([CRYSTALS_THEN_CARROT, EMPTY_RUN], { best: 1 });
  start(game);
  game.lives = 1;
  playUntil(game, RIGHT, 'death');
  playUntil(game, IDLE, 'gameOver');
  assert.equal(game.state, 'gameOver');
  assert.equal(game.best, 2);

  game.confirm();
  assert.equal(game.state, 'intro');
  assert.equal(game.levelIndex, 0);
  assert.equal(game.lives, RULES.startLives);
  assert.equal(game.points, 0);
  assert.equal(game.world.crystals.length, 2, 'crystals are back for a new game');
});

test('the goal of a middle level shows level complete, and confirm moves to the next level', () => {
  const game = createGame([SHORT, FIVE_CRYSTALS]);
  start(game);
  playUntil(game, RIGHT, 'levelComplete');
  assert.equal(game.state, 'levelComplete');

  game.confirm();
  assert.equal(game.state, 'intro');
  assert.equal(game.levelIndex, 1);
  assert.deepEqual(game.levelCrystals(), { got: 0, total: 5 });
});

test('confirming twice on level complete never skips a level', () => {
  const game = createGame([SHORT, SHORT, FIVE_CRYSTALS]);
  start(game);
  playUntil(game, RIGHT, 'levelComplete');
  game.confirm();
  game.confirm();
  assert.equal(game.state, 'intro');
  assert.equal(game.levelIndex, 1);
});

test('the goal of the last level is victory, and the best score is kept', () => {
  const game = createGame([SHORT, FIVE_CRYSTALS], { best: 3 });
  start(game);
  playUntil(game, RIGHT, 'levelComplete');
  game.confirm();
  playUntil(game, RIGHT, 'victory');
  assert.equal(game.state, 'victory');
  assert.equal(game.best, 5);

  game.confirm();
  assert.equal(game.state, 'intro');
  assert.equal(game.levelIndex, 0);
  assert.equal(game.points, 0);
});

test('pause freezes play and only toggles from playing or paused', () => {
  const game = createGame([EMPTY_RUN]);
  game.togglePause();
  assert.equal(game.state, 'title');
  start(game);
  game.togglePause();
  assert.equal(game.state, 'paused');
  const x = game.world.player.x;
  play(game, RIGHT, 1);
  assert.equal(game.world.player.x, x);
  game.togglePause();
  assert.equal(game.state, 'playing');
});

test('quitting to the title without a pick shows the first level', () => {
  const game = createGame([SHORT, EMPTY_RUN]);
  start(game);
  playUntil(game, RIGHT, 'levelComplete');
  game.confirm();
  game.quitToTitle();
  assert.equal(game.state, 'title');
  assert.equal(game.levelIndex, 0);
});

test('picking a level on the title rebuilds the preview world for that level', () => {
  const game = createGame([SHORT, FIVE_CRYSTALS]);
  assert.equal(game.selectedIndex, 0);
  assert.equal(game.selectLevel(1), true);
  assert.equal(game.state, 'title');
  assert.equal(game.selectedIndex, 1);
  assert.equal(game.levelIndex, 1);
  assert.equal(game.world.level, game.levels[1]);
  assert.deepEqual(game.levelCrystals(), { got: 0, total: 5 });
  assert.deepEqual(play(game, RIGHT, 1), [], 'the preview does not move');
});

test('selectLevel clamps to the level list and reports whether the pick changed', () => {
  const game = createGame([SHORT, EMPTY_RUN, FIVE_CRYSTALS]);
  assert.equal(game.selectLevel(-3), false);
  assert.equal(game.selectedIndex, 0);
  assert.equal(game.selectLevel(99), true);
  assert.equal(game.selectedIndex, 2);
  assert.equal(game.selectLevel(2), false);
  assert.equal(game.selectLevel(Number.NaN), false);
  assert.equal(game.selectLevel(1.5), false);
  assert.equal(game.selectLevel('1'), false);
  assert.equal(game.selectedIndex, 2);
  assert.equal(game.levelIndex, 2);
});

test('selectLevel is ignored outside the title screen', () => {
  const game = createGame([SHORT, EMPTY_RUN]);
  start(game);
  const world = game.world;
  assert.equal(game.selectLevel(1), false);
  game.togglePause();
  assert.equal(game.selectLevel(1), false);
  assert.equal(game.selectedIndex, 0);
  assert.equal(game.levelIndex, 0);
  assert.equal(game.world, world);
});

test('play on the title starts the picked level', () => {
  const game = createGame([SHORT, EMPTY_RUN, FIVE_CRYSTALS]);
  game.selectLevel(2);
  game.confirm();
  assert.equal(game.state, 'intro');
  assert.equal(game.levelIndex, 2);
  assert.deepEqual(game.tick(STEP, IDLE).filter((e) => e.type === 'levelStart'), [{ type: 'levelStart', index: 2 }]);
  assert.equal(game.lives, RULES.startLives);
  assert.equal(game.points, 0);
});

test('game over on a picked level restarts that level with fresh lives and no points', () => {
  const game = createGame([EMPTY_RUN, CRYSTALS_THEN_CARROT, SHORT]);
  game.selectLevel(1);
  start(game);
  assert.equal(game.levelIndex, 1);
  game.lives = 1;
  playUntil(game, RIGHT, 'death');
  playUntil(game, IDLE, 'gameOver');
  assert.equal(game.points, 2);

  game.confirm();
  assert.equal(game.state, 'intro');
  assert.equal(game.levelIndex, 1);
  assert.equal(game.lives, RULES.startLives);
  assert.equal(game.points, 0);
  assert.equal(game.world.crystals.length, 2);
});

test('starting on a later level and finishing the last one is victory, and play again restarts the pick', () => {
  const game = createGame([EMPTY_RUN, SHORT, FIVE_CRYSTALS]);
  game.selectLevel(1);
  start(game);
  playUntil(game, RIGHT, 'levelComplete');
  game.confirm();
  assert.equal(game.levelIndex, 2);
  playUntil(game, RIGHT, 'victory');
  assert.equal(game.state, 'victory');
  assert.equal(game.best, 5);

  game.confirm();
  assert.equal(game.state, 'intro');
  assert.equal(game.levelIndex, 1);
  assert.equal(game.points, 0);
});

test('quitting to the title keeps the pick and shows that level again with its crystals back', () => {
  const game = createGame([SHORT, FIVE_CRYSTALS, SHORT]);
  game.selectLevel(1);
  start(game);
  play(game, RIGHT, 1);
  assert.ok(game.collected.size > 0);
  game.togglePause();
  game.quitToTitle();
  assert.equal(game.state, 'title');
  assert.equal(game.selectedIndex, 1);
  assert.equal(game.levelIndex, 1);
  assert.equal(game.world.level, game.levels[1]);
  assert.equal(game.collected.size, 0);
  assert.equal(game.world.crystals.length, 5);
});

test('falling into a gap with the last life is game over, and try again restarts the picked level', () => {
  const PIT = def('pit', ['C' + '.'.repeat(16) + 'G', '##...' + '#'.repeat(13)]);
  const game = createGame([EMPTY_RUN, PIT]);
  game.selectLevel(1);
  start(game);
  game.lives = 1;
  playUntil(game, RIGHT, 'death');
  playUntil(game, IDLE, 'gameOver');
  game.confirm();
  assert.equal(game.state, 'intro');
  assert.equal(game.levelIndex, 1);
  assert.equal(game.lives, RULES.startLives);
});

function playCounting(game, input, seconds) {
  let playing = 0;
  const events = [];
  for (let i = 0; i < Math.round(seconds / STEP); i++) {
    if (game.state === 'playing') playing++;
    events.push(...game.tick(STEP, input));
  }
  return { playing, events };
}

const near = (a, b) => Math.abs(a - b) < 1e-9;

test('levelTime starts at 0 and counts only playing steps, not the intro or a pause', () => {
  const game = createGame([EMPTY_RUN]);
  game.confirm();
  assert.equal(game.levelTime, 0);
  const { playing } = playCounting(game, IDLE, RULES.introTime + 0.5);
  assert.ok(playing > 0);
  assert.ok(near(game.levelTime, playing * STEP), `${game.levelTime} vs ${playing * STEP}`);
  const before = game.levelTime;
  game.togglePause();
  playCounting(game, IDLE, 1);
  assert.equal(game.levelTime, before);
});

test('levelTime keeps running through a lost life and skips the dying pause', () => {
  const game = createGame([CRYSTALS_THEN_CARROT]);
  game.confirm();
  const { playing, events } = playCounting(game, RIGHT, RULES.introTime + 3);
  assert.ok(types(events).includes('respawn'));
  assert.ok(near(game.levelTime, playing * STEP), `${game.levelTime} vs ${playing * STEP}`);
});

test('levelTime includes the step that reaches the goal, stops on the end card and resets on the next level', () => {
  const game = createGame([SHORT, SHORT]);
  game.confirm();
  const { playing, events } = playCounting(game, RIGHT, RULES.introTime + 3);
  assert.ok(types(events).includes('levelComplete'));
  assert.ok(near(game.levelTime, playing * STEP), `${game.levelTime} vs ${playing * STEP}`);
  playCounting(game, RIGHT, 1);
  assert.ok(near(game.levelTime, playing * STEP), 'the clock stops on the end card');
  game.confirm();
  assert.equal(game.levelTime, 0);
});
