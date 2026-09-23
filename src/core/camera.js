import { VIEW_W, CAMERA } from '../config.js';

const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

export function createCamera() {
  return { x: 0 };
}

export function cameraTarget(player, levelWidth) {
  const x = player.x - VIEW_W * CAMERA.anchor + player.facing * CAMERA.lookahead;
  return clamp(x, 0, Math.max(0, levelWidth - VIEW_W));
}

export function updateCamera(cam, player, levelWidth, dt) {
  const target = cameraTarget(player, levelWidth);
  cam.x += (target - cam.x) * (1 - Math.exp(-CAMERA.smoothing * dt));
  cam.x = clamp(cam.x, 0, Math.max(0, levelWidth - VIEW_W));
  return cam;
}

export function snapCamera(cam, player, levelWidth) {
  cam.x = cameraTarget(player, levelWidth);
  return cam;
}
