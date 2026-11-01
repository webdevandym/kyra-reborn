import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TILE } from '../src/config.js';
import { parseLevel } from '../src/core/level.js';
import { mapFromBottom, castleMap } from './helpers.js';

const WALLS = [12, 25];
const FEET = ['C...n......O', '.', '.K..M...n.O.', '.', '..w.....U..G'].join('');
const GROUND = '#'.repeat(FEET.length);

const put = (row, col, ch) => row.slice(0, col) + ch + row.slice(col + 1);

function forest({ upper = '.'.repeat(FEET.length), feet = FEET, ground = GROUND, walls = WALLS, extra = {} } = {}) {
  const map = mapFromBottom([upper, feet, ground]).map((line) => [...line].map((ch, col) => (walls.includes(col) ? '#' : ch)).join(''));
  return parseLevel({ id: 'wood', theme: 'forest', map, ...extra });
}

function rejects(options, pattern) {
  assert.throws(() => forest(options), (err) => {
    assert.match(err.message, /^wood: /);
    assert.match(err.message, pattern);
    return true;
  });
}

const feetOf = (col) => ({ x: (col + 0.5) * TILE, y: 11 * TILE });

test('a valid forest map parses with three rooms, two portals, a savepoint, a monkey and three snakes', () => {
  const level = forest();
  assert.equal(level.theme, 'forest');
  assert.deepEqual(level.rooms, [
    { left: 0, right: 12 * TILE, kind: null },
    { left: 13 * TILE, right: 25 * TILE, kind: null },
    { left: 26 * TILE, right: 38 * TILE, kind: null },
  ]);
  assert.deepEqual(level.portals, [feetOf(11), feetOf(23)]);
  assert.deepEqual(level.checkpoint, feetOf(14));
  assert.deepEqual(level.spawn, feetOf(0));
  assert.deepEqual(level.goal, feetOf(37));
  assert.deepEqual(level.house, feetOf(34));
  assert.deepEqual(level.enemies.filter((e) => e.kind === 'monkey'), [{ kind: 'monkey', ...feetOf(17) }]);
  assert.deepEqual(level.enemies.filter((e) => e.kind === 'snake').map((e) => e.x), [4.5 * TILE, 21.5 * TILE, 28.5 * TILE]);
});

test('a forest level needs exactly three rooms', () => {
  rejects({ walls: [12] }, /exactly three rooms/);
  rejects({ walls: [12, 25, 31] }, /exactly three rooms/);
});

test('a forest level needs exactly three snakes', () => {
  rejects({ feet: put(FEET, 4, '.') }, /exactly three snakes/);
  rejects({ feet: put(FEET, 6, 'n') }, /exactly three snakes/);
});

test('a forest level needs exactly one snake in each room', () => {
  rejects({ feet: put(put(FEET, 4, '.'), 15, 'n') }, /one snake in each room/);
  rejects({ feet: put(put(FEET, 28, '.'), 6, 'w') }, /one snake in each room/);
});

test('a forest level needs exactly one monkey', () => {
  rejects({ feet: put(FEET, 17, '.') }, /exactly one monkey 'M'/);
  rejects({ feet: put(FEET, 19, 'M') }, /exactly one monkey 'M'/);
});

test('the forest monkey must be in the second room', () => {
  rejects({ feet: put(put(FEET, 17, '.'), 8, 'M') }, /monkey 'M' must be in the second room/);
  rejects({ feet: put(put(FEET, 17, '.'), 30, 'M') }, /monkey 'M' must be in the second room/);
});

test('a forest level needs a checkpoint and a second checkpoint is refused', () => {
  rejects({ feet: put(FEET, 14, '.') }, /needs a checkpoint 'K'/);
  rejects({ feet: put(FEET, 16, 'K') }, /more than one checkpoint 'K'/);
});

test('the forest checkpoint must be in the second room', () => {
  rejects({ feet: put(put(FEET, 14, '.'), 2, 'K') }, /checkpoint 'K' must be in the second room/);
  rejects({ feet: put(put(FEET, 14, '.'), 30, 'K') }, /checkpoint 'K' must be in the second room/);
});

test('the forest checkpoint stands 1.5 tiles inside the second room, where portal 1 drops the chicken', () => {
  rejects({ feet: put(put(FEET, 14, '.'), 13 + 2, 'K') }, /1\.5 tiles inside the second room/);
  rejects({ feet: put(put(FEET, 14, '.'), 13, 'K') }, /1\.5 tiles inside the second room/);
  assert.equal(forest().checkpoint.x, forest().rooms[1].left + 1.5 * TILE);
});

test('the forest checkpoint must stand on solid ground', () => {
  rejects({ ground: put(GROUND, 14, '.') }, /checkpoint 'K' must stand on solid ground/);
  rejects({ ground: put(GROUND, 14, '=') }, /checkpoint 'K' must stand on solid ground/);
});

test('a forest level needs exactly two portals', () => {
  rejects({ feet: put(FEET, 11, '.') }, /exactly two portals 'O'/);
  rejects({ feet: put(FEET, 20, 'O') }, /exactly two portals 'O'/);
});

test('forest portals must be one in the first room and one in the second room', () => {
  rejects({ feet: put(put(FEET, 23, '.'), 8, 'O') }, /one portal 'O' in the first room and one in the second room/);
  rejects({ feet: put(put(FEET, 23, '.'), 30, 'O') }, /one portal 'O' in the first room and one in the second room/);
  rejects({ feet: put(put(FEET, 11, '.'), 18, 'O') }, /one portal 'O' in the first room and one in the second room/);
});

test('forest portals are listed left to right even when the second one is on a higher row', () => {
  const level = forest({ upper: put('.'.repeat(FEET.length), 23, 'O'), feet: put(FEET, 23, '.') });
  assert.deepEqual(level.portals, [feetOf(11), { x: 23.5 * TILE, y: 10 * TILE }]);
});

test('a forest level has at most one house U', () => {
  rejects({ feet: put(FEET, 31, 'U') }, /more than one house 'U'/);
  const none = forest({ feet: put(FEET, 34, '.') });
  assert.equal(none.house, null);
});

test('a forest level still needs a chicken start and a green crystal', () => {
  rejects({ feet: put(FEET, 0, '.') }, /missing chicken start 'C'/);
  rejects({ feet: put(FEET, 37, '.') }, /missing green crystal 'G'/);
});

test('a reads as a rabbit, e as a deer and n as a snake, all standing on the bottom edge of their tile', () => {
  const level = forest({ feet: put(put(FEET, 2, 'a'), 6, 'e') });
  assert.deepEqual(level.enemies.filter((e) => e.kind === 'rabbit'), [{ kind: 'rabbit', ...feetOf(2) }]);
  assert.deepEqual(level.enemies.filter((e) => e.kind === 'deer'), [{ kind: 'deer', ...feetOf(6) }]);
  assert.deepEqual(level.enemies.find((e) => e.x === 4.5 * TILE), { kind: 'snake', ...feetOf(4) });
});

test('w marks a flying snake', () => {
  const level = forest();
  const snakes = level.enemies.filter((e) => e.kind === 'snake');
  assert.deepEqual(snakes.map((e) => e.fly), [undefined, undefined, true]);
  assert.deepEqual(snakes[2], { kind: 'snake', ...feetOf(28), fly: true });
  const flyingFirst = forest({ feet: put(put(FEET, 4, 'w'), 28, 'n') });
  assert.deepEqual(flyingFirst.enemies.filter((e) => e.kind === 'snake').map((e) => e.fly), [true, undefined, undefined]);
});

test('a e n w M U are unknown characters outside the forest', () => {
  for (const ch of 'aenwMU') {
    for (const theme of ['meadow', 'sky', 'castle', 'sea']) {
      const map = mapFromBottom([`C.${ch}.G`, '######']);
      assert.throws(() => parseLevel({ id: 'plain', theme, map }), new RegExp(`plain: unknown character '${ch}' at 2,10`));
    }
  }
});

test('a castle level still allows exactly one portal', () => {
  const castle = (feet) => parseLevel({ id: 'keep', theme: 'castle', map: castleMap([feet, '#'.repeat(feet.length)], [11]) });
  assert.deepEqual(castle('C.m.S..O...#K..r..G').portal, feetOf(7));
  assert.throws(() => castle('C.m.S..O.O.#K..r..G'), /keep: more than one portal 'O'/);
});

test('forest portals are listed in portals and the castle portal is not', () => {
  const level = forest();
  assert.equal(level.portal, null);
  assert.deepEqual(level.portals, [feetOf(11), feetOf(23)]);

  const castle = parseLevel({ id: 'keep', theme: 'castle', map: castleMap(['C.m.S..O...#K..r..G', '#'.repeat(19)], [11]) });
  assert.deepEqual(castle.portal, feetOf(7));
  assert.deepEqual(castle.portals, []);
});

test('portals is empty and house is null for every non-forest theme', () => {
  for (const theme of ['meadow', 'sky', 'sea']) {
    const level = parseLevel({ id: 'plain', theme, map: mapFromBottom(['C.H.G', '#####']) });
    assert.deepEqual(level.portals, []);
    assert.equal(level.house, null);
  }
});
