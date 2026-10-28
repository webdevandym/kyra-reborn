import { test } from 'node:test';
import assert from 'node:assert/strict';
import { swipeStep } from '../src/touch/swipe.js';

test('a long horizontal swipe left or right is detected', () => {
  assert.equal(swipeStep(-80, 5), -1);
  assert.equal(swipeStep(80, -5), 1);
});

test('a short or mostly vertical drag is not a swipe', () => {
  assert.equal(swipeStep(-20, 0), 0);
  assert.equal(swipeStep(60, 90), 0);
  assert.equal(swipeStep(0, 0), 0);
});
