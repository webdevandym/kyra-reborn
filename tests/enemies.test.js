import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TILE, STEP, GRAVITY, CARROT, ZOMBIE, PROPELLER, BEE, FLYER, PLAYER, STAR, BAT, RAT, SKELETON, GHOST, SPIDER, FIREBALL } from '../src/config.js';
import { createEnemy, updateEnemy, stompEnemy, ENEMY_KINDS } from '../src/core/enemies.js';
import { bodyRect, overlaps } from '../src/core/rect.js';
import { parseLevel } from '../src/core/level.js';
import { testLevel, runSteps, castleMap } from './helpers.js';

function track(e, level, steps) {
  let minX = e.x;
  let maxX = e.x;
  let turns = 0;
  let lastDir = e.dir;
  runSteps(steps, () => {
    updateEnemy(e, STEP, level);
    minX = Math.min(minX, e.x);
    maxX = Math.max(maxX, e.x);
    if (e.dir !== lastDir) {
      turns++;
      lastDir = e.dir;
    }
  });
  return { minX, maxX, turns };
}

test('the registry knows every ground and flying kind and rejects unknown kinds', () => {
  assert.deepEqual(Object.keys(ENEMY_KINDS).sort(), ['bat', 'bee', 'carrot', 'ghost', 'propeller', 'rat', 'skeleton', 'spider', 'star', 'zombie']);
  assert.throws(() => createEnemy({ kind: 'dragon', x: 0, y: 0 }), /unknown enemy kind 'dragon'/);
});

test('a carrot starts walking left at carrot speed', () => {
  const level = testLevel(['C........c.G', '############']);
  const [spec] = level.enemies;
  const e = createEnemy(spec);
  assert.equal(e.w, CARROT.w);
  assert.equal(e.h, CARROT.h);
  updateEnemy(e, STEP, level);
  assert.equal(e.vx, -CARROT.speed);
  assert.ok(e.x < spec.x);
  assert.equal(e.y, spec.y, 'stays on the ground');
});

test('a carrot turns around at walls and keeps patrolling between them', () => {
  const level = testLevel(['C#....c...#G', '############']);
  const e = createEnemy(level.enemies[0]);
  const { minX, maxX, turns } = track(e, level, 60 * 120);
  assert.ok(minX >= 2 * TILE + e.w / 2 - 0.01, `minX ${minX}`);
  assert.ok(maxX <= 10 * TILE - e.w / 2 + 0.01, `maxX ${maxX}`);
  assert.ok(turns >= 4, `turned ${turns} times`);
});

test('a carrot never walks off a ledge', () => {
  const level = testLevel(['C...c.....G', '...###.....', '###########']);
  const e = createEnemy(level.enemies[0]);
  const { minX, maxX, turns } = track(e, level, 60 * 120);
  assert.ok(minX >= 3 * TILE - e.w / 2, `minX ${minX}`);
  assert.ok(maxX <= 6 * TILE + e.w / 2, `maxX ${maxX}`);
  assert.equal(e.y, 10 * TILE, 'still on top of the block');
  assert.ok(turns >= 4);
});

test('carrots patrol one-way platforms without falling off', () => {
  const level = testLevel(['.....c.....', '....====...', 'C.........G', '###########']);
  const e = createEnemy(level.enemies[0]);
  track(e, level, 30 * 120);
  assert.equal(e.y, 9 * TILE);
});

test('stomping a carrot defeats it', () => {
  const e = createEnemy({ kind: 'carrot', x: 100, y: 450 });
  assert.equal(stompEnemy(e), 'defeated');
  assert.equal(e.alive, false);
});

test('a big zombie shrinks, gets faster and dizzy on the first stomp and is defeated on the second', () => {
  const level = testLevel(['C.........Z..........G', '######################']);
  const e = createEnemy(level.enemies[0]);
  assert.equal(e.size, 'big');
  assert.equal(e.w, ZOMBIE.bigW);
  assert.equal(e.h, ZOMBIE.bigH);
  assert.equal(e.speed, ZOMBIE.bigSpeed);

  assert.equal(stompEnemy(e), 'shrunk');
  assert.equal(e.alive, true);
  assert.equal(e.size, 'small');
  assert.equal(e.w, ZOMBIE.smallW);
  assert.equal(e.h, ZOMBIE.smallH);
  assert.equal(e.speed, ZOMBIE.smallSpeed);
  assert.equal(e.dizzy, ZOMBIE.dizzyTime);

  const before = e.x;
  runSteps(60, () => updateEnemy(e, STEP, level));
  assert.ok(Math.abs(before - e.x) > ZOMBIE.bigSpeed, 'moves faster than a big zombie');
  assert.ok(e.dizzy < ZOMBIE.dizzyTime);
  assert.equal(e.y, 11 * TILE, 'feet stay on the ground after shrinking');

  assert.equal(stompEnemy(e), 'defeated');
  assert.equal(e.alive, false);
});

const centreOf = (e) => e.y - e.h / 2;

for (const [kind, cfg, map] of [
  ['propeller', PROPELLER, ['C.........p.........G', '#####################']],
  ['bee', BEE, ['..........b..........', 'C...................G', '#####################']],
]) {
  test(`a ${kind} hovers around its home height without falling`, () => {
    const level = testLevel(map);
    const [spec] = level.enemies;
    const e = createEnemy(spec);
    const homeY = spec.y - TILE / 2 - cfg.lift;
    assert.equal(e.w, cfg.w);
    assert.equal(e.h, cfg.h);
    assert.equal(e.homeY, homeY);
    runSteps(10 * 120, () => {
      updateEnemy(e, STEP, level);
      assert.ok(Math.abs(centreOf(e) - homeY) <= cfg.bob + 1e-9, `centre ${centreOf(e)}`);
    });
  });

  test(`a ${kind} patrols ${cfg.range} tiles each side of its start and keeps turning`, () => {
    const level = testLevel(map);
    const e = createEnemy(level.enemies[0]);
    const { minX, maxX, turns } = track(e, level, 30 * 120);
    assert.ok(Math.abs(minX - (e.homeX - cfg.range * TILE)) < 1e-6, `minX ${minX}`);
    assert.ok(Math.abs(maxX - (e.homeX + cfg.range * TILE)) < 1e-6, `maxX ${maxX}`);
    assert.ok(turns >= 4, `turned ${turns} times`);
  });

  test(`one stomp defeats a ${kind}`, () => {
    const e = createEnemy({ kind, x: 100, y: 450 });
    assert.equal(stompEnemy(e), 'defeated');
    assert.equal(e.alive, false);
  });
}

test('a propeller carrot starts flying left at propeller speed', () => {
  const level = testLevel(['C.........p.........G', '#####################']);
  const e = createEnemy(level.enemies[0]);
  const x = e.x;
  updateEnemy(e, STEP, level);
  assert.equal(e.dir, -1);
  assert.ok(Math.abs(x - e.x - PROPELLER.speed * STEP) < 1e-9);
});

test('a flyer turns at a wall inside its bob envelope before reaching its range', () => {
  const level = testLevel(['C.......#p.........G', '####################']);
  const e = createEnemy(level.enemies[0]);
  const { minX } = track(e, level, 10 * 120);
  assert.ok(Math.abs(minX - (9 * TILE + e.w / 2)) < 1e-6, `minX ${minX}`);
});

test('a flyer ignores a wall that is outside its bob envelope', () => {
  const level = testLevel(['.......b.......', '...............', '...#...........', 'C.............G', '###############']);
  const e = createEnemy(level.enemies[0]);
  const { minX } = track(e, level, 10 * 120);
  assert.ok(Math.abs(minX - (e.homeX - BEE.range * TILE)) < 1e-6, `minX ${minX}`);
});

test('a flyer turns at the edge of the level', () => {
  const level = testLevel(['.p......G', 'C........', '#########']);
  const e = createEnemy(level.enemies[0]);
  const { minX } = track(e, level, 10 * 120);
  assert.ok(Math.abs(minX - e.w / 2) < 1e-6, `minX ${minX}`);
});

test('a propeller carrot flies over a drop where a ground carrot turns back', () => {
  const map = ['.....p.....', 'C...###...G', '###########'];
  const level = testLevel(map);
  const flyer = createEnemy(level.enemies[0]);
  const { minX, maxX } = track(flyer, level, 20 * 120);
  assert.ok(minX < 4 * TILE && maxX > 7 * TILE, `flew ${minX}..${maxX}`);

  const walker = createEnemy({ ...level.enemies[0], kind: 'carrot' });
  const walked = track(walker, level, 20 * 120);
  assert.ok(walked.minX >= 4 * TILE - walker.w / 2 && walked.maxX <= 7 * TILE + walker.w / 2);
});

test('a flyer passes through one-way platforms', () => {
  const level = testLevel(['...b......', '===.......', '..........', 'C........G', '##########']);
  const e = createEnemy(level.enemies[0]);
  const { minX } = track(e, level, 10 * 120);
  assert.ok(Math.abs(minX - e.w / 2) < 1e-6, `minX ${minX}`);
});

test('each flyer starts its bob at its map column times the phase step', () => {
  const level = testLevel(['.....b....', 'C........G', '##########']);
  const [spec] = level.enemies;
  const e = createEnemy(spec);
  assert.ok(Math.abs(e.phase - 5 * FLYER.phasePerCol) < 1e-9);
  assert.ok(Math.abs(centreOf(e) - (e.homeY + BEE.bob * Math.sin(5 * FLYER.phasePerCol))) < 1e-9);
});

test('a chicken on the ground can run under a bee at the top of its wave but not at the bottom', () => {
  const level = testLevel(['.....b....', 'C........G', '##########']);
  const e = createEnemy(level.enemies[0]);
  const chicken = bodyRect({ x: e.x, y: 11 * TILE, w: PLAYER.w, h: PLAYER.h });
  const at = (phase) => bodyRect({ ...e, y: e.homeY + BEE.bob * Math.sin(phase) + e.h / 2 });
  assert.equal(overlaps(chicken, at(-Math.PI / 2)), false, 'top of the wave');
  assert.equal(overlaps(chicken, at(Math.PI / 2)), true, 'bottom of the wave');
});

test('a bee at the top of its wave is still below the height of a full jump', () => {
  const ground = 11 * TILE;
  const homeY = 9.5 * TILE;
  const highestTop = homeY - BEE.bob - BEE.h / 2;
  const apex = PLAYER.jumpVelocity ** 2 / (2 * GRAVITY);
  assert.ok(ground - apex < highestTop - 40, `apex feet ${ground - apex}, bee top ${highestTop}`);
});

test('a propeller carrot always floats clearly above the ground under it', () => {
  const level = testLevel(['C....p...G', '##########']);
  const [spec] = level.enemies;
  const e = createEnemy(spec);
  const lowestBottom = e.homeY + PROPELLER.bob + PROPELLER.h / 2;
  assert.ok(spec.y - lowestBottom >= 12, `gap ${spec.y - lowestBottom}px`);
});

test('a propeller carrot one tile above the ground blocks a walking chicken', () => {
  const level = testLevel(['C....p...G', '##########']);
  const e = createEnemy(level.enemies[0]);
  const chicken = bodyRect({ x: e.x, y: 11 * TILE, w: PLAYER.w, h: PLAYER.h });
  for (const phase of [-Math.PI / 2, 0, Math.PI / 2]) {
    assert.equal(overlaps(chicken, bodyRect({ ...e, y: e.homeY + PROPELLER.bob * Math.sin(phase) + e.h / 2 })), true);
  }
});

test('an enemy that falls out of the level is removed', () => {
  const level = testLevel(['C...c...G', '####.####']);
  const e = createEnemy(level.enemies[0]);
  runSteps(240, () => updateEnemy(e, STEP, level));
  assert.equal(e.alive, false);
});

test('a star starts with two lives, walking left at star speed', () => {
  const level = testLevel(['C........*.G', '############']);
  const e = createEnemy(level.enemies[0]);
  assert.equal(e.w, STAR.w);
  assert.equal(e.h, STAR.h);
  assert.equal(e.lives, 2);
  updateEnemy(e, STEP, level);
  assert.equal(e.vx, -STAR.speed);
});

test('a star turns back at a gap and in front of a moving cloud', () => {
  const level = testLevel(['C......*....G', '####.####~~~#']);
  const e = createEnemy(level.enemies[0]);
  const { minX, maxX, turns } = track(e, level, 30 * 120);
  assert.ok(minX >= 5 * TILE, `minX ${minX}`);
  assert.ok(maxX <= 9 * TILE, `maxX ${maxX}`);
  assert.ok(turns >= 2, `turned ${turns} times`);
  assert.equal(e.alive, true);
});

test('the first stomp hurts a star, which gets dizzy and faster; the second defeats it', () => {
  const e = createEnemy({ kind: 'star', x: 200, y: 450 });
  assert.equal(stompEnemy(e), 'hurt');
  assert.equal(e.alive, true);
  assert.equal(e.lives, 1);
  assert.equal(e.dizzy, STAR.dizzyTime);
  assert.equal(e.speed, STAR.hurtSpeed);
  assert.equal(stompEnemy(e), 'defeated');
  assert.equal(e.alive, false);
});

test('a hurt star stops being dizzy after dizzyTime and walks at its hurt speed', () => {
  const level = testLevel(['C...*.....G', '###########']);
  const e = createEnemy(level.enemies[0]);
  stompEnemy(e);
  runSteps(Math.ceil(STAR.dizzyTime / STEP) + 1, () => updateEnemy(e, STEP, level));
  assert.equal(e.dizzy, 0);
  assert.equal(Math.abs(e.vx), STAR.hurtSpeed);
});

test('a rat walks left at rat speed, patrols like a carrot and one stomp defeats it', () => {
  const level = testLevel(['C#....m...#G', '############']);
  const e = createEnemy(level.enemies[0]);
  assert.equal(e.w, RAT.w);
  assert.equal(e.h, RAT.h);
  updateEnemy(e, STEP, level);
  assert.equal(e.vx, -RAT.speed);
  const { minX, maxX, turns } = track(e, level, 60 * 120);
  assert.ok(minX >= 2 * TILE + e.w / 2 - 0.01 && maxX <= 10 * TILE - e.w / 2 + 0.01, `patrolled ${minX}..${maxX}`);
  assert.ok(turns >= 4);
  assert.equal(stompEnemy(e), 'defeated');
  assert.equal(e.alive, false);
});

for (const [kind, cfg] of [['star', STAR], ['skeleton', SKELETON]]) {
  test(`a ${kind} has two lives: the first stomp hurts it (dizzy, then faster), the second defeats it`, () => {
    const level = testLevel(['C...s.....G'.replace('s', kind === 'star' ? '*' : 's'), '###########']);
    const e = createEnemy(level.enemies[0]);
    assert.equal(e.kind, kind);
    assert.equal(e.w, cfg.w);
    assert.equal(e.h, cfg.h);
    assert.equal(e.lives, 2);
    assert.equal(stompEnemy(e), 'hurt');
    assert.equal(e.lives, 1);
    assert.equal(e.dizzy, cfg.dizzyTime);
    assert.equal(e.speed, cfg.hurtSpeed);
    runSteps(Math.ceil(cfg.dizzyTime / STEP) + 1, () => updateEnemy(e, STEP, level));
    assert.equal(e.dizzy, 0);
    assert.equal(Math.abs(e.vx), cfg.hurtSpeed);
    assert.equal(stompEnemy(e), 'defeated');
    assert.equal(e.alive, false);
  });
}

const BAT_MAP = ['..........v.........', '....................', 'C..................G', '####################'];

function batAt(phase) {
  const level = testLevel(BAT_MAP);
  const [spec] = level.enemies;
  const e = createEnemy(spec);
  e.phase = phase - (2 * Math.PI * STEP) / BAT.period;
  updateEnemy(e, STEP, level);
  return { e, spec };
}

test('a bat swoops: at the middle of its swing it is low and fastest, at both ends it is high and slow', () => {
  const { e: middle, spec } = batAt(0);
  const topFeet = spec.y - TILE / 2 + BAT.h / 2;
  assert.ok(Math.abs(middle.x - spec.x) < 1e-6);
  assert.ok(Math.abs(middle.y - (topFeet + BAT.dip)) < 1e-6, 'lowest in the middle');
  assert.ok(Math.abs(middle.vx - BAT.range * TILE * (2 * Math.PI / BAT.period)) < 1e-6, 'fastest in the middle');
  assert.equal(middle.dir, 1);

  const { e: right } = batAt(Math.PI / 2);
  assert.ok(Math.abs(right.x - (spec.x + BAT.range * TILE)) < 1e-6);
  assert.ok(Math.abs(right.y - topFeet) < 1e-6, 'highest at the end');
  assert.ok(Math.abs(right.vx) < 1e-6);

  const { e: back } = batAt(Math.PI);
  assert.ok(Math.abs(back.x - spec.x) < 1e-6);
  assert.equal(back.dir, -1, 'flies back the other way');
});

test('a bat starts its swing at its map column times the phase step and never falls', () => {
  const level = testLevel(BAT_MAP);
  const [spec] = level.enemies;
  const e = createEnemy(spec);
  assert.ok(Math.abs(e.phase - 10 * FLYER.phasePerCol) < 1e-9);
  const topFeet = spec.y - TILE / 2 + BAT.h / 2;
  runSteps(10 * 120, () => {
    updateEnemy(e, STEP, level);
    assert.ok(e.y >= topFeet - 1e-9 && e.y <= topFeet + BAT.dip + 1e-9, `feet ${e.y}`);
    assert.ok(Math.abs(e.x - spec.x) <= BAT.range * TILE + 1e-9, `x ${e.x}`);
  });
  assert.equal(e.alive, true);
});

test('a chicken can run under a bat at the end of its swing but not in the middle, and a bat in the middle is below a full jump', () => {
  const ground = 11 * TILE;
  const { e: middle } = batAt(0);
  const { e: end } = batAt(Math.PI / 2);
  const chicken = (x) => bodyRect({ x, y: ground, w: PLAYER.w, h: PLAYER.h });
  assert.equal(overlaps(chicken(end.x), bodyRect(end)), false, 'safe under the end of the swing');
  assert.equal(overlaps(chicken(middle.x), bodyRect(middle)), true, 'blocked in the middle');
  const apex = PLAYER.jumpVelocity ** 2 / (2 * GRAVITY);
  assert.ok(ground - apex < middle.y - middle.h - 40, 'a full jump clears the low bat');
  assert.equal(stompEnemy(middle), 'defeated');
});

function ghostSetup(ghostCol = 10) {
  const row = '.'.repeat(ghostCol) + 'g' + '.'.repeat(29 - ghostCol);
  const level = parseLevel({ id: 'ghosts', map: castleMap([row, '.'.repeat(30), '.'.repeat(30), 'C' + '.'.repeat(28) + 'G', '#'.repeat(30)]) });
  const e = createEnemy(level.enemies[0]);
  return { level, e };
}

const chickenAt = (x, facing, y = 11 * TILE) => ({ x, y, h: PLAYER.h, facing, dead: false });

test('a ghost freezes and hides while the chicken faces it', () => {
  const { level, e } = ghostSetup();
  const x = e.x;
  const y = e.y;
  runSteps(120, () => updateEnemy(e, STEP, level, chickenAt(x - 4 * TILE, 1)));
  assert.equal(e.shy, true);
  assert.equal(e.x, x);
  assert.equal(e.y, y);
});

test('a ghost creeps toward the chicken at ghost speed while the chicken looks away', () => {
  const { level, e } = ghostSetup();
  const player = chickenAt(e.x - 4 * TILE, -1);
  const before = Math.hypot(player.x - e.x, player.y - player.h / 2 - (e.y - e.h / 2));
  updateEnemy(e, STEP, level, player);
  const after = Math.hypot(player.x - e.x, player.y - player.h / 2 - (e.y - e.h / 2));
  assert.equal(e.shy, false);
  assert.ok(Math.abs(before - after - GHOST.speed * STEP) < 1e-6, `moved ${before - after}`);
  assert.equal(e.dir, -1, 'faces where it floats');
});

test('a ghost never leaves its leash or its room, and floats through walls', () => {
  const row = '..........g...#' + '.'.repeat(15);
  const level = parseLevel({ id: 'ghosts', map: castleMap([row, '.'.repeat(30), 'C' + '.'.repeat(28) + 'G', '#'.repeat(30)], [22]) });
  const e = createEnemy(level.enemies[0]);
  const [room] = level.rooms;
  for (const x of [0, 21 * TILE]) {
    runSteps(20 * 120, () => updateEnemy(e, STEP, level, chickenAt(x, x === 0 ? -1 : 1)));
    assert.ok(e.x >= e.homeX - GHOST.leash * TILE - 1e-9 && e.x <= e.homeX + GHOST.leash * TILE + 1e-9, `x ${e.x}`);
    assert.ok(e.x + e.w / 2 <= room.right + 1e-9, 'stays in its room');
  }
  assert.ok(e.x > 14 * TILE, 'passed through the block at column 14');
  runSteps(20 * 120, () => updateEnemy(e, STEP, level, chickenAt(e.x, -1, 12 * TILE)));
  assert.ok(e.y <= level.height - 2 * TILE + 1e-9, 'never sinks below the floor line');
});

test('a ghost floats home when the chicken leaves its room or is out of sight', () => {
  const { level, e } = ghostSetup();
  runSteps(3 * 120, () => updateEnemy(e, STEP, level, chickenAt(e.homeX - 3 * TILE, -1)));
  assert.ok(Math.abs(e.x - e.homeX) > 1, 'it crept away from home');
  runSteps(20 * 120, () => updateEnemy(e, STEP, level, chickenAt(e.homeX + (GHOST.sight + 6) * TILE, 1)));
  assert.equal(e.x, e.homeX);
  assert.equal(e.y, e.homeY);
  runSteps(3 * 120, () => updateEnemy(e, STEP, level, null));
  assert.equal(e.x, e.homeX, 'with no chicken it stays home');
});

test('a ghost ignores a dead chicken and floats home', () => {
  const { level, e } = ghostSetup();
  const player = chickenAt(e.homeX - 3 * TILE, -1);
  runSteps(3 * 120, () => updateEnemy(e, STEP, level, player));
  assert.ok(Math.abs(e.x - e.homeX) > 1, 'it crept toward the chicken');
  player.dead = true;
  runSteps(20 * 120, () => updateEnemy(e, STEP, level, player));
  assert.equal(e.x, e.homeX);
  assert.equal(e.y, e.homeY);
  assert.equal(e.shy, false);
});

test('a ghost leaves a trail of at most GHOST.trail seconds, which fades once it freezes', () => {
  const { level, e } = ghostSetup();
  runSteps(120, () => {
    updateEnemy(e, STEP, level, chickenAt(e.homeX - 5 * TILE, -1));
    for (const point of e.trail) assert.ok(e.clock - point.t <= GHOST.trail + 1e-9);
  });
  assert.ok(e.trail.length > 10, 'moving leaves a trail');
  runSteps(Math.ceil(GHOST.trail / STEP) + 1, () => updateEnemy(e, STEP, level, chickenAt(e.homeX - 5 * TILE, 1)));
  assert.equal(e.shy, true);
  assert.deepEqual(e.trail, []);
});

function spiderSetup(chickenCol) {
  const row = 'C' + '.'.repeat(18) + 'S' + '.'.repeat(4) + '#' + '.'.repeat(5) + 'G';
  const level = parseLevel({ id: 'lair', map: castleMap([row, '#'.repeat(row.length)], [24]) });
  const spec = level.enemies[0];
  const e = createEnemy(spec);
  const player = chickenAt((chickenCol + 0.5) * TILE, 1);
  return { level, e, player };
}

function shotsWithin(e, level, player, seconds) {
  const shots = [];
  runSteps(Math.round(seconds / STEP), (i) => {
    const shot = updateEnemy(e, STEP, level, player);
    if (shot) shots.push({ ...shot, at: (i + 1) * STEP });
  });
  return shots;
}

test('a spider faces the chicken and fires every fireEvery seconds, low first and then alternating', () => {
  const { level, e, player } = spiderSetup(10);
  const shots = shotsWithin(e, level, player, SPIDER.fireEvery * 4 + STEP);
  assert.equal(e.dir, -1);
  assert.equal(shots.length, 4);
  assert.ok(Math.abs(shots[0].at - SPIDER.fireEvery) < STEP * 1.5, `first shot at ${shots[0].at}`);
  assert.ok(Math.abs(shots[1].at - shots[0].at - SPIDER.fireEvery) < STEP * 1.5);
  assert.deepEqual(shots.map((s) => e.y - s.y), [FIREBALL.lowY, FIREBALL.highY, FIREBALL.lowY, FIREBALL.highY]);
  for (const s of shots) {
    assert.equal(s.vx, -FIREBALL.speed);
    assert.equal(s.x, e.x - (e.w / 2 + FIREBALL.size / 2));
  }
});

test('a spider winds up for the last windup seconds before each shot', () => {
  const { level, e, player } = spiderSetup(10);
  const steps = Math.round((SPIDER.fireEvery - SPIDER.windup) / STEP) - 2;
  runSteps(steps, () => updateEnemy(e, STEP, level, player));
  assert.equal(e.winding, false);
  runSteps(4, () => updateEnemy(e, STEP, level, player));
  assert.equal(e.winding, true);
});

test('a spider only fires at a chicken in its room between minRange and maxRange tiles away', () => {
  for (const [col, expected] of [[19 - SPIDER.minRange + 1, 0], [19 - SPIDER.maxRange - 2, 0], [27, 0], [19 - SPIDER.maxRange, 2]]) {
    const { level, e, player } = spiderSetup(col);
    assert.equal(shotsWithin(e, level, player, SPIDER.fireEvery * 2 + STEP).length, expected, `chicken at column ${col}`);
  }
  const { level, e, player } = spiderSetup(10);
  player.dead = true;
  assert.equal(shotsWithin(e, level, player, SPIDER.fireEvery * 2).length, 0, 'never at a dead chicken');
});

test('stepping out of range cancels the wind-up, so the next shot waits for a full wind-up', () => {
  const { level, e, player } = spiderSetup(10);
  runSteps(Math.round((SPIDER.fireEvery - 0.1) / STEP), () => updateEnemy(e, STEP, level, player));
  assert.equal(e.winding, true);
  updateEnemy(e, STEP, level, { ...player, x: e.x - (SPIDER.maxRange + 1) * TILE });
  assert.equal(e.winding, false);
  assert.ok(e.cooldown > SPIDER.windup);
  const shots = shotsWithin(e, level, player, SPIDER.windup);
  assert.equal(shots.length, 0, 'no shot before a full wind-up');
});

test('a spider stands still and one stomp defeats it', () => {
  const { level, e, player } = spiderSetup(10);
  const x = e.x;
  const y = e.y;
  shotsWithin(e, level, player, 3);
  assert.equal(e.x, x);
  assert.equal(e.y, y);
  assert.equal(stompEnemy(e), 'defeated');
  assert.equal(e.alive, false);
});
