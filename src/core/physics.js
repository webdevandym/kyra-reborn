import { TILE, GRAVITY, MAX_FALL } from '../config.js';
import { tileAt } from './level.js';

const EPS = 0.001;

export function applyGravity(body, dt) {
  body.vy = Math.min(body.vy + GRAVITY * dt, MAX_FALL);
}

export function shiftX(body, dx, level) {
  body.x += dx;
  const rowTop = Math.floor((body.y - body.h) / TILE);
  const rowBottom = Math.floor((body.y - EPS) / TILE);
  if (dx > 0) {
    const col = Math.floor((body.x + body.w / 2 - EPS) / TILE);
    if (columnBlocked(level, col, rowTop, rowBottom)) {
      body.x = col * TILE - body.w / 2;
      return 1;
    }
  } else if (dx < 0) {
    const col = Math.floor((body.x - body.w / 2) / TILE);
    if (columnBlocked(level, col, rowTop, rowBottom)) {
      body.x = (col + 1) * TILE + body.w / 2;
      return -1;
    }
  }
  return 0;
}

export function moveAndCollide(body, dt, level, platforms = []) {
  body.prevBottom = body.y;
  body.hitWall = shiftX(body, body.vx * dt, level);
  if (body.hitWall !== 0) body.vx = 0;

  const prevBottom = body.y;
  body.y += body.vy * dt;
  body.onGround = false;
  const colLeft = Math.floor((body.x - body.w / 2) / TILE);
  const colRight = Math.floor((body.x + body.w / 2 - EPS) / TILE);
  if (body.vy >= 0) {
    const row = Math.floor(body.y / TILE);
    const rowTopY = row * TILE;
    for (let col = colLeft; col <= colRight; col++) {
      const kind = tileAt(level, col, row);
      const lands = kind === 'solid' || (kind === 'oneway' && prevBottom <= rowTopY + EPS);
      if (lands) {
        body.y = rowTopY;
        body.vy = 0;
        body.onGround = true;
        break;
      }
    }
    if (!body.onGround) landOnPlatform(body, prevBottom, platforms);
  } else {
    const row = Math.floor((body.y - body.h) / TILE);
    for (let col = colLeft; col <= colRight; col++) {
      if (tileAt(level, col, row) === 'solid') {
        body.y = (row + 1) * TILE + body.h;
        body.vy = 0;
        break;
      }
    }
  }
}

function landOnPlatform(body, prevBottom, platforms) {
  for (const m of platforms) {
    const overlapsX = body.x + body.w / 2 > m.x && body.x - body.w / 2 < m.x + m.w;
    if (overlapsX && prevBottom <= m.y + EPS && body.y >= m.y) {
      body.y = m.y;
      body.vy = 0;
      body.onGround = true;
      body.ride = m;
      return;
    }
  }
}

function columnBlocked(level, col, rowTop, rowBottom) {
  for (let row = rowTop; row <= rowBottom; row++) {
    if (tileAt(level, col, row) === 'solid') return true;
  }
  return false;
}
