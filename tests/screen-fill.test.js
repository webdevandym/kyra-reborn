import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hudInsets } from '../src/touch/hud.js';
import { ambientNeeded, coverRect } from '../src/render/ambient.js';

const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-6, `${actual} !== ${expected}`);

test('a full-bleed stage keeps the HUD out of the notch and clear of the pause button', () => {
  const stage = { left: 0, right: 956, width: 956 };
  const inset = hudInsets({ stage, viewportWidth: 956, safe: { left: 62, right: 62 }, viewW: 1912 });
  assert.equal(inset.left, 124);
  assert.equal(inset.corner, 124);
  assert.equal(inset.right, (62 + 44 + 8) * 2);
});

test('with no safe area the pause button still gets its own corner', () => {
  const stage = { left: 0, right: 900, width: 900 };
  const inset = hudInsets({ stage, viewportWidth: 900, safe: { left: 0, right: 0 }, viewW: 900 });
  assert.equal(inset.left, 0);
  assert.equal(inset.corner, 0);
  assert.equal(inset.right, 8 + 44 + 8);
});

test('a stage centred well inside the screen needs no notch inset', () => {
  const stage = { left: 100, right: 900, width: 800 };
  const inset = hudInsets({ stage, viewportWidth: 1000, safe: { left: 62, right: 62 }, viewW: 800 });
  assert.equal(inset.left, 0);
  assert.equal(inset.corner, 0);
  assert.equal(inset.right, 14);
});

test('a stage that stops short of the pause button needs no right inset', () => {
  const stage = { left: 200, right: 700, width: 500 };
  const inset = hudInsets({ stage, viewportWidth: 1000, safe: { left: 0, right: 0 }, viewW: 500 });
  assert.equal(inset.right, 0);
});

test('coverRect scales the game picture to cover a wider or a taller screen without distortion', () => {
  const wide = coverRect(960, 540, 200, 50);
  close(wide.w / wide.h, 960 / 540);
  close(wide.w, 200);
  close(wide.y, (50 - wide.h) / 2);
  const tall = coverRect(960, 540, 100, 200);
  close(tall.w / tall.h, 960 / 540);
  close(tall.h, 200);
  close(tall.x, (100 - tall.w) / 2);
  assert.deepEqual(coverRect(960, 540, 960, 540), { x: 0, y: 0, w: 960, h: 540 });
});

test('the reflection is only needed where the stage leaves part of the screen uncovered', () => {
  const view = { width: 956, height: 440 };
  assert.equal(ambientNeeded({ left: 0, top: 0, width: 956, height: 440 }, view), false);
  assert.equal(ambientNeeded({ left: 0, top: 0, width: 955.5, height: 439.6 }, view), false);
  assert.equal(ambientNeeded({ left: 0, top: 78, width: 1180, height: 664 }, { width: 1180, height: 820 }), true);
  assert.equal(ambientNeeded({ left: 62, top: 0, width: 832, height: 440 }, view), true);
});
