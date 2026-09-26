import { PLAYER, CRYSTAL, GOAL, RULES } from '../config.js';
import { createPlayer, updatePlayer } from './player.js';
import { createEnemy, updateEnemy, stompEnemy } from './enemies.js';
import { classifyContact } from './combat.js';
import { bodyRect, centeredRect, overlaps } from './rect.js';
import { shiftX } from './physics.js';
import { createMover, updateMovers } from './platforms.js';
import { createRainCloud, rainPhase, rainRect } from './hazards.js';

export function createWorld(level, collected = new Set()) {
  const world = {
    level,
    player: createPlayer(level.spawn),
    enemies: level.enemies.map(createEnemy),
    movers: level.movers.map(createMover),
    rain: level.rainClouds.map((spec) => createRainCloud(spec, level)),
    crystals: level.crystals.filter((c) => !collected.has(c.id)).map((c) => ({ ...c })),
    goal: { x: level.goal.x, y: level.goal.y, w: GOAL.w, h: GOAL.h },
    time: 0,
    done: false,
    step: (dt, input) => stepWorld(world, dt, input),
  };
  return world;
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

  for (const e of world.enemies) updateEnemy(e, dt, world.level);

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
    } else if (contact === 'hit' && p.invuln <= 0) {
      return die(world, events);
    }
  }
  world.enemies = world.enemies.filter((e) => e.alive);

  if (p.invuln <= 0) {
    const box = bodyRect(p);
    for (const cloud of world.rain) {
      const wet = rainRect(cloud, world.time);
      if (wet && overlaps(box, wet)) return die(world, events);
    }
  }

  if (p.y > world.level.height + RULES.fallLimit) return die(world, events);

  if (overlaps(playerBox, bodyRect(world.goal))) {
    world.done = true;
    p.won = true;
    events.push({ type: 'goal', x: world.goal.x, y: world.goal.y });
  }
  return events;
}

function die(world, events) {
  const p = world.player;
  world.done = true;
  world.enemies = world.enemies.filter((e) => e.alive);
  p.dead = true;
  events.push({ type: 'hit', x: p.x, y: Math.min(p.y - p.h / 2, world.level.height - 30) });
  return events;
}
