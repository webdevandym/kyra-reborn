import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TILE, STEP, PLAYER } from '../src/config.js';
import { createPlayer, updatePlayer } from '../src/core/player.js';
import { testLevel, runSteps } from './helpers.js';

const IDLE = { left: false, right: false, jumpHeld: false, jumpPressed: false };
const flat = () => testLevel(['C..................G', '####################']);

function peakHeight(p, level, inputFor, steps = 120) {
  const startY = p.y;
  let minY = p.y;
  runSteps(steps, (i) => {
    updatePlayer(p, inputFor(i), STEP, level);
    minY = Math.min(minY, p.y);
  });
  return startY - minY;
}

test('a new player stands at the spawn point facing right with spawn grace', () => {
  const p = createPlayer({ x: 100, y: 450 });
  assert.equal(p.x, 100);
  assert.equal(p.y, 450);
  assert.equal(p.facing, 1);
  assert.equal(p.invuln, PLAYER.spawnGrace);
});

test('holding right accelerates to walk speed and faces right; letting go stops', () => {
  const level = flat();
  const p = createPlayer(level.spawn);
  runSteps(60, () => updatePlayer(p, { ...IDLE, right: true }, STEP, level));
  assert.equal(p.vx, PLAYER.walkSpeed);
  runSteps(30, () => updatePlayer(p, { ...IDLE, left: true }, STEP, level));
  assert.equal(p.facing, -1);
  runSteps(60, () => updatePlayer(p, IDLE, STEP, level));
  assert.equal(p.vx, 0);
});

test('a full jump rises about 3.75 tiles and a tapped jump rises much less', () => {
  const level = flat();
  const full = createPlayer(level.spawn);
  const fullHeight = peakHeight(full, level, (i) => ({ ...IDLE, jumpPressed: i === 0, jumpHeld: true }));
  assert.ok(fullHeight > 3.5 * TILE && fullHeight < 4 * TILE, `full jump ${fullHeight}`);

  const tap = createPlayer(level.spawn);
  const tapHeight = peakHeight(tap, level, (i) => ({ ...IDLE, jumpPressed: i === 0, jumpHeld: i < 4 }));
  assert.ok(tapHeight < fullHeight / 2, `tap jump ${tapHeight}`);
});

test('jump returns jumped once and landed when touching down again', () => {
  const level = flat();
  const p = createPlayer(level.spawn);
  let jumps = 0;
  let landings = 0;
  runSteps(150, (i) => {
    const r = updatePlayer(p, { ...IDLE, jumpPressed: i === 0, jumpHeld: true }, STEP, level);
    if (r.jumped) jumps++;
    if (r.landed) landings++;
  });
  assert.equal(jumps, 1);
  assert.equal(landings, 1);
  assert.equal(p.onGround, true);
});

test('coyote time: a jump pressed just after walking off a ledge still works', () => {
  const level = testLevel(['C....G', '###...', '######']);
  const p = createPlayer(level.spawn);
  let leftLedgeAt = -1;
  let jumped = false;
  runSteps(200, (i) => {
    const offLedge = leftLedgeAt >= 0 && i === leftLedgeAt + 6;
    const r = updatePlayer(p, { ...IDLE, right: true, jumpPressed: offLedge, jumpHeld: true }, STEP, level);
    if (leftLedgeAt < 0 && !p.onGround) leftLedgeAt = i;
    if (r.jumped) jumped = true;
  });
  assert.ok(leftLedgeAt >= 0, 'walked off the ledge');
  assert.ok(jumped, 'jump within coyote time was accepted');
});

test('jump buffer: a jump pressed just before landing fires on touchdown', () => {
  const level = flat();
  const p = createPlayer({ x: 5 * TILE, y: 6 * TILE });
  p.onGround = false;
  let pressedAt = -1;
  let jumpedAt = -1;
  runSteps(240, (i) => {
    const nearGround = pressedAt < 0 && p.vy > 0 && p.y > 10 * TILE - 20;
    if (nearGround) pressedAt = i;
    const r = updatePlayer(p, { ...IDLE, jumpPressed: nearGround, jumpHeld: true }, STEP, level);
    if (r.jumped && jumpedAt < 0) jumpedAt = i;
  });
  assert.ok(pressedAt >= 0, 'pressed while still in the air');
  assert.ok(jumpedAt > pressedAt, 'jumped after landing');
  assert.ok((jumpedAt - pressedAt) * STEP <= PLAYER.jumpBuffer, 'within the buffer window');
});

test('pressing jump in mid-air without coyote time does nothing', () => {
  const level = flat();
  const p = createPlayer({ x: 5 * TILE, y: 3 * TILE });
  p.onGround = false;
  runSteps(20, () => updatePlayer(p, IDLE, STEP, level));
  const r = updatePlayer(p, { ...IDLE, jumpPressed: true, jumpHeld: true }, STEP, level);
  assert.equal(r.jumped, false);
});

test('squash flattens the chicken on landing and eases back out over squashTime', () => {
  const level = flat();
  const p = createPlayer(level.spawn);
  let squashAtLanding = -1;
  runSteps(150, (i) => {
    const r = updatePlayer(p, { ...IDLE, jumpPressed: i === 0, jumpHeld: true }, STEP, level);
    if (r.landed) squashAtLanding = p.squash;
  });
  assert.equal(squashAtLanding, PLAYER.squashTime);
  runSteps(Math.ceil(PLAYER.squashTime / STEP), () => updatePlayer(p, IDLE, STEP, level));
  assert.equal(p.squash, 0);
});

test('invulnerability counts down to zero', () => {
  const level = flat();
  const p = createPlayer(level.spawn);
  runSteps(Math.ceil(PLAYER.spawnGrace / STEP) + 1, () => updatePlayer(p, IDLE, STEP, level));
  assert.equal(p.invuln, 0);
});
