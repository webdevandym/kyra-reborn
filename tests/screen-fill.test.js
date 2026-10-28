import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hudInsets } from '../src/touch/hud.js';
import { ambientNeeded, reflectionStrips } from '../src/render/ambient.js';

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

test('side bars reflect the matching edge of the game, mirrored, next to the stage', () => {
  const stage = { left: 40, top: 0, width: 500, height: 250 };
  const strips = reflectionStrips(stage, { width: 580, height: 250 }, 0.5, { width: 1000, height: 500 });
  assert.equal(strips.length, 2);
  const [left, right] = strips;
  assert.deepEqual(left, { sx: 0, sy: 0, sw: 80, sh: 500, dx: 0, dy: 0, dw: 20, dh: 125, flipX: true, flipY: false, side: 'left' });
  assert.deepEqual(right, { sx: 920, sy: 0, sw: 80, sh: 500, dx: 270, dy: 0, dw: 20, dh: 125, flipX: true, flipY: false, side: 'right' });
});

test('bars above and below the stage reflect its top and bottom edges flipped vertically', () => {
  const stage = { left: 0, top: 78, width: 1180, height: 664 };
  const strips = reflectionStrips(stage, { width: 1180, height: 820 }, 0.25, { width: 2360, height: 1328 });
  assert.equal(strips.length, 2);
  const [top, bottom] = strips;
  assert.equal(top.side, 'top');
  assert.equal(top.flipY, true);
  assert.equal(top.flipX, false);
  close(top.dy, 0);
  close(top.dh, 19.5);
  close(top.sy, 0);
  close(top.sh, 156);
  close(top.dw, 295);
  assert.equal(bottom.side, 'bottom');
  close(bottom.dy, 185.5);
  close(bottom.dh, 19.5);
  close(bottom.sy, 1328 - 156);
});

test('a bar wider than the stage reflects at most the whole stage and stays next to it', () => {
  const stage = { left: 900, top: 0, width: 100, height: 100 };
  const [left] = reflectionStrips(stage, { width: 1000, height: 100 }, 1, { width: 200, height: 200 });
  assert.equal(left.side, 'left');
  assert.equal(left.dx, 800);
  assert.equal(left.dw, 100);
  assert.equal(left.sw, 200);
});

test('a stage that covers the screen has nothing to reflect', () => {
  assert.deepEqual(reflectionStrips({ left: 0, top: 0, width: 956, height: 440 }, { width: 956, height: 440 }, 0.5, { width: 1912, height: 880 }), []);
});

test('the reflection is only needed where the stage leaves part of the screen uncovered', () => {
  const view = { width: 956, height: 440 };
  assert.equal(ambientNeeded({ left: 0, top: 0, width: 956, height: 440 }, view), false);
  assert.equal(ambientNeeded({ left: 0, top: 0, width: 955.5, height: 439.6 }, view), false);
  assert.equal(ambientNeeded({ left: 0, top: 78, width: 1180, height: 664 }, { width: 1180, height: 820 }), true);
  assert.equal(ambientNeeded({ left: 62, top: 0, width: 832, height: 440 }, view), true);
});
