import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TILE, STEP, MOVER } from '../src/config.js';
import { createMover, moverX, updateMovers } from '../src/core/platforms.js';

const SPEC = { id: '4,8', col: 4, row: 8, width: 3 * TILE, x: 4 * TILE, y: 8 * TILE };
const expected = (col, homeX, time) => homeX + MOVER.range * TILE * Math.sin((2 * Math.PI * time) / MOVER.period + col * MOVER.phasePerCol);
const near = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;

test('a moving cloud keeps its size and top, and starts at its column phase offset', () => {
  const m = createMover(SPEC);
  assert.equal(m.w, 3 * TILE);
  assert.equal(m.y, 8 * TILE);
  assert.equal(m.homeX, 4 * TILE);
  assert.ok(near(m.x, expected(4, 4 * TILE, 0)));
  assert.equal(m.dx, 0);
});

test('a moving cloud swings range tiles either side of home over one period', () => {
  const m = createMover(SPEC);
  for (const time of [MOVER.period / 4, MOVER.period / 2, 1.234, MOVER.period]) {
    assert.ok(near(moverX(m, time), expected(4, 4 * TILE, time)), `t = ${time}`);
  }
  const zero = createMover({ ...SPEC, id: '0,8', col: 0, x: 0 });
  assert.ok(near(zero.x, 0));
  assert.ok(near(moverX(zero, MOVER.period / 4), MOVER.range * TILE));
  assert.ok(near(moverX(zero, (3 * MOVER.period) / 4), -MOVER.range * TILE));
});

test('updateMovers moves each cloud to the time and records how far it moved', () => {
  const m = createMover(SPEC);
  const before = m.x;
  updateMovers([m], STEP);
  assert.ok(near(m.x, expected(4, 4 * TILE, STEP)));
  assert.ok(near(m.dx, m.x - before, 1e-12));
});
