import { TILE, BONE, SHELL, FIREBALL } from '../config.js';
import { tileAt } from './level.js';

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
};
