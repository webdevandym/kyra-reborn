import { TILE, PLAYER, CRYSTAL, GOAL, RULES, FIREBALL, BONE, PORTAL, DOOR, SPIDER, SHARK, SHELL, PEARL, TEAL } from '../config.js';
import { createPlayer, updatePlayer } from './player.js';
import { createEnemy, updateEnemy, stompEnemy } from './enemies.js';
import { classifyContact } from './combat.js';
import { bodyRect, centeredRect, overlaps } from './rect.js';
import { shiftX } from './physics.js';
import { roomIndex, solidTop, tileAt } from './level.js';
import { createMover, updateMovers } from './platforms.js';
import { createRainCloud, rainPhase, rainRect } from './hazards.js';
import { createBubble, placeBubble, bubbleRect } from './bubbles.js';
import { createCrab, updateCrab } from './crab.js';

const SHOT_EVENTS = { bone: 'throw', fireball: 'fire', shell: 'shell' };
const KNOCKBACK = { spider: SPIDER.knockback, shark: SHARK.knockback };

export function createWorld(level, collected = new Set(), { start = null } = {}) {
  const firstRoom = start ? roomIndex(level, start.x) : 0;
  const world = {
    level,
    player: createPlayer(start ?? level.spawn),
    enemies: level.enemies.filter((spec) => roomIndex(level, spec.x) >= firstRoom).map(createEnemy),
    movers: level.movers.map(createMover),
    rain: level.rainClouds.map((spec) => createRainCloud(spec, level)),
    crystals: level.crystals.filter((c) => !collected.has(c.id)).map((c) => ({ ...c })),
    projectiles: [],
    bubbles: level.bubbles.map((spec) => createBubble(spec)),
    teals: level.teals.map((t) => ({ ...t })),
    pearls: level.pearls.map((p) => ({ x: p.x, y: p.y, w: PEARL.w, h: PEARL.h, open: false })),
    crabs: [],
    portal: level.portal ? { x: level.portal.x, y: level.portal.y, w: PORTAL.w, h: PORTAL.h, open: false, openedAt: 0 } : null,
    doors: level.doors.map((d) => ({ x: d.x, y: d.y, w: DOOR.w, h: DOOR.h })),
    checkpointReached: Boolean(start),
    goal: { x: level.goal.x, y: level.goal.y, w: GOAL.w, h: GOAL.h, locked: false },
    time: 0,
    done: false,
    step: (dt, input) => stepWorld(world, dt, input),
  };
  world.goal.locked = world.enemies.some((e) => e.kind === 'shark');
  return world;
}

const PROJECTILE_SIZE = { bone: BONE.size, shell: SHELL.size, fireball: FIREBALL.size };

export function projectileRect(f) {
  const size = PROJECTILE_SIZE[f.kind];
  return centeredRect(f.x, f.y, size, size);
}

function moveProjectile(f, dt, level, events) {
  if (f.kind === 'bone') {
    f.vy += BONE.gravity * dt;
    f.x += f.vx * dt;
    f.y += f.vy * dt;
    if (tileAt(level, Math.floor(f.x / TILE), Math.floor(f.y / TILE)) !== 'solid') return true;
    events.push({ type: 'boneBreak', x: f.x, y: f.y });
    return false;
  }
  if (f.kind === 'shell') {
    f.x += f.vx * dt;
    f.y += f.vy * dt;
    const leadX = f.x + Math.sign(f.vx) * (SHELL.size / 2);
    const leadY = f.y + Math.sign(f.vy) * (SHELL.size / 2);
    return f.y > -TILE && tileAt(level, Math.floor(leadX / TILE), Math.floor(leadY / TILE)) !== 'solid';
  }
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
  if (p.ride && p.onGround) {
    shiftX(p, p.ride.dx, world.level);
    p.y += p.ride.dy;
  }

  const { jumped, landed, popped } = updatePlayer(p, input, dt, world.level, world.movers);
  if (jumped) events.push({ type: 'jump', x: p.x, y: p.y });
  if (landed) events.push({ type: 'land', x: p.x, y: p.y });
  if (popped) events.push({ type: 'bubblePop', x: p.x, y: p.y - p.h / 2 });

  for (const e of world.enemies) {
    const shot = updateEnemy(e, dt, world.level, p);
    if (!shot) continue;
    world.projectiles.push(shot);
    events.push({ type: SHOT_EVENTS[shot.kind], x: shot.x, y: shot.y });
  }
  stepCrabs(world, dt, events);
  world.projectiles = world.projectiles.filter((f) => moveProjectile(f, dt, world.level, events));

  const playerBox = bodyRect(p);
  stepBubbles(world, events);
  for (const t of world.teals) {
    if (!overlaps(playerBox, centeredRect(t.x, t.y, TEAL.size, TEAL.size))) continue;
    t.taken = true;
    p.shield = true;
    p.shieldAll = true;
    events.push({ type: 'shieldUp', x: t.x, y: t.y });
  }
  world.teals = world.teals.filter((t) => !t.taken);
  for (const pearl of world.pearls) {
    if (pearl.open || !overlaps(playerBox, bodyRect(pearl))) continue;
    pearl.open = true;
    world.crabs.push(createCrab(pearl));
    events.push({ type: 'pearlOpen', x: pearl.x, y: pearl.y - pearl.h });
  }
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
      if (KNOCKBACK[e.kind] && result !== 'defeated') p.vx = e.dir * KNOCKBACK[e.kind];
      events.push({ type: 'stomp', kind: e.kind, result, x: e.x, y: top });
      if (result === 'defeated') onDefeat(world, e, events);
    } else if (contact === 'hit' && p.invuln <= 0) {
      if (!p.shieldAll) return die(world, events);
      popShield(p, events);
    }
  }
  world.enemies = world.enemies.filter((e) => e.alive);

  for (const f of world.projectiles) {
    if (p.invuln > 0 || !overlaps(bodyRect(p), projectileRect(f))) continue;
    f.spent = true;
    if (f.kind === 'bone' || !p.shield) return die(world, events);
    popShield(p, events, PLAYER.stompGrace);
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

  if (world.portal?.open && overlaps(bodyRect(p), bodyRect(world.portal))) {
    const to = world.level.checkpoint;
    events.push({ type: 'portal', ...moveTo(world, to.x, to.y) });
    world.checkpointReached = true;
  }

  const door = world.doors.find((d) => overlaps(bodyRect(p), bodyRect(d)));
  if (door) {
    const next = world.level.rooms[roomIndex(world.level, door.x) + 1];
    const x = next.left + 1.5 * TILE;
    events.push({ type: 'door', ...moveTo(world, x, solidTop(world.level, Math.floor(x / TILE))) });
  }

  if (!world.goal.locked && overlaps(bodyRect(p), bodyRect(world.goal))) {
    world.done = true;
    p.won = true;
    events.push({ type: 'goal', x: world.goal.x, y: world.goal.y });
  }
  return events;
}

function popShield(p, events, grace = PLAYER.spawnGrace) {
  p.shield = false;
  p.shieldAll = false;
  p.invuln = Math.max(p.invuln, grace);
  events.push({ type: 'shieldPop', x: p.x, y: p.y - p.h / 2 });
}

function stepBubbles(world, events) {
  const p = world.player;
  const box = bodyRect(p);
  for (const b of world.bubbles) {
    placeBubble(b, world.time);
    const rect = bubbleRect(b);
    if (!b.carry) {
      const taken = world.crystals.find((c) => overlaps(rect, centeredRect(c.x, c.y, CRYSTAL.size, CRYSTAL.size)));
      if (taken) {
        b.carry = taken;
        world.crystals = world.crystals.filter((c) => c !== taken);
        events.push({ type: 'bubbleGrab', x: b.x, y: b.y });
      }
    }
    if (!overlaps(box, rect)) continue;
    b.popped = true;
    p.bubble = true;
    events.push({ type: 'bubble', x: b.x, y: b.y });
    if (b.carry) events.push({ type: 'crystal', id: b.carry.id, x: b.x, y: b.y });
  }
  world.bubbles = world.bubbles.filter((b) => !b.popped);
}

function stepCrabs(world, dt, events) {
  const sharks = world.enemies.filter((e) => e.kind === 'shark');
  for (const crab of world.crabs) {
    const shark = updateCrab(crab, dt, world.level, sharks);
    if (!shark) continue;
    shark.lives -= 1;
    shark.dizzy = SHARK.dizzyTime;
    shark.winding = false;
    shark.shotsLeft = 0;
    shark.cooldown = SHARK.fireEvery;
    const result = shark.lives > 0 ? 'hurt' : 'defeated';
    events.push({ type: 'crabPinch', result, x: shark.x, y: shark.y - shark.h });
    if (result === 'defeated') {
      shark.alive = false;
      onDefeat(world, shark, events);
    }
  }
  world.crabs = world.crabs.filter((c) => c.alive);
  world.enemies = world.enemies.filter((e) => e.alive);
}

function onDefeat(world, e, events) {
  const p = world.player;
  if (e.kind === 'shark' && world.goal.locked && !world.enemies.some((s) => s.kind === 'shark' && s.alive)) {
    world.goal.locked = false;
    events.push({ type: 'goalOpen', x: world.goal.x, y: world.goal.y });
  }
  if (e.kind === 'rat' && e.guard && !p.shield) {
    p.shield = true;
    events.push({ type: 'shieldUp', x: p.x, y: p.y - p.h });
  }
  if (e.kind === 'spider' && world.portal && !world.portal.open) {
    world.portal.open = true;
    world.portal.openedAt = world.time;
    events.push({ type: 'portalOpen', x: world.portal.x, y: world.portal.y });
  }
}

function moveTo(world, x, y) {
  const p = world.player;
  const from = { x: p.x, y: p.y };
  p.x = x;
  p.y = y;
  p.prevBottom = y;
  p.vx = 0;
  p.vy = 0;
  p.onGround = true;
  p.jumping = false;
  p.ride = null;
  p.invuln = Math.max(p.invuln, PLAYER.spawnGrace);
  world.projectiles = [];
  return { from, to: { x, y } };
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
