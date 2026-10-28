import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import * as config from '../src/config.js';
import { VIEW_H, VIEW_W_MIN, VIEW_W_MAX, CAMERA, viewWidthFor, setViewWidth } from '../src/config.js';
import { cameraTarget } from '../src/core/camera.js';
import { parseLevel } from '../src/core/level.js';
import levels from '../src/levels/index.js';

afterEach(() => setViewWidth(VIEW_W_MIN));

const oneRoom = (width) => ({ rooms: [{ left: 0, right: width }] });
const player = (x, facing = 1) => ({ x, facing });

test('the view is 960 wide for 16:9 and narrower screens and grows with the screen aspect up to 21:9', () => {
  assert.equal(VIEW_W_MIN, 960);
  assert.equal(viewWidthFor(16 / 9), 960);
  assert.equal(viewWidthFor(4 / 3), 960);
  assert.equal(viewWidthFor(19.5 / 9), Math.round(VIEW_H * (19.5 / 9)));
  assert.equal(viewWidthFor(21 / 9), VIEW_W_MAX);
  assert.equal(viewWidthFor(32 / 9), VIEW_W_MAX);
  assert.equal(VIEW_W_MAX, 1260);
});

test('viewWidthFor falls back to the default width for a missing or broken aspect', () => {
  assert.equal(viewWidthFor(0), VIEW_W_MIN);
  assert.equal(viewWidthFor(Number.NaN), VIEW_W_MIN);
  assert.equal(viewWidthFor(Number.POSITIVE_INFINITY), VIEW_W_MIN);
});

test('setViewWidth changes the width every module sees and clamps it to the allowed range', () => {
  assert.equal(setViewWidth(1100), 1100);
  assert.equal(config.VIEW_W, 1100);
  assert.equal(setViewWidth(5000), VIEW_W_MAX);
  assert.equal(setViewWidth(100), VIEW_W_MIN);
  assert.equal(config.VIEW_W, VIEW_W_MIN);
});

test('the camera keeps the player at the same fraction of a wider view and stops at the room end', () => {
  setViewWidth(1260);
  assert.equal(cameraTarget(player(2000), oneRoom(5000)), 2000 - 1260 * CAMERA.anchor + CAMERA.lookahead);
  assert.equal(cameraTarget(player(4990), oneRoom(5000)), 5000 - 1260);
});

test('every room is at least as wide as the widest view so a wide screen never shows the next room', () => {
  for (const def of levels) {
    for (const room of parseLevel(def).rooms) {
      assert.ok(room.right - room.left >= VIEW_W_MAX, `${def.id}: room ${room.left}..${room.right} is narrower than ${VIEW_W_MAX}`);
    }
  }
});
