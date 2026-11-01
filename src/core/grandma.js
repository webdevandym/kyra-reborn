import { TILE, STEP, GRAVITY, GRANDMA, STICK, BALL } from '../config.js';
import { applyGravity, moveAndCollide } from './physics.js';
import { tileAt, roomAt } from './level.js';
import { aim8 } from './aim.js';

const KEEP_TILES = 4;
const GIVE_UP = 1;
const ARRIVE = 0.5;
const HOP_REACH = GRANDMA.jump ** 2 / (2 * GRAVITY);

const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
const fetching = (e) => e.phase === 'sticks' && !e.hasStick;

function standable(e, level, col, row) {
  if (tileAt(level, col, row) === 'empty') return false;
  for (let r = Math.floor((row * TILE - e.h) / TILE); r < row; r++) {
    if (tileAt(level, col, r) === 'solid') return false;
  }
  return true;
}

function groundSpan(e, level) {
  const row = Math.round(e.y / TILE);
  const col = Math.floor(e.x / TILE);
  if (!e.onGround || !standable(e, level, col, row)) return { left: e.x, right: e.x, y: e.y };
  let lo = col;
  while (standable(e, level, lo - 1, row)) lo -= 1;
  let hi = col;
  while (standable(e, level, hi + 1, row)) hi += 1;
  return {
    left: Math.max(lo * TILE, e.room.left) + e.w / 2,
    right: Math.min((hi + 1) * TILE, e.room.right) - e.w / 2,
    y: row * TILE,
  };
}

function longestFlight(e, level) {
  return (e.room.right - e.room.left + level.height + 4 * TILE) / STICK.speed;
}

function regain(e) {
  e.hasStick = true;
  e.stickAt = null;
  e.throwTimer = GRANDMA.throwEvery;
}

function withinReach(e, x) {
  const { stickAt, span } = e;
  const r = STICK.size / 2;
  return Math.abs(stickAt.x - x) <= e.w / 2 + r && stickAt.y >= span.y - e.h - HOP_REACH - r && stickAt.y <= span.y + r;
}

function fetchStick(e, dt) {
  const x = clamp(e.stickAt.x, e.span.left, e.span.right);
  e.vx = clamp((x - e.x) / dt, -GRANDMA.runSpeed, GRANDMA.runSpeed);
  if (Math.abs(x - e.x) > ARRIVE) {
    e.dir = Math.sign(x - e.x);
    return;
  }
  if (withinReach(e, x)) return regain(e);
  e.patience = Math.min(e.patience, GIVE_UP) - dt;
  if (e.patience <= 0) regain(e);
}

function throwAt(e, foe, level) {
  const balls = e.phase === 'balls';
  const cfg = balls ? BALL : STICK;
  const centreY = e.y - e.h / 2;
  const { dx, dy } = aim8(e.x, centreY, foe.x, foe.y - foe.h / 2);
  const reach = Math.max(e.w, e.h) / 2 + cfg.size / 2;
  const shot = { kind: balls ? 'ball' : 'stick', x: e.x + dx * reach, y: centreY + dy * reach, vx: dx * cfg.speed, vy: dy * cfg.speed };
  if (balls) return shot;
  e.sticksThrown += 1;
  e.hasStick = false;
  e.stickAt = null;
  e.patience = longestFlight(e, level);
  if (e.sticksThrown >= GRANDMA.sticks) e.phase = 'balls';
  return { ...shot, owner: e };
}

function fight(e, dt, foe, level) {
  const dx = foe.x - e.x;
  e.dir = Math.sign(dx) || e.dir;
  const armed = !fetching(e);
  if (armed) e.throwTimer -= dt;
  e.winding = armed && e.throwTimer <= GRANDMA.windup;
  if (!e.winding && Math.abs(dx) > KEEP_TILES * TILE) e.vx = Math.sign(dx) * GRANDMA.speed;
  if (!armed) {
    e.patience -= dt;
    if (e.patience <= 0) regain(e);
    return null;
  }
  if (e.throwTimer > 0) return null;
  e.winding = false;
  e.throwTimer += GRANDMA.throwEvery;
  return throwAt(e, foe, level);
}

function hop(e, dt) {
  e.jumpTimer -= dt;
  if (e.jumpTimer > 0 || !e.onGround) return;
  e.vy = -GRANDMA.jump;
  e.jumpTimer = GRANDMA.jumpEvery;
}

export const grandma = {
  create: (spec) => ({
    kind: spec.kind,
    x: spec.x,
    y: spec.y,
    w: GRANDMA.w,
    h: GRANDMA.h,
    vx: 0,
    vy: 0,
    speed: GRANDMA.speed,
    dir: -1,
    onGround: true,
    hitWall: 0,
    prevBottom: spec.y,
    alive: true,
    anim: 0,
    lives: GRANDMA.lives,
    dizzy: 0,
    winding: false,
    phase: 'sticks',
    sticksThrown: 0,
    hasStick: true,
    stickAt: null,
    patience: 0,
    throwTimer: GRANDMA.throwEvery,
    jumpTimer: GRANDMA.jumpEvery,
    room: null,
    span: null,
  }),
  update(e, dt, level, player) {
    e.room ??= roomAt(level, e.x);
    if (e.onGround || !e.span) e.span = groundSpan(e, level);
    if (!fetching(e)) e.stickAt = null;
    e.dizzy = Math.max(0, e.dizzy - dt);
    e.vx = 0;
    const foe = player && !player.dead && roomAt(level, player.x) === e.room ? player : null;
    let shot = null;
    if (e.dizzy > 0 || !foe) {
      e.winding = false;
      e.throwTimer = Math.max(e.throwTimer, GRANDMA.windup + STEP);
    } else {
      if (fetching(e) && e.stickAt) fetchStick(e, dt);
      else shot = fight(e, dt, foe, level);
      hop(e, dt);
    }
    // Clamping vx to the standing span, in the air too, is what keeps her from walking or jumping off an edge.
    e.vx = clamp(e.vx, Math.min(0, (e.span.left - e.x) / dt), Math.max(0, (e.span.right - e.x) / dt));
    applyGravity(e, dt);
    moveAndCollide(e, dt, level);
    e.anim += dt * (e.vx === 0 ? 1 : Math.abs(e.vx) / 20);
    return shot;
  },
  onStomp(e) {
    if (e.dizzy > 0) return 'bounce';
    e.lives -= 1;
    e.winding = false;
    e.throwTimer = GRANDMA.throwEvery;
    if (e.lives <= 0) {
      e.lives = 0;
      e.alive = false;
      return 'defeated';
    }
    e.dizzy = GRANDMA.dizzyTime;
    return 'hurt';
  },
};
