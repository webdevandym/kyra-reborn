import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TILE, ROWS } from '../src/config.js';
import { parseLevel, tileAt, solidTop, roomAt, roomIndex } from '../src/core/level.js';
import { mapFromBottom, testLevel, castleMap } from './helpers.js';

const CASTLE_ROWS = ['C.m.g.s.S.O#K..r..G', '###################'];
const castle = (rows = CASTLE_ROWS, extra = {}) => parseLevel({ id: 'keep', theme: 'castle', map: castleMap(rows, [11]), ...extra });

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

test('parseLevel rejects a ~ run shorter than 2 or longer than 4 tiles', () => {
  const base = { id: 'bad' };
  assert.throws(
    () => parseLevel({ ...base, map: mapFromBottom(['C.......G', '.~.......', '#########']) }),
    /bad: moving cloud at 1,10 must be 2–4 tiles/,
  );
  assert.throws(
    () => parseLevel({ ...base, map: mapFromBottom(['C.......G', '.~~~~~...', '#########']) }),
    /bad: moving cloud at 1,10 must be 2–4 tiles/,
  );
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
  assert.equal(castle().theme, 'castle');
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


test('parseLevel reads the castle cast: m rat, g ghost, s skeleton, S spider, O portal and K checkpoint', () => {
  const level = castle();
  assert.equal(level.theme, 'castle');
  assert.deepEqual(level.enemies, [
    { kind: 'rat', x: 2.5 * TILE, y: 11 * TILE },
    { kind: 'ghost', x: 4.5 * TILE, y: 11 * TILE },
    { kind: 'skeleton', x: 6.5 * TILE, y: 11 * TILE },
    { kind: 'spider', x: 8.5 * TILE, y: 11 * TILE },
  ]);
  assert.deepEqual(level.portal, { x: 10.5 * TILE, y: 11 * TILE });
  assert.deepEqual(level.checkpoint, { x: 12.5 * TILE, y: 11 * TILE });
  for (const col of [2, 4, 6, 8, 10, 12]) assert.equal(tileAt(level, col, 10), 'empty');
});

test('a level without O or K has no portal and no checkpoint', () => {
  const level = testLevel(['C...G', '#####']);
  assert.equal(level.portal, null);
  assert.equal(level.checkpoint, null);
});

test('full-height wall columns split a map into rooms, and a map without them is one room', () => {
  assert.deepEqual(castle().rooms, [{ left: 0, right: 11 * TILE, kind: null }, { left: 12 * TILE, right: 19 * TILE, kind: null }]);
  const open = testLevel(['C...G', '#####']);
  assert.deepEqual(open.rooms, [{ left: 0, right: open.width, kind: null }]);
  const thick = parseLevel({ id: 'thick', map: castleMap(['C....##....G', '############'], [5, 6]) });
  assert.deepEqual(thick.rooms, [{ left: 0, right: 5 * TILE, kind: null }, { left: 7 * TILE, right: 12 * TILE, kind: null }]);
});

test('roomAt finds the room holding x, and the nearest room for an x inside a wall', () => {
  const level = castle();
  const [first, second] = level.rooms;
  assert.equal(roomAt(level, 3 * TILE), first);
  assert.equal(roomAt(level, 15 * TILE), second);
  assert.equal(roomAt(level, 11.2 * TILE), first);
  assert.equal(roomAt(level, 11.8 * TILE), second);
});

test('a castle sign stands on the floor, not on the ceiling', () => {
  const level = castle(CASTLE_ROWS, { signs: [{ col: 1, key: 'hi' }] });
  assert.equal(level.signs[0].y, 11 * TILE);
  assert.equal(solidTop(level, 1), 11 * TILE);
  assert.equal(solidTop(level, 11), level.height, 'a full-height wall has no open space above it');
});

test('a castle level needs exactly one spider, one portal and one checkpoint', () => {
  assert.throws(() => castle(['C.m.......O#K..r..G', '###################']), /exactly one spider 'S'/);
  assert.throws(() => castle(['C.m.S...S.O#K..r..G', '###################']), /exactly one spider 'S'/);
  assert.throws(() => castle(['C.m.....S..#K..r..G', '###################']), /needs a portal 'O'/);
  assert.throws(() => castle(['C.m.....S.O#...r..G', '###################']), /needs a checkpoint 'K'/);
  assert.throws(() => testLevel(['C.O.O.G', '#######']), /more than one portal 'O'/);
  assert.throws(() => testLevel(['C.K.K.G', '#######']), /more than one checkpoint 'K'/);
});

const FOUR_ROOMS = ['C.....D#.m..S.O#K....D#.....G', '#############################'];
const fourRooms = (extra = {}) => parseLevel({ id: 'four', theme: 'castle', map: castleMap(FOUR_ROOMS, [7, 15, 22]), ...extra });

test('parseLevel reads D as a door standing on the floor, in map order', () => {
  const level = fourRooms();
  assert.deepEqual(level.doors, [{ x: 6.5 * TILE, y: 11 * TILE }, { x: 21.5 * TILE, y: 11 * TILE }]);
  assert.equal(tileAt(level, 6, 10), 'empty');
  assert.deepEqual(testLevel(['C...G', '#####']).doors, []);
});

test('rooms may name a kind each; the last must be the throne room', () => {
  const level = fourRooms({ rooms: ['hall', 'dungeon', 'library', 'throne'] });
  assert.deepEqual(level.rooms.map((r) => r.kind), ['hall', 'dungeon', 'library', 'throne']);
  assert.throws(() => fourRooms({ rooms: ['hall', 'throne'] }), /one kind for each of the 4 rooms/);
  assert.throws(() => fourRooms({ rooms: ['hall', 'cellar', 'library', 'throne'] }), /unknown room kind 'cellar'/);
  assert.throws(() => fourRooms({ rooms: ['hall', 'kitchen', 'library', 'hall'] }), /last room must be the 'throne' room/);
});

test('roomIndex gives the position of the room holding x', () => {
  const level = fourRooms();
  assert.equal(roomIndex(level, 3 * TILE), 0);
  assert.equal(roomIndex(level, 12 * TILE), 1);
  assert.equal(roomIndex(level, 18 * TILE), 2);
  assert.equal(roomIndex(level, 26 * TILE), 3);
});
