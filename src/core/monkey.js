import { TILE, MONKEY } from '../config.js';
import { applyGravity, moveAndCollide } from './physics.js';
import { tileAt, roomAt } from './level.js';

const EPS = 0.001;
const ARRIVE_TILES = 4;

function report(e, state, extra = {}) {
  e.pending.push({ type: 'monkeyState', state, lives: e.lives, ...extra });
}

const chasing = (player) => Boolean(player) && !player.dead;

export function startArriving(e) {
  e.mode = 'arriving';
  e.hidden = true;
  e.inert = true;
  e.arriveTimer = MONKEY.arriveDelay;
  e.dizzy = 0;
  e.vx = 0;
  e.vy = 0;
}

function sleep(e, level, player) {
  const near = chasing(player) && roomAt(level, player.x) === roomAt(level, e.x) && Math.abs(player.x - e.x) <= MONKEY.wakeRange * TILE;
  if (!near) return;
  e.mode = 'awake';
  e.inert = false;
  report(e, 'awake', { woke: true });
}

function gapAhead(e, level) {
  const aheadCol = Math.floor((e.x + e.dir * (e.w / 2 + 2)) / TILE);
  return tileAt(level, aheadCol, Math.floor((e.y + 2) / TILE)) === 'empty';
}

function wantsJump(e, level, player) {
  if (!e.onGround || e.dizzy > 0 || !chasing(player)) return false;
  if (e.vx !== 0 && (e.hitWall === e.dir || gapAhead(e, level))) return true;
  return Boolean(player.onGround) && player.y <= e.y - TILE;
}

function chase(e, dt, level, player) {
  e.dizzy = Math.max(0, e.dizzy - dt);
  const dx = chasing(player) ? player.x - e.x : 0;
  if (e.dizzy > 0 || Math.abs(dx) <= MONKEY.speed * dt) {
    e.vx = 0;
  } else {
    e.dir = Math.sign(dx);
    e.vx = e.dir * MONKEY.speed;
  }
  if (wantsJump(e, level, player)) e.vy = -MONKEY.jump;
  applyGravity(e, dt);
  moveAndCollide(e, dt, level);
  e.anim += dt * (e.vx !== 0 ? MONKEY.speed / 20 : 1);
  // Must re-enter here, before updateEnemy's RULES.fallLimit check turns a pit into a free kill.
  if (e.y - e.h > level.height) startArriving(e);
}

function bodyClear(level, colLeft, colRight, top, bottom) {
  for (let row = Math.floor(top / TILE); row <= Math.floor((bottom - EPS) / TILE); row++) {
    for (let col = colLeft; col <= colRight; col++) {
      if (tileAt(level, col, row) === 'solid') return false;
    }
  }
  return true;
}

function groundUnder(e, level, x, fromRow) {
  const colLeft = Math.floor((x - e.w / 2) / TILE);
  const colRight = Math.floor((x + e.w / 2 - EPS) / TILE);
  for (let row = Math.max(0, fromRow); row < level.rows; row++) {
    let support = false;
    for (let col = colLeft; col <= colRight; col++) {
      if (tileAt(level, col, row) !== 'empty') support = true;
    }
    if (support && bodyClear(level, colLeft, colRight, row * TILE - e.h, row * TILE)) return row * TILE;
  }
  return null;
}

function arrivalSpot(e, level, player) {
  const room = roomAt(level, player.x);
  const back = -(player.facing || 1);
  const fromRow = Math.floor((player.y - player.h) / TILE);
  for (const side of [back, -back]) {
    const x = player.x + side * ARRIVE_TILES * TILE;
    if (x - e.w / 2 < room.left || x + e.w / 2 > room.right) continue;
    const y = groundUnder(e, level, x, fromRow);
    if (y !== null) return { x, y };
  }
  return null;
}

function arrive(e, dt, level, player) {
  e.arriveTimer = Math.max(0, e.arriveTimer - dt);
  if (e.arriveTimer > 0 || !chasing(player)) return;
  const spot = arrivalSpot(e, level, player);
  if (!spot) return;
  e.x = spot.x;
  e.y = spot.y;
  e.prevBottom = spot.y;
  e.vx = 0;
  e.vy = 0;
  e.onGround = true;
  e.hitWall = 0;
  e.dir = Math.sign(player.x - e.x) || e.dir;
  e.mode = 'awake';
  e.hidden = false;
  e.inert = false;
}

export const monkey = {
  create: (spec) => ({
    kind: spec.kind,
    x: spec.x,
    y: spec.y,
    w: MONKEY.w,
    h: MONKEY.h,
    vx: 0,
    vy: 0,
    speed: MONKEY.speed,
    dir: -1,
    onGround: false,
    hitWall: 0,
    prevBottom: spec.y,
    alive: true,
    anim: 0,
    mode: 'asleep',
    inert: true,
    hidden: false,
    lives: MONKEY.lives,
    dizzy: 0,
    arriveTimer: 0,
    pending: [],
  }),
  update(e, dt, level, player) {
    if (e.mode === 'asleep') {
      e.anim += dt;
      sleep(e, level, player);
    } else if (e.mode === 'arriving') {
      arrive(e, dt, level, player);
    } else {
      chase(e, dt, level, player);
    }
    return null;
  },
  onStomp(e) {
    if (e.dizzy > 0) return 'bounce';
    e.lives -= 1;
    if (e.lives <= 0) {
      e.lives = 0;
      e.alive = false;
      report(e, 'dead');
      return 'defeated';
    }
    e.dizzy = MONKEY.dizzyTime;
    report(e, 'awake');
    return 'hurt';
  },
};
