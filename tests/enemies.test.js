import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TILE, STEP, GRAVITY, CARROT, ZOMBIE, PROPELLER, BEE, FLYER, PLAYER, STAR, BAT } from '../src/config.js';
import { createEnemy, updateEnemy, stompEnemy, ENEMY_KINDS } from '../src/core/enemies.js';
import { bodyRect, overlaps } from '../src/core/rect.js';
import { testLevel, runSteps } from './helpers.js';

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
  assert.deepEqual(Object.keys(ENEMY_KINDS).sort(), ['bat', 'bee', 'carrot', 'propeller', 'star', 'zombie']);
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

test('a bat hovers like a bee: no gravity, inside its bob, patrolling its range, one stomp defeats it', () => {
  const level = testLevel(['....................', '..........v.........', '....................', 'C..................G', '####################']);
  const e = createEnemy(level.enemies[0]);
  assert.equal(e.w, BAT.w);
  assert.equal(e.h, BAT.h);
  let minX = e.x;
  let maxX = e.x;
  let minY = e.y;
  let maxY = e.y;
  runSteps(10 * 120, () => {
    updateEnemy(e, STEP, level);
    minX = Math.min(minX, e.x);
    maxX = Math.max(maxX, e.x);
    minY = Math.min(minY, e.y);
    maxY = Math.max(maxY, e.y);
  });
  assert.ok(minX >= e.homeX - BAT.range * TILE - 1e-9, `minX ${minX}`);
  assert.ok(maxX <= e.homeX + BAT.range * TILE + 1e-9, `maxX ${maxX}`);
  assert.ok(maxX - minX > BAT.range * TILE, 'it patrols');
  assert.ok(minY >= e.homeY - BAT.bob + BAT.h / 2 - 1e-9, `minY ${minY}`);
  assert.ok(maxY <= e.homeY + BAT.bob + BAT.h / 2 + 1e-9, `maxY ${maxY}`);
  assert.equal(stompEnemy(e), 'defeated');
});
