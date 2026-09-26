import { TILE, CARROT, ZOMBIE, PROPELLER, BEE, FLYER, RULES, STAR, BAT } from '../config.js';
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

function dizzyPatrol(e, dt, level) {
  e.dizzy = Math.max(0, e.dizzy - dt);
  patrol(e, dt, level);
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
    e.alive = false;
    return 'defeated';
  },
};

const star = {
  create: (spec) => ({ ...baseEnemy(spec, STAR.w, STAR.h, STAR.speed), lives: 2, dizzy: 0 }),
  update: dizzyPatrol,
  onStomp(e) {
    if (e.lives > 1) {
      e.lives -= 1;
      e.dizzy = STAR.dizzyTime;
      e.speed = STAR.hurtSpeed;
      return 'hurt';
    }
    e.alive = false;
    return 'defeated';
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
    onStomp(e) {
      e.alive = false;
      return 'defeated';
    },
  };
}

export const ENEMY_KINDS = { carrot, zombie, propeller: flyer(PROPELLER), bee: flyer(BEE), star, bat: flyer(BAT) };

export function createEnemy(spec) {
  const kind = ENEMY_KINDS[spec.kind];
  if (!kind) throw new Error(`unknown enemy kind '${spec.kind}'`);
  return kind.create(spec);
}

export function updateEnemy(e, dt, level) {
  ENEMY_KINDS[e.kind].update(e, dt, level);
  if (e.y > level.height + RULES.fallLimit) e.alive = false;
}

export function stompEnemy(e) {
  return ENEMY_KINDS[e.kind].onStomp(e);
}
