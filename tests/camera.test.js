import { test } from 'node:test';
import assert from 'node:assert/strict';
import { VIEW_W, CAMERA, TILE } from '../src/config.js';
import { createCamera, cameraTarget, updateCamera, snapCamera } from '../src/core/camera.js';
import { parseLevel } from '../src/core/level.js';
import { castleMap } from './helpers.js';

const player = (x, facing = 1) => ({ x, facing });
const oneRoom = (width) => ({ width, rooms: [{ left: 0, right: width }] });

test('the camera target keeps the chicken at 40% of the screen plus lookahead', () => {
  assert.equal(cameraTarget(player(2000), oneRoom(5000)), 2000 - VIEW_W * CAMERA.anchor + CAMERA.lookahead);
  assert.equal(cameraTarget(player(2000, -1), oneRoom(5000)), 2000 - VIEW_W * CAMERA.anchor - CAMERA.lookahead);
});

test('the camera never shows past the level edges', () => {
  assert.equal(cameraTarget(player(10), oneRoom(5000)), 0);
  assert.equal(cameraTarget(player(4990), oneRoom(5000)), 5000 - VIEW_W);
  assert.equal(cameraTarget(player(400), oneRoom(600)), 0, 'levels narrower than the screen stay at 0');
});

test('updateCamera eases toward the target and snapCamera jumps to it', () => {
  const cam = createCamera();
  updateCamera(cam, player(2000), oneRoom(5000), 1 / 60);
  const target = cameraTarget(player(2000), oneRoom(5000));
  assert.ok(cam.x > 0 && cam.x < target);
  for (let i = 0; i < 600; i++) updateCamera(cam, player(2000), oneRoom(5000), 1 / 60);
  assert.ok(Math.abs(cam.x - target) < 0.5);
  snapCamera(cam, player(100), oneRoom(5000));
  assert.equal(cam.x, 0);
});

test('on a two-room level the camera stays inside the chicken\'s room', () => {
  const row = 'C' + '.'.repeat(38) + '#' + '.'.repeat(39) + 'G';
  const level = parseLevel({ id: 'rooms', map: castleMap([row, '#'.repeat(80)], [39]) });
  const [first, second] = level.rooms;
  assert.equal(cameraTarget(player(38 * TILE), level), first.right - VIEW_W, 'the end of room 1 never shows the wall and room 2');
  assert.equal(cameraTarget(player(41 * TILE), level), second.left, 'the start of room 2 never shows room 1');
  const cam = { x: first.right - VIEW_W };
  updateCamera(cam, player(41 * TILE), level, 1 / 120);
  assert.ok(cam.x >= second.left, `camera at ${cam.x}`);
});
