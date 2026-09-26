import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TILE, ROWS } from '../src/config.js';
import { parseLevel, tileAt, solidTop } from '../src/core/level.js';
import { mapFromBottom, testLevel } from './helpers.js';

test('parseLevel reads size, tiles, spawn, goal, enemies and crystals', () => {
  const level = testLevel([
    '.C.r.c.Z.G',
    '###==#####',
    '##########',
  ]);
  assert.equal(level.cols, 10);
  assert.equal(level.rows, ROWS);
  assert.equal(level.width, 10 * TILE);
  assert.equal(level.height, ROWS * TILE);
  assert.deepEqual(level.spawn, { x: 1.5 * TILE, y: 10 * TILE });
  assert.deepEqual(level.goal, { x: 9.5 * TILE, y: 10 * TILE });
  assert.deepEqual(level.enemies, [
    { kind: 'carrot', x: 5.5 * TILE, y: 10 * TILE },
    { kind: 'zombie', x: 7.5 * TILE, y: 10 * TILE },
  ]);
  assert.deepEqual(level.crystals, [{ id: '3,9', x: 3.5 * TILE, y: 9.5 * TILE }]);
  assert.equal(tileAt(level, 0, 10), 'solid');
  assert.equal(tileAt(level, 3, 10), 'oneway');
  assert.equal(tileAt(level, 3, 9), 'empty');
});

test('parseLevel reads p as a propeller carrot and b as a bee, with feet on the bottom edge of their tile', () => {
  const level = testLevel(['..b......', '.....p...', 'C.......G', '#########']);
  assert.deepEqual(level.enemies, [
    { kind: 'bee', x: 2.5 * TILE, y: 9 * TILE },
    { kind: 'propeller', x: 5.5 * TILE, y: 10 * TILE },
  ]);
});

test('parseLevel passes difficulty through and defaults it to 1', () => {
  assert.equal(testLevel(['C.G', '###']).difficulty, 1);
  assert.equal(testLevel(['C.G', '###'], { difficulty: 3 }).difficulty, 3);
});

test('tileAt treats the left/right edges as solid, and the sky and everything below the map as empty', () => {
  const level = testLevel(['C........G', '##########']);
  assert.equal(tileAt(level, -1, 5), 'solid');
  assert.equal(tileAt(level, 10, 5), 'solid');
  assert.equal(tileAt(level, 3, -1), 'empty');
  assert.equal(tileAt(level, 3, ROWS), 'empty');
  assert.equal(tileAt(level, 3, ROWS + 5), 'empty');
});

test('parseLevel reads * as a star, v as a bat, R as a rain cloud and each ~ run as one moving cloud', () => {
  const level = testLevel([
    '..R.......',
    '..........',
    '....~~~...',
    '.v........',
    'C..*.....G',
    '####..~~##',
  ]);
  assert.deepEqual(level.enemies, [
    { kind: 'bat', x: 1.5 * TILE, y: 10 * TILE },
    { kind: 'star', x: 3.5 * TILE, y: 11 * TILE },
  ]);
  assert.deepEqual(level.rainClouds, [{ id: '2,6', col: 2, row: 6, x: 2.5 * TILE, y: 6.5 * TILE }]);
  assert.deepEqual(level.movers, [
    { id: '4,8', col: 4, row: 8, width: 3 * TILE, x: 4 * TILE, y: 8 * TILE },
    { id: '6,11', col: 6, row: 11, width: 2 * TILE, x: 6 * TILE, y: 11 * TILE },
  ]);
  assert.equal(tileAt(level, 2, 6), 'empty');
  assert.equal(tileAt(level, 5, 8), 'empty');
  assert.equal(tileAt(level, 6, 11), 'empty');
});

test('two ~ runs in one row are two moving clouds', () => {
  const level = testLevel(['C.......G', '.~~.~~~..', '#########']);
  assert.deepEqual(level.movers.map((m) => [m.id, m.width / TILE]), [['1,10', 2], ['4,10', 3]]);
});

test('a level without R or ~ has no rain clouds and no moving clouds', () => {
  const level = testLevel(['C.G', '###']);
  assert.deepEqual(level.rainClouds, []);
  assert.deepEqual(level.movers, []);
});

test('solidTop returns the y of the highest solid tile in a column, ignoring platforms', () => {
  const level = testLevel(['.==.', '.##.', 'C#.G', '####']);
  assert.equal(solidTop(level, 1), 9 * TILE);
  assert.equal(solidTop(level, 2), 9 * TILE);
  assert.equal(solidTop(level, 0), 11 * TILE);
});

test('parseLevel gives the level a name key and each sign a text key, a world x at the column centre and a y on the ground', () => {
  const level = testLevel(['C...G', '#####'], { signs: [{ col: 2, key: 'hello' }] });
  assert.equal(level.nameKey, 'levels.test.name');
  assert.deepEqual(level.signs, [{ col: 2, key: 'hello', textKey: 'levels.test.signs.hello', x: 2.5 * TILE, y: 11 * TILE }]);
});

test('parseLevel passes theme through, defaults it to meadow and rejects unknown themes', () => {
  assert.equal(testLevel(['C.G', '###']).theme, 'meadow');
  assert.equal(testLevel(['C.G', '###'], { theme: 'sky' }).theme, 'sky');
  assert.throws(() => testLevel(['C.G', '###'], { theme: 'space' }), /unknown theme 'space'/);
});

test('parseLevel rejects malformed maps with a message naming the problem', () => {
  const base = { id: 'bad' };
  assert.throws(() => parseLevel({ ...base, map: ['C.G'] }), /exactly 12 rows/);
  assert.throws(() => parseLevel({ ...base, map: mapFromBottom(['C.G', '##']) }), /row 11 has 2 columns/);
  assert.throws(() => parseLevel({ ...base, map: mapFromBottom(['C.x.G', '#####']) }), /unknown character 'x'/);
  assert.throws(() => parseLevel({ ...base, map: mapFromBottom(['...G', '####']) }), /missing chicken start/);
  assert.throws(() => parseLevel({ ...base, map: mapFromBottom(['C...', '####']) }), /missing green crystal/);
  assert.throws(() => parseLevel({ ...base, map: mapFromBottom(['CC.G', '####']) }), /more than one chicken/);
  assert.throws(() => parseLevel({ ...base, map: mapFromBottom(['C.GG', '####']) }), /more than one green crystal/);
});
