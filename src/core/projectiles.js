import { TILE, BONE, SHELL, FIREBALL, CONE, STICK, BALL } from '../config.js';
import { tileAt } from './level.js';

function flyStraight(f, dt, level, size) {
  f.x += f.vx * dt;
  f.y += f.vy * dt;
  const along = size / 2 / (Math.hypot(f.vx, f.vy) || 1);
  const leadX = f.x + f.vx * along;
  const leadY = f.y + f.vy * along;
  const inside = f.x >= -TILE && f.x <= level.width + TILE && f.y >= -TILE && f.y <= level.height + TILE;
  return inside && tileAt(level, Math.floor(leadX / TILE), Math.floor(leadY / TILE)) !== 'solid';
}

export const PROJECTILES = {
  bone: {
    event: 'throw',
    size: BONE.size,
    move(f, dt, level, events) {
      f.vy += BONE.gravity * dt;
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      if (tileAt(level, Math.floor(f.x / TILE), Math.floor(f.y / TILE)) !== 'solid') return true;
      events.push({ type: 'boneBreak', x: f.x, y: f.y });
      return false;
    },
  },
  shell: {
    event: 'shell',
    size: SHELL.size,
    move(f, dt, level) {
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      const leadX = f.x + Math.sign(f.vx) * (SHELL.size / 2);
      const leadY = f.y + Math.sign(f.vy) * (SHELL.size / 2);
      return f.y > -TILE && tileAt(level, Math.floor(leadX / TILE), Math.floor(leadY / TILE)) !== 'solid';
    },
  },
  fireball: {
    event: 'fire',
    size: FIREBALL.size,
    move(f, dt, level) {
      f.x += f.vx * dt;
      const lead = f.x + Math.sign(f.vx) * (FIREBALL.size / 2);
      return tileAt(level, Math.floor(lead / TILE), Math.floor(f.y / TILE)) !== 'solid';
    },
  },
  cone: {
    event: 'cone',
    size: CONE.size,
    move: (f, dt, level) => flyStraight(f, dt, level, CONE.size),
  },
  stick: {
    event: 'stickThrow',
    size: STICK.size,
    move(f, dt, level) {
      if (flyStraight(f, dt, level, STICK.size)) return true;
      if (f.owner) f.owner.stickAt = { x: f.x, y: f.y };
      return false;
    },
  },
  ball: {
    event: 'ball',
    size: BALL.size,
    move: (f, dt, level) => flyStraight(f, dt, level, BALL.size),
  },
};
