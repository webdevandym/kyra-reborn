import { TILE, CARROT, ZOMBIE } from '../config.js';
import { applyGravity, moveAndCollide } from './physics.js';
import { tileAt } from './level.js';

function baseEnemy(spec, w, h, speed) {
  return {
    kind: spec.kind,
    x: spec.x,
    y: spec.y,
    w,
    h,
    vx: 0,
    vy: 0,
    speed,
    dir: -1,
    onGround: true,
    hitWall: 0,
    prevBottom: spec.y,
    alive: true,
    anim: 0,
  };
}

function patrol(e, dt, level) {
  if (e.onGround) {
    const aheadCol = Math.floor((e.x + e.dir * (e.w / 2 + 2)) / TILE);
    const belowRow = Math.floor((e.y + 2) / TILE);
    if (tileAt(level, aheadCol, belowRow) === 'empty') e.dir = -e.dir;
  }
  e.vx = e.dir * e.speed;
  applyGravity(e, dt);
  moveAndCollide(e, dt, level);
  if (e.hitWall !== 0) e.dir = -e.hitWall;
  e.anim += dt * (e.speed / 20);
}

const carrot = {
  create: (spec) => baseEnemy(spec, CARROT.w, CARROT.h, CARROT.speed),
  update: patrol,
  onStomp(e) {
    e.alive = false;
    return 'defeated';
  },
};

const zombie = {
  create: (spec) => ({ ...baseEnemy(spec, ZOMBIE.bigW, ZOMBIE.bigH, ZOMBIE.bigSpeed), size: 'big', dizzy: 0 }),
  update(e, dt, level) {
    e.dizzy = Math.max(0, e.dizzy - dt);
    patrol(e, dt, level);
  },
  onStomp(e) {
    if (e.size === 'big') {
      e.size = 'small';
      e.w = ZOMBIE.smallW;
      e.h = ZOMBIE.smallH;
      e.speed = ZOMBIE.smallSpeed;
      e.dizzy = ZOMBIE.dizzyTime;
      return 'shrunk';
    }
    e.alive = false;
    return 'defeated';
  },
};

export const ENEMY_KINDS = { carrot, zombie };

export function createEnemy(spec) {
  const kind = ENEMY_KINDS[spec.kind];
  if (!kind) throw new Error(`unknown enemy kind '${spec.kind}'`);
  return kind.create(spec);
}

export function updateEnemy(e, dt, level) {
  ENEMY_KINDS[e.kind].update(e, dt, level);
}

export function stompEnemy(e) {
  return ENEMY_KINDS[e.kind].onStomp(e);
}
