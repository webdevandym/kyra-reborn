import { TILE, PLAYER, CRYSTAL, GOAL, RULES, FIREBALL, PORTAL } from '../config.js';
import { createPlayer, updatePlayer } from './player.js';
import { createEnemy, updateEnemy, stompEnemy } from './enemies.js';
import { classifyContact } from './combat.js';
import { bodyRect, centeredRect, overlaps } from './rect.js';
import { shiftX } from './physics.js';
import { roomAt, tileAt } from './level.js';
import { createMover, updateMovers } from './platforms.js';
import { createRainCloud, rainPhase, rainRect } from './hazards.js';

export function createWorld(level, collected = new Set(), { start = null } = {}) {
  const startRoom = start ? roomAt(level, start.x) : null;
  const world = {
    level,
    player: createPlayer(start ?? level.spawn),
    enemies: level.enemies.filter((spec) => !startRoom || roomAt(level, spec.x) === startRoom).map(createEnemy),
    movers: level.movers.map(createMover),
    rain: level.rainClouds.map((spec) => createRainCloud(spec, level)),
    crystals: level.crystals.filter((c) => !collected.has(c.id)).map((c) => ({ ...c })),
    projectiles: [],
    portal: level.portal ? { x: level.portal.x, y: level.portal.y, w: PORTAL.w, h: PORTAL.h, open: false, openedAt: 0 } : null,
    checkpointReached: Boolean(start),
    goal: { x: level.goal.x, y: level.goal.y, w: GOAL.w, h: GOAL.h },
    time: 0,
    done: false,
    step: (dt, input) => stepWorld(world, dt, input),
  };
  return world;
}

export function fireballRect(f) {
  return centeredRect(f.x, f.y, FIREBALL.size, FIREBALL.size);
}

function moveFireball(f, dt, level) {
  f.x += f.vx * dt;
  const lead = f.x + Math.sign(f.vx) * (FIREBALL.size / 2);
  return tileAt(level, Math.floor(lead / TILE), Math.floor(f.y / TILE)) !== 'solid';
}

export function stepWorld(world, dt, input) {
  const events = [];
  if (world.done) return events;
  const before = world.time;
  world.time += dt;
  const p = world.player;

  updateMovers(world.movers, world.time);
  for (const cloud of world.rain) {
    if (rainPhase(cloud, before) !== 'rain' && rainPhase(cloud, world.time) === 'rain') {
      events.push({ type: 'rainStart', x: cloud.x, y: cloud.y });
    }
  }
  if (p.ride && p.onGround) shiftX(p, p.ride.dx, world.level);

  const { jumped, landed } = updatePlayer(p, input, dt, world.level, world.movers);
  if (jumped) events.push({ type: 'jump', x: p.x, y: p.y });
  if (landed) events.push({ type: 'land', x: p.x, y: p.y });

  for (const e of world.enemies) {
    const shot = updateEnemy(e, dt, world.level, p);
    if (!shot) continue;
    world.projectiles.push(shot);
    events.push({ type: 'fire', x: shot.x, y: shot.y });
  }
  world.projectiles = world.projectiles.filter((f) => moveFireball(f, dt, world.level));

  const playerBox = bodyRect(p);
  world.crystals = world.crystals.filter((c) => {
    if (!overlaps(playerBox, centeredRect(c.x, c.y, CRYSTAL.size, CRYSTAL.size))) return true;
    events.push({ type: 'crystal', id: c.id, x: c.x, y: c.y });
    return false;
  });

  for (const e of world.enemies) {
    const contact = classifyContact(p, e);
    if (contact === 'stomp') {
      const top = e.y - e.h;
      const result = stompEnemy(e);
      p.vy = -(input.jumpHeld ? PLAYER.stompBounceHeld : PLAYER.stompBounce);
      p.jumping = false;
      p.onGround = false;
      p.invuln = Math.max(p.invuln, PLAYER.stompGrace);
      events.push({ type: 'stomp', kind: e.kind, result, x: e.x, y: top });
      if (result === 'defeated') onDefeat(world, e, events);
    } else if (contact === 'hit' && p.invuln <= 0) {
      return die(world, events);
    }
  }
  world.enemies = world.enemies.filter((e) => e.alive);

  for (const f of world.projectiles) {
    if (p.invuln > 0 || !overlaps(bodyRect(p), fireballRect(f))) continue;
    f.spent = true;
    if (!p.shield) return die(world, events);
    p.shield = false;
    p.invuln = Math.max(p.invuln, PLAYER.stompGrace);
    events.push({ type: 'shieldPop', x: p.x, y: p.y - p.h / 2 });
  }
  world.projectiles = world.projectiles.filter((f) => !f.spent);

  if (p.invuln <= 0) {
    const box = bodyRect(p);
    for (const cloud of world.rain) {
      const wet = rainRect(cloud, world.time);
      if (wet && overlaps(box, wet)) return die(world, events);
    }
  }

  if (p.y > world.level.height + RULES.fallLimit) return die(world, events);

  if (world.portal?.open && overlaps(bodyRect(p), bodyRect(world.portal))) enterPortal(world, events);

  if (overlaps(bodyRect(p), bodyRect(world.goal))) {
    world.done = true;
    p.won = true;
    events.push({ type: 'goal', x: world.goal.x, y: world.goal.y });
  }
  return events;
}

function onDefeat(world, e, events) {
  const p = world.player;
  if (e.kind === 'rat' && !p.shield) {
    p.shield = true;
    events.push({ type: 'shieldUp', x: p.x, y: p.y - p.h });
  }
  if (e.kind === 'spider' && world.portal && !world.portal.open) {
    world.portal.open = true;
    world.portal.openedAt = world.time;
    events.push({ type: 'portalOpen', x: world.portal.x, y: world.portal.y });
  }
}

function enterPortal(world, events) {
  const p = world.player;
  const from = { x: p.x, y: p.y };
  const to = { x: world.level.checkpoint.x, y: world.level.checkpoint.y };
  p.x = to.x;
  p.y = to.y;
  p.prevBottom = to.y;
  p.vx = 0;
  p.vy = 0;
  p.onGround = true;
  p.jumping = false;
  p.ride = null;
  p.invuln = Math.max(p.invuln, PLAYER.spawnGrace);
  world.projectiles = [];
  world.checkpointReached = true;
  events.push({ type: 'portal', from, to });
}

function die(world, events) {
  const p = world.player;
  world.done = true;
  world.enemies = world.enemies.filter((e) => e.alive);
  world.projectiles = world.projectiles.filter((f) => !f.spent);
  p.dead = true;
  events.push({ type: 'hit', x: p.x, y: Math.min(p.y - p.h / 2, world.level.height - 30) });
  return events;
}
