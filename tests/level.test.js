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

test('tileAt treats the left/right edges and the floor as solid and the sky as empty', () => {
  const level = testLevel(['C........G', '##########']);
  assert.equal(tileAt(level, -1, 5), 'solid');
  assert.equal(tileAt(level, 10, 5), 'solid');
  assert.equal(tileAt(level, 3, -1), 'empty');
  assert.equal(tileAt(level, 3, ROWS), 'solid');
});

test('solidTop returns the y of the highest solid tile in a column, ignoring platforms', () => {
  const level = testLevel(['.==.', '.##.', 'C#.G', '####']);
  assert.equal(solidTop(level, 1), 9 * TILE);
  assert.equal(solidTop(level, 2), 9 * TILE);
  assert.equal(solidTop(level, 0), 11 * TILE);
});

test('signs get a world x at the column centre and a y on the ground', () => {
  const level = testLevel(['C...G', '#####'], { signs: [{ col: 2, text: { uk: 'Привіт', en: 'Hi' } }] });
  assert.deepEqual(level.signs, [{ col: 2, text: { uk: 'Привіт', en: 'Hi' }, x: 2.5 * TILE, y: 11 * TILE }]);
});

test('parseLevel rejects malformed maps with a message naming the problem', () => {
  const base = { id: 'bad', name: { uk: 'x', en: 'x' } };
  assert.throws(() => parseLevel({ ...base, map: ['C.G'] }), /exactly 12 rows/);
  assert.throws(() => parseLevel({ ...base, map: mapFromBottom(['C.G', '##']) }), /row 11 has 2 columns/);
  assert.throws(() => parseLevel({ ...base, map: mapFromBottom(['C.x.G', '#####']) }), /unknown character 'x'/);
  assert.throws(() => parseLevel({ ...base, map: mapFromBottom(['...G', '####']) }), /missing chicken start/);
  assert.throws(() => parseLevel({ ...base, map: mapFromBottom(['C...', '####']) }), /missing green crystal/);
  assert.throws(() => parseLevel({ ...base, map: mapFromBottom(['CC.G', '####']) }), /more than one chicken/);
});
