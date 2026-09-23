import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TILE, STEP, CARROT, ZOMBIE } from '../src/config.js';
import { createEnemy, updateEnemy, stompEnemy, ENEMY_KINDS } from '../src/core/enemies.js';
import { testLevel, runSteps } from './helpers.js';

function track(e, level, steps) {
  let minX = e.x;
  let maxX = e.x;
  let turns = 0;
  let lastDir = e.dir;
  runSteps(steps, () => {
    updateEnemy(e, STEP, level);
    minX = Math.min(minX, e.x);
    maxX = Math.max(maxX, e.x);
    if (e.dir !== lastDir) {
      turns++;
      lastDir = e.dir;
    }
  });
  return { minX, maxX, turns };
}

test('the registry knows carrots and zombies and rejects unknown kinds', () => {
  assert.deepEqual(Object.keys(ENEMY_KINDS).sort(), ['carrot', 'zombie']);
  assert.throws(() => createEnemy({ kind: 'dragon', x: 0, y: 0 }), /unknown enemy kind 'dragon'/);
});

test('a carrot starts walking left at carrot speed', () => {
  const level = testLevel(['C........c.G', '############']);
  const [spec] = level.enemies;
  const e = createEnemy(spec);
  assert.equal(e.w, CARROT.w);
  assert.equal(e.h, CARROT.h);
  updateEnemy(e, STEP, level);
  assert.equal(e.vx, -CARROT.speed);
  assert.ok(e.x < spec.x);
  assert.equal(e.y, spec.y, 'stays on the ground');
});

test('a carrot turns around at walls and keeps patrolling between them', () => {
  const level = testLevel(['C#....c...#G', '############']);
  const e = createEnemy(level.enemies[0]);
  const { minX, maxX, turns } = track(e, level, 60 * 120);
  assert.ok(minX >= 2 * TILE + e.w / 2 - 0.01, `minX ${minX}`);
  assert.ok(maxX <= 10 * TILE - e.w / 2 + 0.01, `maxX ${maxX}`);
  assert.ok(turns >= 4, `turned ${turns} times`);
});

test('a carrot never walks off a ledge', () => {
  const level = testLevel(['C...c.....G', '...###.....', '###########']);
  const e = createEnemy(level.enemies[0]);
  const { minX, maxX, turns } = track(e, level, 60 * 120);
  assert.ok(minX >= 3 * TILE - e.w / 2, `minX ${minX}`);
  assert.ok(maxX <= 6 * TILE + e.w / 2, `maxX ${maxX}`);
  assert.equal(e.y, 10 * TILE, 'still on top of the block');
  assert.ok(turns >= 4);
});

test('carrots patrol one-way platforms without falling off', () => {
  const level = testLevel(['.....c.....', '....====...', 'C.........G', '###########']);
  const e = createEnemy(level.enemies[0]);
  track(e, level, 30 * 120);
  assert.equal(e.y, 9 * TILE);
});

test('stomping a carrot defeats it', () => {
  const e = createEnemy({ kind: 'carrot', x: 100, y: 450 });
  assert.equal(stompEnemy(e), 'defeated');
  assert.equal(e.alive, false);
});

test('a big zombie shrinks, gets faster and dizzy on the first stomp and is defeated on the second', () => {
  const level = testLevel(['C.........Z..........G', '######################']);
  const e = createEnemy(level.enemies[0]);
  assert.equal(e.size, 'big');
  assert.equal(e.w, ZOMBIE.bigW);
  assert.equal(e.h, ZOMBIE.bigH);
  assert.equal(e.speed, ZOMBIE.bigSpeed);

  assert.equal(stompEnemy(e), 'shrunk');
  assert.equal(e.alive, true);
  assert.equal(e.size, 'small');
  assert.equal(e.w, ZOMBIE.smallW);
  assert.equal(e.h, ZOMBIE.smallH);
  assert.equal(e.speed, ZOMBIE.smallSpeed);
  assert.equal(e.dizzy, ZOMBIE.dizzyTime);

  const before = e.x;
  runSteps(60, () => updateEnemy(e, STEP, level));
  assert.ok(Math.abs(before - e.x) > ZOMBIE.bigSpeed, 'moves faster than a big zombie');
  assert.ok(e.dizzy < ZOMBIE.dizzyTime);
  assert.equal(e.y, 11 * TILE, 'feet stay on the ground after shrinking');

  assert.equal(stompEnemy(e), 'defeated');
  assert.equal(e.alive, false);
});
