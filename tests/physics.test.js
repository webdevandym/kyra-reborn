import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TILE, STEP } from '../src/config.js';
import { moveAndCollide, applyGravity } from '../src/core/physics.js';
import { testLevel, runSteps } from './helpers.js';

const body = (x, y, extra = {}) => ({ x, y, w: 30, h: 40, vx: 0, vy: 0, onGround: false, hitWall: 0, prevBottom: y, ...extra });

function fall(b, level, steps) {
  runSteps(steps, () => {
    applyGravity(b, STEP);
    moveAndCollide(b, STEP, level);
  });
}

test('a falling body lands on solid ground with its feet on the tile top', () => {
  const level = testLevel(['C........G', '##########']);
  const b = body(3 * TILE, 5 * TILE);
  fall(b, level, 240);
  assert.equal(b.y, 11 * TILE);
  assert.equal(b.vy, 0);
  assert.equal(b.onGround, true);
});

test('a body standing on the ground stays put and on the ground every step', () => {
  const level = testLevel(['C........G', '##########']);
  const b = body(3 * TILE, 11 * TILE);
  runSteps(60, () => {
    applyGravity(b, STEP);
    moveAndCollide(b, STEP, level);
    assert.equal(b.onGround, true);
  });
  assert.equal(b.y, 11 * TILE);
});

test('walking into a wall stops the body flush against it and reports the side', () => {
  const level = testLevel(['C....#...G', '##########']);
  const right = body(3 * TILE, 11 * TILE, { vx: 300 });
  runSteps(120, () => {
    right.vx = 300;
    moveAndCollide(right, STEP, level);
  });
  assert.equal(right.x, 5 * TILE - 15);
  assert.equal(right.hitWall, 1);

  const left = body(8 * TILE, 11 * TILE);
  runSteps(120, () => {
    left.vx = -300;
    moveAndCollide(left, STEP, level);
  });
  assert.equal(left.x, 6 * TILE + 15);
  assert.equal(left.hitWall, -1);
});

test('the level edges act as walls', () => {
  const level = testLevel(['C........G', '##########']);
  const b = body(1 * TILE, 11 * TILE);
  runSteps(120, () => {
    b.vx = -300;
    moveAndCollide(b, STEP, level);
  });
  assert.equal(b.x, 15);
  assert.equal(b.hitWall, -1);
});

test('jumping into a solid ceiling stops upward motion under it', () => {
  const level = testLevel(['..#.......', '..........', 'C........G', '##########']);
  const b = body(2.5 * TILE, 11 * TILE, { vy: -900 });
  moveAndCollide(b, STEP, level);
  runSteps(30, () => moveAndCollide(b, STEP, level));
  assert.equal(b.y - b.h, 9 * TILE);
  assert.equal(b.vy, 0);
});

test('one-way platforms can be jumped through from below and landed on from above', () => {
  const level = testLevel(['..===.....', '..........', 'C........G', '##########']);
  const b = body(3.5 * TILE, 11 * TILE, { vy: -900 });
  let passedAbove = false;
  runSteps(120, () => {
    applyGravity(b, STEP);
    moveAndCollide(b, STEP, level);
    if (b.y < 8 * TILE) passedAbove = true;
  });
  assert.ok(passedAbove, 'went up through the platform');
  assert.equal(b.y, 8 * TILE, 'landed on top of the platform');
  assert.equal(b.onGround, true);
});

test('one-way platforms never block sideways movement', () => {
  const level = testLevel(['..........', '..===.....', 'C........G', '##########']);
  const b = body(1 * TILE, 9.5 * TILE);
  runSteps(40, () => {
    b.vx = 300;
    moveAndCollide(b, STEP, level);
  });
  assert.equal(b.hitWall, 0);
  assert.ok(b.x > 3 * TILE);
});
