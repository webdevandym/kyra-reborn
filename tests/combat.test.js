import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PLAYER } from '../src/config.js';
import { classifyContact } from '../src/core/combat.js';

const enemy = { x: 200, y: 450, w: 30, h: 38 };
const enemyTop = 450 - 38;
const player = (x, y, vy, prevBottom = y) => ({ x, y, w: 34, h: 40, vy, prevBottom });

test('no overlap means no contact', () => {
  assert.equal(classifyContact(player(100, 450, 0), enemy), null);
  assert.equal(classifyContact(player(200, 300, 400), enemy), null);
});

test('falling onto the enemy from above is a stomp', () => {
  assert.equal(classifyContact(player(205, enemyTop + 5, 400, enemyTop - 3), enemy), 'stomp');
});

test('walking into the enemy is a hit', () => {
  assert.equal(classifyContact(player(180, 450, 0), enemy), 'hit');
});

test('touching the enemy while rising is a hit', () => {
  assert.equal(classifyContact(player(200, enemyTop + 10, -500, enemyTop + 18), enemy), 'hit');
});

test('the stomp tolerance edge: exactly at tolerance stomps, one pixel lower hits', () => {
  const tol = PLAYER.stompTolerance;
  assert.equal(classifyContact(player(200, enemyTop + tol + 4, 300, enemyTop + tol), enemy), 'stomp');
  assert.equal(classifyContact(player(200, enemyTop + tol + 5, 300, enemyTop + tol + 1), enemy), 'hit');
});
