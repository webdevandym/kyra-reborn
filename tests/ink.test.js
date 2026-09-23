import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BOIL } from '../src/config.js';
import { mulberry32, setBoilTime, getBoilFrame, jitterPoints, ellipsePoints, rectPoints } from '../src/render/ink.js';

test('mulberry32 is deterministic and stays in [0, 1)', () => {
  const a = mulberry32(42);
  const b = mulberry32(42);
  for (let i = 0; i < 100; i++) {
    const v = a();
    assert.equal(v, b());
    assert.ok(v >= 0 && v < 1);
  }
});

test('the boil frame advances BOIL.fps times a second and freezes for reduced motion', () => {
  setBoilTime(0);
  assert.equal(getBoilFrame(), 0);
  setBoilTime(1);
  assert.equal(getBoilFrame(), BOIL.fps);
  setBoilTime(1, true);
  assert.equal(getBoilFrame(), 0);
});

test('jitter is stable within a boil frame, changes between frames and stays within the amount', () => {
  const points = [[0, 0], [10, 0], [10, 10]];
  setBoilTime(0);
  const first = jitterPoints(points, 7);
  assert.deepEqual(jitterPoints(points, 7), first);
  setBoilTime(1);
  assert.notDeepEqual(jitterPoints(points, 7), first);
  for (const [i, [x, y]] of jitterPoints(points, 7, 2).entries()) {
    assert.ok(Math.abs(x - points[i][0]) <= 2 && Math.abs(y - points[i][1]) <= 2);
  }
  setBoilTime(0);
});

test('ellipse and rectangle outlines have the requested shape', () => {
  const ring = ellipsePoints(0, 0, 10, 5, 8);
  assert.equal(ring.length, 8);
  assert.deepEqual(ring[0], [10, 0]);
  const rect = rectPoints(0, 0, 30, 60, 3);
  assert.equal(rect.length, 12);
  assert.deepEqual(rect[0], [0, 0]);
  assert.deepEqual(rect[3], [30, 0]);
  assert.deepEqual(rect[6], [30, 60]);
  assert.deepEqual(rect[9], [0, 60]);
});
