import { test } from 'node:test';
import assert from 'node:assert/strict';
import { VIEW_W, CAMERA } from '../src/config.js';
import { createCamera, cameraTarget, updateCamera, snapCamera } from '../src/core/camera.js';

const player = (x, facing = 1) => ({ x, facing });

test('the camera target keeps the chicken at 40% of the screen plus lookahead', () => {
  assert.equal(cameraTarget(player(2000), 5000), 2000 - VIEW_W * CAMERA.anchor + CAMERA.lookahead);
  assert.equal(cameraTarget(player(2000, -1), 5000), 2000 - VIEW_W * CAMERA.anchor - CAMERA.lookahead);
});

test('the camera never shows past the level edges', () => {
  assert.equal(cameraTarget(player(10), 5000), 0);
  assert.equal(cameraTarget(player(4990), 5000), 5000 - VIEW_W);
  assert.equal(cameraTarget(player(400), 600), 0, 'levels narrower than the screen stay at 0');
});

test('updateCamera eases toward the target and snapCamera jumps to it', () => {
  const cam = createCamera();
  updateCamera(cam, player(2000), 5000, 1 / 60);
  const target = cameraTarget(player(2000), 5000);
  assert.ok(cam.x > 0 && cam.x < target);
  for (let i = 0; i < 600; i++) updateCamera(cam, player(2000), 5000, 1 / 60);
  assert.ok(Math.abs(cam.x - target) < 0.5);
  snapCamera(cam, player(100), 5000);
  assert.equal(cam.x, 0);
});
