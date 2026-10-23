import { CRAB } from '../config.js';
import { applyGravity, moveAndCollide } from './physics.js';

export function createCrab(pearl) {
  return {
    x: pearl.x,
    y: pearl.y,
    w: CRAB.w,
    h: CRAB.h,
    vx: 0,
    vy: 0,
    dir: 1,
    onGround: true,
    hitWall: 0,
    prevBottom: pearl.y,
    pinches: CRAB.pinches,
    cooldown: CRAB.pinchGap,
    alive: true,
    anim: 0,
  };
}

function nearest(crab, sharks) {
  let best = null;
  for (const s of sharks) {
    if (!s.alive) continue;
    if (!best || Math.abs(s.x - crab.x) < Math.abs(best.x - crab.x)) best = s;
  }
  return best;
}

export function updateCrab(crab, dt, level, sharks) {
  crab.cooldown = Math.max(0, crab.cooldown - dt);
  const target = nearest(crab, sharks);
  if (!target || crab.pinches === 0) {
    crab.alive = false;
    return null;
  }
  const dx = target.x - crab.x;
  crab.dir = Math.sign(dx) || crab.dir;
  const touching = Math.abs(dx) <= target.w / 2 + crab.w / 2;
  crab.vx = touching ? 0 : crab.dir * CRAB.speed;
  applyGravity(crab, dt);
  moveAndCollide(crab, dt, level);
  crab.anim += dt * 10;
  if (!touching || crab.cooldown > 0) return null;
  crab.pinches -= 1;
  crab.cooldown = CRAB.pinchGap;
  return target;
}
