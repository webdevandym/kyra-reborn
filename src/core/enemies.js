import { TILE, STEP, CARROT, ZOMBIE, PROPELLER, BEE, FLYER, RULES, STAR, BAT, RAT, SKELETON, GHOST, SPIDER, FIREBALL, BONE, DOLPHIN, FISH, SHARK, SHELL, RABBIT, DEER, SNAKE, CONE } from '../config.js';
import { applyGravity, moveAndCollide } from './physics.js';
import { tileAt, roomAt } from './level.js';
import { shooterState, updateShooter, stompShooter } from './shooter.js';
import { aim8 } from './aim.js';
import { monkey } from './monkey.js';
import { grandma } from './grandma.js';

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
  create: (spec) => ({ ...baseEnemy(spec, RAT.w, RAT.h, RAT.speed), guard: Boolean(spec.guard) }),
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

const skeletonLives = twoLife(SKELETON);

function inThrowRange(e, level, player) {
  return Boolean(player) && !player.dead && roomAt(level, player.x) === e.room && Math.abs(player.x - e.x) <= SKELETON.throwRange * TILE;
}

function boneToward(e, player) {
  const x = e.x + e.dir * 12;
  const y = e.y - e.h - 6;
  const t = BONE.flight;
  const vx = Math.max(-BONE.maxSpeed, Math.min(BONE.maxSpeed, (player.x - x) / t));
  const vy = (player.y - y - 0.5 * BONE.gravity * t * t) / t;
  return { kind: 'bone', x, y, vx, vy };
}

const skeleton = {
  create: (spec) => ({ ...skeletonLives.create(spec), throwTimer: SKELETON.throwEvery, winding: false, room: null }),
  update(e, dt, level, player) {
    e.room ??= roomAt(level, e.x);
    if (e.dizzy > 0 || !inThrowRange(e, level, player)) {
      e.winding = false;
      e.throwTimer = Math.max(e.throwTimer, SKELETON.throwWindup + STEP);
      dizzyPatrol(e, dt, level);
      return null;
    }
    e.throwTimer -= dt;
    if (e.throwTimer > SKELETON.throwWindup) {
      dizzyPatrol(e, dt, level);
      return null;
    }
    e.winding = true;
    e.vx = 0;
    e.dir = Math.sign(player.x - e.x) || e.dir;
    if (e.throwTimer > 0) return null;
    e.throwTimer = SKELETON.throwEvery;
    e.winding = false;
    return boneToward(e, player);
  },
  onStomp(e) {
    const result = skeletonLives.onStomp(e);
    e.throwTimer = SKELETON.throwEvery;
    e.winding = false;
    return result;
  },
};

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

function spiderShot(e) {
  return {
    kind: 'fireball',
    x: e.x + e.dir * (e.w / 2 + FIREBALL.size / 2),
    y: e.y - (e.volleyHigh ? FIREBALL.highY : FIREBALL.lowY),
    vx: e.dir * FIREBALL.speed,
  };
}

const SPIDER_RULES = {
  cfg: SPIDER,
  minVolley: 1,
  maxVolley: 3,
  inRange(e, level, player) {
    const reach = Math.abs(player.x - e.x);
    return !player.dead && roomAt(level, player.x) === e.room && reach >= SPIDER.minRange * TILE && reach <= SPIDER.maxRange * TILE;
  },
  shoot: spiderShot,
};

const spider = {
  create: (spec) => ({ ...baseEnemy(spec, SPIDER.w, SPIDER.h, 0), ...shooterState(SPIDER, SPIDER_RULES.minVolley), room: null }),
  update(e, dt, level, player) {
    e.room ??= roomAt(level, e.x);
    return updateShooter(e, dt, level, player, SPIDER_RULES);
  },
  onStomp: (e) => stompShooter(e, SPIDER, defeat),
};

const dolphinLives = twoLife(DOLPHIN);
const swimmingDolphin = flyer({ ...DOLPHIN, range: DOLPHIN.swimRange });
const swimmingFish = flyer({ ...FISH, range: FISH.swimRange });

const dolphin = {
  create: (spec) => (spec.swim ? { ...swimmingDolphin.create(spec), lives: 2, dizzy: 0, swim: true } : { ...dolphinLives.create(spec), swim: false }),
  update(e, dt, level) {
    e.dizzy = Math.max(0, e.dizzy - dt);
    if (e.swim) hover(e, dt, level);
    else patrol(e, dt, level);
  },
  onStomp: dolphinLives.onStomp,
};

const fish = {
  create: (spec) => (spec.swim ? { ...swimmingFish.create(spec), swim: true } : { ...baseEnemy(spec, FISH.w, FISH.h, FISH.speed), swim: false }),
  update: (e, dt, level) => (e.swim ? hover(e, dt, level) : patrol(e, dt, level)),
  onStomp: defeat,
};

const sharkOverhead = (e, player) => Math.abs(player.x - e.x) <= SHARK.overhead * TILE && player.y < e.y - e.h;

function sharkShot(e, player) {
  if (sharkOverhead(e, player)) return { kind: 'shell', x: e.x, y: e.y - e.h - SHELL.size / 2, vx: 0, vy: -SHELL.speed };
  return {
    kind: 'shell',
    x: e.x + e.dir * (e.w / 2 + SHELL.size / 2),
    y: e.y - (e.volleyHigh ? SHELL.highY : SHELL.lowY),
    vx: e.dir * SHELL.speed,
    vy: 0,
  };
}

const SHARK_RULES = {
  cfg: SHARK,
  minVolley: 2,
  maxVolley: 4,
  inRange: (e, level, player) => !player.dead && Math.abs(player.x - e.x) <= SHARK.maxRange * TILE,
  overhead: (e, level, player) => sharkOverhead(e, player),
  shoot: sharkShot,
};

const shark = {
  create: (spec) => ({ ...baseEnemy(spec, SHARK.w, SHARK.h, 0), ...shooterState(SHARK, SHARK_RULES.minVolley) }),
  update: (e, dt, level, player) => updateShooter(e, dt, level, player, SHARK_RULES),
  onStomp: (e) => stompShooter(e, SHARK, defeat),
};

const SNAKE_REACH_ROWS = 8;

function snakeShot(e, player) {
  const centreY = e.y - e.h / 2;
  const { dx, dy } = aim8(e.x, centreY, player.x, player.y - player.h / 2);
  const reach = Math.max(e.w, e.h) / 2 + CONE.size / 2;
  return { kind: 'cone', x: e.x + dx * reach, y: centreY + dy * reach, vx: dx * CONE.speed, vy: dy * CONE.speed };
}

const SNAKE_RULES = {
  cfg: SNAKE,
  minVolley: 1,
  maxVolley: 3,
  inRange(e, level, player) {
    const rows = Math.abs(player.y - player.h / 2 - (e.y - e.h / 2)) / TILE;
    return !player.dead && roomAt(level, player.x) === e.room && Math.abs(player.x - e.x) <= SNAKE.maxRange * TILE && rows <= SNAKE_REACH_ROWS;
  },
  overhead: (e, level, player) => player.y < e.y - e.h && Math.abs(player.x - e.x) <= SNAKE.overhead * TILE,
  shoot: snakeShot,
};

const hoveringSnake = flyer({ ...SNAKE, speed: 0, range: 0 });

const snake = {
  create: (spec) => ({
    ...(spec.fly ? hoveringSnake.create(spec) : baseEnemy(spec, SNAKE.w, SNAKE.h, 0)),
    ...shooterState(SNAKE, SNAKE_RULES.minVolley),
    room: null,
    fly: Boolean(spec.fly),
  }),
  update(e, dt, level, player) {
    e.room ??= roomAt(level, e.x);
    if (e.fly) {
      e.phase += e.bobSpeed * dt;
      e.prevBottom = e.y;
      e.y = flyerFeet(e);
    }
    return updateShooter(e, dt, level, player, SNAKE_RULES);
  },
  onStomp: (e) => stompShooter(e, SNAKE, defeat),
};

const rabbit = {
  create: (spec) => baseEnemy(spec, RABBIT.w, RABBIT.h, RABBIT.speed),
  update: patrol,
  onStomp: defeat,
};

const deer = twoLife(DEER);

export const ENEMY_KINDS = {
  dolphin,
  fish,
  shark,
  carrot,
  zombie,
  propeller: flyer(PROPELLER),
  bee: flyer(BEE),
  star: twoLife(STAR),
  bat,
  rat,
  skeleton,
  ghost,
  spider,
  rabbit,
  deer,
  snake,
  monkey,
  grandma,
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
