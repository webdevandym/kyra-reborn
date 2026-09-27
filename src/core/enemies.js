import { TILE, STEP, CARROT, ZOMBIE, PROPELLER, BEE, FLYER, RULES, STAR, BAT, RAT, SKELETON, GHOST, SPIDER, FIREBALL } from '../config.js';
import { applyGravity, moveAndCollide } from './physics.js';
import { tileAt, roomAt } from './level.js';

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

function defeat(e) {
  e.alive = false;
  return 'defeated';
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

function dizzyPatrol(e, dt, level) {
  e.dizzy = Math.max(0, e.dizzy - dt);
  patrol(e, dt, level);
}

const carrot = {
  create: (spec) => baseEnemy(spec, CARROT.w, CARROT.h, CARROT.speed),
  update: patrol,
  onStomp: defeat,
};

const rat = {
  create: (spec) => baseEnemy(spec, RAT.w, RAT.h, RAT.speed),
  update: patrol,
  onStomp: defeat,
};

const zombie = {
  create: (spec) => ({ ...baseEnemy(spec, ZOMBIE.bigW, ZOMBIE.bigH, ZOMBIE.bigSpeed), size: 'big', dizzy: 0 }),
  update: dizzyPatrol,
  onStomp(e) {
    if (e.size === 'big') {
      e.size = 'small';
      e.w = ZOMBIE.smallW;
      e.h = ZOMBIE.smallH;
      e.speed = ZOMBIE.smallSpeed;
      e.dizzy = ZOMBIE.dizzyTime;
      return 'shrunk';
    }
    return defeat(e);
  },
};

function twoLife(cfg) {
  return {
    create: (spec) => ({ ...baseEnemy(spec, cfg.w, cfg.h, cfg.speed), lives: 2, dizzy: 0 }),
    update: dizzyPatrol,
    onStomp(e) {
      if (e.lives > 1) {
        e.lives -= 1;
        e.dizzy = cfg.dizzyTime;
        e.speed = cfg.hurtSpeed;
        return 'hurt';
      }
      return defeat(e);
    },
  };
}

const EPS = 0.001;

function flyerFeet(e) {
  return e.homeY + e.bob * Math.sin(e.phase) + e.h / 2;
}

function envelopeBlocked(e, level, col) {
  const rowTop = Math.floor((e.homeY - e.bob - e.h / 2) / TILE);
  const rowBottom = Math.floor((e.homeY + e.bob + e.h / 2 - EPS) / TILE);
  for (let row = rowTop; row <= rowBottom; row++) {
    if (tileAt(level, col, row) === 'solid') return true;
  }
  return false;
}

function hover(e, dt, level) {
  e.phase += e.bobSpeed * dt;
  let x = e.x + e.dir * e.speed * dt;
  const col = e.dir > 0 ? Math.floor((x + e.w / 2 - EPS) / TILE) : Math.floor((x - e.w / 2) / TILE);
  if (envelopeBlocked(e, level, col)) {
    x = e.dir > 0 ? col * TILE - e.w / 2 : (col + 1) * TILE + e.w / 2;
    e.dir = -e.dir;
  } else if (Math.abs(x - e.homeX) >= e.range) {
    x = e.homeX + Math.sign(x - e.homeX) * e.range;
    e.dir = -e.dir;
  }
  e.x = x;
  e.vx = e.dir * e.speed;
  e.prevBottom = e.y;
  e.y = flyerFeet(e);
  e.anim += dt * (e.speed / 20);
}

function flyer(cfg) {
  return {
    create(spec) {
      const e = {
        ...baseEnemy(spec, cfg.w, cfg.h, cfg.speed),
        onGround: false,
        homeX: spec.x,
        homeY: spec.y - TILE / 2 - cfg.lift,
        range: cfg.range * TILE,
        bob: cfg.bob,
        bobSpeed: (Math.PI * 2) / cfg.bobPeriod,
        phase: Math.floor(spec.x / TILE) * FLYER.phasePerCol,
      };
      e.y = flyerFeet(e);
      e.prevBottom = e.y;
      return e;
    },
    update: hover,
    onStomp: defeat,
  };
}

function placeSwoop(e) {
  const c = Math.cos(e.phase);
  e.x = e.homeX + BAT.range * TILE * Math.sin(e.phase);
  e.y = e.topFeet + BAT.dip * c * c;
  e.vx = BAT.range * TILE * ((2 * Math.PI) / BAT.period) * c;
  if (e.vx !== 0) e.dir = Math.sign(e.vx);
}

const bat = {
  create(spec) {
    const e = {
      ...baseEnemy(spec, BAT.w, BAT.h, 0),
      onGround: false,
      homeX: spec.x,
      topFeet: spec.y - TILE / 2 + BAT.h / 2,
      phase: Math.floor(spec.x / TILE) * FLYER.phasePerCol,
    };
    placeSwoop(e);
    e.prevBottom = e.y;
    return e;
  },
  update(e, dt) {
    e.phase += (2 * Math.PI * dt) / BAT.period;
    e.prevBottom = e.y;
    placeSwoop(e);
    e.anim += dt * 6;
  },
  onStomp: defeat,
};

const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

function moveToward(e, tx, ty, step) {
  const dx = tx - e.x;
  const dy = ty - e.y;
  const dist = Math.hypot(dx, dy);
  if (dist <= step) {
    e.x = tx;
    e.y = ty;
  } else {
    e.x += (dx / dist) * step;
    e.y += (dy / dist) * step;
  }
}

function shyFloat(e, dt, level, player) {
  e.room ??= roomAt(level, e.homeX);
  e.clock += dt;
  const x0 = e.x;
  const y0 = e.y;
  const active = Boolean(player) && !player.dead && roomAt(level, player.x) === e.room && Math.abs(player.x - e.x) <= GHOST.sight * TILE;
  const lookedAt = active && player.facing === (Math.sign(e.x - player.x) || player.facing);
  e.shy = lookedAt;
  if (active && !lookedAt) moveToward(e, player.x, player.y - player.h / 2 + e.h / 2, e.speed * dt);
  else if (!active) moveToward(e, e.homeX, e.homeY, e.speed * dt);
  e.x = clamp(e.x, Math.max(e.homeX - GHOST.leash * TILE, e.room.left + e.w / 2), Math.min(e.homeX + GHOST.leash * TILE, e.room.right - e.w / 2));
  e.y = clamp(e.y, TILE + e.h, level.height - 2 * TILE);
  e.prevBottom = y0;
  if (e.x !== x0) e.dir = Math.sign(e.x - x0);
  if (e.x !== x0 || e.y !== y0) e.trail.push({ x: e.x, y: e.y, t: e.clock });
  while (e.trail.length && e.clock - e.trail[0].t > GHOST.trail) e.trail.shift();
  e.anim += dt;
}

const ghost = {
  create: (spec) => ({
    ...baseEnemy(spec, GHOST.w, GHOST.h, GHOST.speed),
    onGround: false,
    homeX: spec.x,
    homeY: spec.y - TILE / 2 + GHOST.h / 2,
    y: spec.y - TILE / 2 + GHOST.h / 2,
    prevBottom: spec.y - TILE / 2 + GHOST.h / 2,
    shy: false,
    clock: 0,
    trail: [],
    room: null,
  }),
  update: shyFloat,
  onStomp: defeat,
};

const spider = {
  create: (spec) => ({ ...baseEnemy(spec, SPIDER.w, SPIDER.h, 0), cooldown: SPIDER.fireEvery, winding: false, nextHigh: false, room: null }),
  update(e, dt, level, player) {
    e.room ??= roomAt(level, e.x);
    e.anim += dt;
    if (!player) return null;
    const dx = player.x - e.x;
    if (dx !== 0) e.dir = Math.sign(dx);
    const reach = Math.abs(dx);
    const inRange = !player.dead && roomAt(level, player.x) === e.room && reach >= SPIDER.minRange * TILE && reach <= SPIDER.maxRange * TILE;
    if (!inRange) {
      e.winding = false;
      e.cooldown = Math.max(e.cooldown, SPIDER.windup + STEP);
      return null;
    }
    e.cooldown -= dt;
    e.winding = e.cooldown <= SPIDER.windup;
    if (e.cooldown > 0) return null;
    e.cooldown += SPIDER.fireEvery;
    e.winding = false;
    const shot = {
      x: e.x + e.dir * (e.w / 2 + FIREBALL.size / 2),
      y: e.y - (e.nextHigh ? FIREBALL.highY : FIREBALL.lowY),
      vx: e.dir * FIREBALL.speed,
    };
    e.nextHigh = !e.nextHigh;
    return shot;
  },
  onStomp: defeat,
};

export const ENEMY_KINDS = {
  carrot,
  zombie,
  propeller: flyer(PROPELLER),
  bee: flyer(BEE),
  star: twoLife(STAR),
  bat,
  rat,
  skeleton: twoLife(SKELETON),
  ghost,
  spider,
};

export function createEnemy(spec) {
  const kind = ENEMY_KINDS[spec.kind];
  if (!kind) throw new Error(`unknown enemy kind '${spec.kind}'`);
  return kind.create(spec);
}

export function updateEnemy(e, dt, level, player = null) {
  const shot = ENEMY_KINDS[e.kind].update(e, dt, level, player) ?? null;
  if (e.y > level.height + RULES.fallLimit) e.alive = false;
  return shot;
}

export function stompEnemy(e) {
  return ENEMY_KINDS[e.kind].onStomp(e);
}
