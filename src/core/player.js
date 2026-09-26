import { PLAYER } from '../config.js';
import { applyGravity, moveAndCollide } from './physics.js';

export function createPlayer(spawn) {
  return {
    x: spawn.x,
    y: spawn.y,
    w: PLAYER.w,
    h: PLAYER.h,
    vx: 0,
    vy: 0,
    onGround: true,
    hitWall: 0,
    prevBottom: spawn.y,
    ride: null,
    facing: 1,
    coyote: 0,
    buffer: 0,
    jumping: false,
    squash: 0,
    invuln: PLAYER.spawnGrace,
    dead: false,
    won: false,
  };
}

function approach(value, target, delta) {
  return value < target ? Math.min(value + delta, target) : Math.max(value - delta, target);
}

export function updatePlayer(p, input, dt, level, platforms = []) {
  const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  if (dir !== 0) p.facing = dir;
  const accel = p.onGround ? (dir !== 0 ? PLAYER.groundAccel : PLAYER.groundDecel) : PLAYER.airAccel;
  p.vx = approach(p.vx, dir * PLAYER.walkSpeed, accel * dt);

  p.coyote = p.onGround ? PLAYER.coyoteTime : Math.max(0, p.coyote - dt);
  p.buffer = input.jumpPressed ? PLAYER.jumpBuffer : Math.max(0, p.buffer - dt);

  let jumped = false;
  if (p.buffer > 0 && p.coyote > 0) {
    p.vy = -PLAYER.jumpVelocity;
    p.buffer = 0;
    p.coyote = 0;
    p.jumping = true;
    jumped = true;
  }
  if (p.jumping && !input.jumpHeld && p.vy < -PLAYER.jumpCut) p.vy = -PLAYER.jumpCut;
  if (p.vy >= 0) p.jumping = false;

  applyGravity(p, dt);
  const wasOnGround = p.onGround;
  moveAndCollide(p, dt, level, platforms);
  const landed = !wasOnGround && p.onGround;
  p.squash = landed ? PLAYER.squashTime : Math.max(0, p.squash - dt);
  p.invuln = Math.max(0, p.invuln - dt);
  return { jumped, landed };
}
