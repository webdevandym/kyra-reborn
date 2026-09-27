import { VIEW_W, CAMERA } from '../config.js';
import { roomAt } from './level.js';

const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

export function createCamera() {
  return { x: 0 };
}

function clampToRoom(x, player, level) {
  const room = roomAt(level, player.x);
  return clamp(x, room.left, Math.max(room.left, room.right - VIEW_W));
}

export function cameraTarget(player, level) {
  return clampToRoom(player.x - VIEW_W * CAMERA.anchor + player.facing * CAMERA.lookahead, player, level);
}

export function updateCamera(cam, player, level, dt) {
  const target = cameraTarget(player, level);
  cam.x = clampToRoom(cam.x + (target - cam.x) * (1 - Math.exp(-CAMERA.smoothing * dt)), player, level);
  return cam;
}

export function snapCamera(cam, player, level) {
  cam.x = cameraTarget(player, level);
  return cam;
}
