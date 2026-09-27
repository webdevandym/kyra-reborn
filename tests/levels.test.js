import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ROWS, MOVER, TILE, BAT, GHOST, SPIDER } from '../src/config.js';
import { parseLevel, roomAt, ROOM_KINDS } from '../src/core/level.js';
import levels from '../src/levels/index.js';
import { LANGS } from '../src/i18n/index.js';

const DICTS = Object.fromEntries(LANGS.map((lang) => [lang, JSON.parse(readFileSync(new URL(`../src/i18n/${lang}.json`, import.meta.url), 'utf8'))]));

const standable = (ch) => ch === '#' || ch === '=';
const surfaceLike = (ch) => standable(ch) || ch === '~';

const NONE = { rat: 0, ghost: 0, skeleton: 0, spider: 0 };
const EXPECTED_COUNTS = {
  level1: { crystals: 15, carrot: 5, zombie: 0, propeller: 0, bee: 0, star: 0, bat: 0, rain: 0, movers: 0, ...NONE },
  level2: { crystals: 20, carrot: 6, zombie: 3, propeller: 0, bee: 0, star: 0, bat: 0, rain: 0, movers: 0, ...NONE },
  level3: { crystals: 22, carrot: 7, zombie: 5, propeller: 0, bee: 0, star: 0, bat: 0, rain: 0, movers: 0, ...NONE },
  level4: { crystals: 22, carrot: 4, zombie: 2, propeller: 4, bee: 4, star: 0, bat: 0, rain: 0, movers: 0, ...NONE },
  level5: { crystals: 25, carrot: 7, zombie: 4, propeller: 4, bee: 5, star: 0, bat: 0, rain: 0, movers: 0, ...NONE },
  level6: { crystals: 20, carrot: 0, zombie: 0, propeller: 0, bee: 0, star: 6, bat: 0, rain: 2, movers: 0, ...NONE },
  level7: { crystals: 22, carrot: 0, zombie: 0, propeller: 0, bee: 0, star: 5, bat: 4, rain: 4, movers: 3, ...NONE },
  level8: { crystals: 25, carrot: 0, zombie: 0, propeller: 0, bee: 0, star: 7, bat: 5, rain: 6, movers: 4, ...NONE },
  level9: { crystals: 24, carrot: 0, zombie: 0, propeller: 0, bee: 0, star: 0, bat: 0, rain: 0, movers: 0, rat: 9, ghost: 0, skeleton: 4, spider: 1 },
  level10: { crystals: 26, carrot: 0, zombie: 0, propeller: 0, bee: 0, star: 0, bat: 0, rain: 0, movers: 0, rat: 9, ghost: 3, skeleton: 5, spider: 1 },
  level11: { crystals: 28, carrot: 0, zombie: 0, propeller: 0, bee: 0, star: 0, bat: 0, rain: 0, movers: 0, rat: 10, ghost: 4, skeleton: 6, spider: 1 },
};
const ENEMY_KINDS = ['carrot', 'zombie', 'propeller', 'bee', 'star', 'bat', 'rat', 'ghost', 'skeleton', 'spider'];
const ENEMY_CHARS = 'cZpb*vmgsS';
const BANNED = { meadow: '*vR~mgsSOKD', sky: 'cZpbmgsSOKD', castle: 'cZpb*vR~' };

function cellsOf(map, chars) {
  const cells = [];
  map.forEach((line, row) => [...line].forEach((ch, col) => {
    if (chars.includes(ch)) cells.push({ ch, col, row });
  }));
  return cells;
}

function surfaceRow(map, col) {
  for (let row = 0; row < ROWS; row++) if (map[row][col] === '#') return row;
  return ROWS;
}

function runsOf(map, ch) {
  const runs = [];
  map.forEach((line, row) => {
    for (let col = 0; col < line.length; col++) {
      if (line[col] !== ch) continue;
      const start = col;
      while (col < line.length && line[col] === ch) col++;
      runs.push({ row, start, end: col - 1 });
    }
  });
  return runs;
}

const moverPaths = (map) => runsOf(map, '~').map((run) => ({ ...run, pathStart: run.start - MOVER.range, pathEnd: run.end + MOVER.range }));

function gapsOf(map) {
  const cols = map[0].length;
  const gaps = [];
  for (let col = 0; col < cols; col++) {
    if (surfaceRow(map, col) < ROWS) continue;
    const start = col;
    while (col < cols && surfaceRow(map, col) === ROWS) col++;
    gaps.push({ start, end: col - 1 });
  }
  return gaps;
}

function floorRow(map, col) {
  for (let row = 1; row < ROWS; row++) if (map[row][col] === '#') return row;
  return ROWS;
}

function wallCols(map) {
  const cols = [];
  for (let col = 0; col < map[0].length; col++) if (map.every((line) => line[col] === '#')) cols.push(col);
  return cols;
}

function firstStandableBelow(map, col, row) {
  for (let r = row + 1; r < ROWS; r++) if (standable(map[r][col])) return r;
  return ROWS;
}

test('the level list is level1 to level11, meadow then sky then castle, with difficulty 1-3 that never goes down within a theme', () => {
  assert.deepEqual(levels.map((def) => def.id), ['level1', 'level2', 'level3', 'level4', 'level5', 'level6', 'level7', 'level8', 'level9', 'level10', 'level11']);
  assert.deepEqual(levels.map((def) => def.theme ?? 'meadow'), ['meadow', 'meadow', 'meadow', 'meadow', 'meadow', 'sky', 'sky', 'sky', 'castle', 'castle', 'castle']);
  const last = {};
  for (const def of levels) {
    const theme = def.theme ?? 'meadow';
    assert.ok(Number.isInteger(def.difficulty) && def.difficulty >= 1 && def.difficulty <= 3, `${def.id} difficulty ${def.difficulty}`);
    assert.ok(def.difficulty >= (last[theme] ?? 1), `${def.id} is easier than the ${theme} level before it`);
    last[theme] = def.difficulty;
  }
  assert.deepEqual(levels.map((def) => def.difficulty), [1, 1, 2, 2, 3, 2, 2, 3, 2, 3, 3]);
});

for (const def of levels) {
  const theme = def.theme ?? 'meadow';
  const cols = def.map[0].length;

  test(`${def.id}: parses, holds no text itself, and its name and every sign have text in every language`, () => {
    parseLevel(def);
    assert.equal(def.name, undefined, 'level names live in src/i18n');
    for (const sign of def.signs) assert.equal(sign.text, undefined, `sign at col ${sign.col} still holds text`);
    for (const lang of LANGS) {
      const text = DICTS[lang].levels[def.id];
      assert.ok(text?.name, `name in ${lang}`);
      for (const sign of def.signs) assert.ok(text.signs?.[sign.key], `sign '${sign.key}' at col ${sign.col} in ${lang}`);
    }
  });

  test(`${def.id}: uses only the cast of its theme`, () => {
    for (const { ch, col, row } of cellsOf(def.map, BANNED[theme])) assert.fail(`'${ch}' at ${col},${row} does not belong on a ${theme} level`);
  });

  if (theme !== 'castle') {
    test(`${def.id}: is a single room`, () => {
      assert.equal(parseLevel(def).rooms.length, 1);
    });
  }

  if (theme === 'meadow') {
    test(`${def.id}: has no pits — every column has solid ground on the bottom row`, () => {
      const bottom = def.map[ROWS - 1];
      for (let col = 0; col < bottom.length; col++) assert.equal(bottom[col], '#', `pit at column ${col}`);
    });

    test(`${def.id}: neighbouring ground heights differ by at most 3 tiles`, () => {
      for (let col = 1; col < cols; col++) {
        const diff = Math.abs(surfaceRow(def.map, col) - surfaceRow(def.map, col - 1));
        assert.ok(diff <= 3, `step of ${diff} tiles between columns ${col - 1} and ${col}`);
      }
    });
  } else if (theme === 'sky') {
    test(`${def.id}: neighbouring cloud heights differ by at most 3 tiles`, () => {
      for (let col = 1; col < cols; col++) {
        const a = surfaceRow(def.map, col - 1);
        const b = surfaceRow(def.map, col);
        if (a === ROWS || b === ROWS) continue;
        assert.ok(Math.abs(a - b) <= 3, `step of ${Math.abs(a - b)} tiles between columns ${col - 1} and ${col}`);
      }
    });

    test(`${def.id}: gaps not bridged by a moving cloud are at most 3 columns, and the cloud after a gap is at most 1 tile higher`, () => {
      const paths = moverPaths(def.map);
      for (const gap of gapsOf(def.map)) {
        assert.ok(gap.start > 0 && gap.end < cols - 1, `gap at the level edge (${gap.start}-${gap.end})`);
        const bridged = paths.some((p) => p.pathStart <= gap.end && p.pathEnd >= gap.start);
        if (!bridged) assert.ok(gap.end - gap.start + 1 <= 3, `gap ${gap.start}-${gap.end} is ${gap.end - gap.start + 1} columns wide`);
        const rise = surfaceRow(def.map, gap.start - 1) - surfaceRow(def.map, gap.end + 1);
        assert.ok(rise <= 1, `the cloud after the gap at ${gap.start}-${gap.end} is ${rise} tiles higher`);
      }
    });

    test(`${def.id}: every moving cloud is 2-4 tiles long, has an open path and a short hop at both ends`, () => {
      for (const run of moverPaths(def.map)) {
        const where = `moving cloud at ${run.start},${run.row}`;
        const length = run.end - run.start + 1;
        assert.ok(length >= 2 && length <= 4, `${where} is ${length} tiles long`);
        assert.ok(run.pathStart - 2 >= 0 && run.pathEnd + 2 < cols, `${where} swings off the level`);
        for (let col = run.pathStart; col <= run.pathEnd; col++) {
          const ch = def.map[run.row][col];
          assert.ok(!standable(ch), `${where}: its path is blocked at column ${col}`);
          assert.ok(ch !== '~' || (col >= run.start && col <= run.end), `${where}: another moving cloud shares its path at column ${col}`);
        }
        const hop = (candidates) => candidates.some((c) => [run.row - 1, run.row, run.row + 1].some((r) => r >= 0 && r < ROWS && standable(def.map[r][c])));
        assert.ok(hop([run.pathStart - 1, run.pathStart - 2]), `${where}: no fixed cloud within a short hop of its left end`);
        assert.ok(hop([run.pathEnd + 1, run.pathEnd + 2]), `${where}: no fixed cloud within a short hop of its right end`);
      }
    });

    test(`${def.id}: every rain cloud hangs 4+ rows over one flat surface, away from the start, moving clouds and signs`, () => {
      const [spawn] = cellsOf(def.map, 'C');
      const paths = moverPaths(def.map);
      for (const { col, row } of cellsOf(def.map, 'R')) {
        const where = `rain cloud at ${col},${row}`;
        const below = [col - 1, col, col + 1].map((c) => firstStandableBelow(def.map, c, row));
        assert.ok(below.every((r) => r === below[0]), `${where}: the surface under it is not flat (${below})`);
        assert.ok(below[0] < ROWS && below[0] - row >= 4, `${where}: surface row ${below[0]} is not 4+ rows below`);
        assert.ok(Math.abs(col - spawn.col) >= 8, `${where}: too close to the chicken start`);
        for (const p of paths) assert.ok(!(p.row > row && col + 1 >= p.pathStart && col - 1 <= p.pathEnd), `${where}: rains on the path of the moving cloud at ${p.start},${p.row}`);
        for (const sign of def.signs) assert.ok(Math.abs(sign.col - col) > 1, `${where}: rains on the sign at column ${sign.col}`);
      }
    });
  }

  if (theme === 'castle') {
    const level = parseLevel(def);
    const walls = wallCols(def.map);
    const [spawn] = cellsOf(def.map, 'C');
    const [spider] = cellsOf(def.map, 'S');
    const [portal] = cellsOf(def.map, 'O');
    const [checkpoint] = cellsOf(def.map, 'K');
    const [goal] = cellsOf(def.map, 'G');
    const roomOf = (col) => level.rooms.indexOf(roomAt(level, (col + 0.5) * TILE));

    test(`${def.id}: has a stone ceiling and a solid bottom row, and neighbouring floors differ by at most 3 tiles`, () => {
      assert.equal(def.map[0], '#'.repeat(cols), 'row 0 is the ceiling');
      assert.equal(def.map[ROWS - 1], '#'.repeat(cols), 'the bottom row is solid');
      for (let col = 1; col < cols; col++) {
        if (walls.includes(col) || walls.includes(col - 1)) continue;
        const diff = Math.abs(floorRow(def.map, col) - floorRow(def.map, col - 1));
        assert.ok(diff <= 3, `step of ${diff} tiles between columns ${col - 1} and ${col}`);
      }
    });

    test(`${def.id}: has four rooms at least 22 columns wide split by walls 1-2 columns thick, each with a kind and the throne room last`, () => {
      assert.equal(level.rooms.length, 4);
      const runs = [];
      for (const col of walls) {
        if (runs.length && col === runs[runs.length - 1].end + 1) runs[runs.length - 1].end = col;
        else runs.push({ start: col, end: col });
      }
      assert.equal(runs.length, 3, `wall runs ${JSON.stringify(runs)}`);
      for (const run of runs) assert.ok(run.end - run.start + 1 <= 2, `wall ${run.start}-${run.end} is too thick`);
      for (const room of level.rooms) assert.ok((room.right - room.left) / TILE >= 22, `room ${room.left / TILE}-${room.right / TILE - 1} is too narrow`);
      assert.ok(Array.isArray(def.rooms) && def.rooms.every((k) => ROOM_KINDS.includes(k)), `room kinds ${def.rooms}`);
      assert.equal(def.rooms[3], 'throne');
    });

    test(`${def.id}: start in room 1, spider and portal in room 2, checkpoint at room 3's door, princess in room 4`, () => {
      for (const [name, cell, room] of [['C', spawn, 0], ['S', spider, 1], ['O', portal, 1], ['K', checkpoint, 2], ['G', goal, 3]]) {
        assert.equal(roomOf(cell.col), room, `'${name}' at column ${cell.col}`);
      }
      assert.ok(checkpoint.col - level.rooms[2].left / TILE <= 3, `checkpoint at column ${checkpoint.col}`);
    });

    test(`${def.id}: the princess stands on flat floor from 2 columns left of her to 1 column right, where the carpet and throne go`, () => {
      for (let col = goal.col - 2; col <= goal.col + 1; col++) assert.equal(floorRow(def.map, col), goal.row + 1, `floor at column ${col}`);
    });

    test(`${def.id}: rooms 1 and 3 each end with one door standing on the floor; rooms 2 and 4 have none`, () => {
      const doors = cellsOf(def.map, 'D');
      assert.deepEqual(doors.map((d) => roomOf(d.col)), [0, 2]);
      for (const d of doors) {
        const lastCol = level.rooms[roomOf(d.col)].right / TILE - 1;
        assert.ok(lastCol - d.col <= 3, `door at column ${d.col} is ${lastCol - d.col} columns from the wall`);
        assert.equal(def.map[d.row + 1][d.col], '#', `door at ${d.col},${d.row} is floating`);
      }
    });

    test(`${def.id}: the spider guards a flat lane of ${SPIDER.maxRange} columns with at least 2 guard rats in it, and the portal stands just behind it`, () => {
      const side = spawn.col < spider.col ? -1 : 1;
      const floor = spider.row + 1;
      for (let k = 1; k <= SPIDER.maxRange; k++) {
        const col = spider.col + side * k;
        assert.equal(floorRow(def.map, col), floor, `lane column ${col} is not flat`);
        for (const row of [spider.row, spider.row - 1]) assert.notEqual(def.map[row][col], '#', `block in the fireball lane at ${col},${row}`);
      }
      const guards = level.enemies.filter((e) => e.guard).length;
      assert.ok(guards >= 2, `${guards} guard rats in the spider lane`);
      const behind = (portal.col - spider.col) * -side;
      assert.ok(behind >= 1 && behind <= 4, `portal ${behind} columns behind the spider`);
      assert.equal(def.map[portal.row + 1][portal.col], '#', 'the portal stands on the floor');
    });

    test(`${def.id}: every ghost floats in open air with its leash inside its room, well away from the spider`, () => {
      for (const { col, row } of cellsOf(def.map, 'g')) {
        const room = roomAt(level, (col + 0.5) * TILE);
        assert.ok(row >= 1 && row <= ROWS - 3, `ghost at ${col},${row} is too high or low`);
        assert.ok((col - GHOST.leash) * TILE >= room.left && (col + GHOST.leash + 1) * TILE <= room.right, `ghost at ${col},${row}: its leash leaves the room`);
        assert.ok(Math.abs(col - spider.col) > SPIDER.maxRange + GHOST.leash, `ghost at ${col},${row} is too close to the spider`);
      }
    });

    test(`${def.id}: no enemy starts within 5 columns of the checkpoint or of a room entrance, and no skeleton shares the spider's room`, () => {
      const entrances = [checkpoint.col, level.rooms[1].left / TILE + 1, level.rooms[3].left / TILE + 1];
      for (const { ch, col } of cellsOf(def.map, ENEMY_CHARS)) {
        for (const at of entrances) assert.ok(Math.abs(col - at) > 5, `'${ch}' at column ${col}, entrance at ${at}`);
      }
      for (const { col } of cellsOf(def.map, 's')) assert.notEqual(roomOf(col), 1, `skeleton at column ${col} is in the spider's room`);
    });
  }

  test(`${def.id}: every platform run can be reached from a surface at most 3 tiles below`, () => {
    for (const run of runsOf(def.map, '=')) {
      let reachable = false;
      for (let col = Math.max(0, run.start - 3); col <= Math.min(cols - 1, run.end + 3); col++) {
        for (let row = run.row + 1; row <= Math.min(ROWS - 1, run.row + 3); row++) {
          if (surfaceLike(def.map[row][col])) reachable = true;
        }
      }
      assert.ok(reachable, `platform at row ${run.row}, columns ${run.start}-${run.end}`);
    }
  });

  test(`${def.id}: every red crystal floats 1–4 tiles above a surface in its own or a neighbouring column`, () => {
    for (const { col, row } of cellsOf(def.map, 'r')) {
      let ok = false;
      for (const c of [col - 1, col, col + 1]) {
        if (c < 0 || c >= cols) continue;
        for (let r = row + 1; r <= Math.min(ROWS - 1, row + 4); r++) if (surfaceLike(def.map[r][c])) ok = true;
      }
      assert.ok(ok, `crystal at ${col},${row} is out of reach`);
    }
  });

  test(`${def.id}: every propeller carrot hovers directly above a surface`, () => {
    for (const { col, row } of cellsOf(def.map, 'p')) {
      assert.ok(row + 1 < ROWS && standable(def.map[row + 1][col]), `propeller carrot at ${col},${row}`);
    }
  });

  test(`${def.id}: every bee has open air above and below it and a fixed surface two rows down`, () => {
    for (const { col, row } of cellsOf(def.map, 'b')) {
      assert.ok(row === 0 || def.map[row - 1][col] !== '#', `ground above the bee at ${col},${row}`);
      assert.ok(row + 1 < ROWS && !standable(def.map[row + 1][col]), `surface right under the bee at ${col},${row}`);
      assert.ok(row + 2 < ROWS && standable(def.map[row + 2][col]), `no fixed surface two rows under the bee at ${col},${row}`);
    }
  });

  test(`${def.id}: every bat has a clear swoop box, a fixed surface three rows down and no moving cloud under its swing`, () => {
    const paths = moverPaths(def.map);
    for (const { col, row } of cellsOf(def.map, 'v')) {
      const where = `bat at ${col},${row}`;
      assert.ok(row + 3 < ROWS && standable(def.map[row + 3][col]), `${where}: no fixed surface three rows down`);
      assert.ok(col - BAT.range >= 0 && col + BAT.range < cols, `${where}: swings off the level`);
      for (let c = col - BAT.range; c <= col + BAT.range; c++) {
        for (let r = row; r <= row + 2; r++) assert.ok(!standable(def.map[r][c]), `${where}: its swoop hits ${c},${r}`);
      }
      for (const p of paths) {
        const shares = p.row >= row && p.row <= row + 3 && p.pathStart <= col + BAT.range && p.pathEnd >= col - BAT.range;
        assert.ok(!shares, `${where}: swoops over the moving cloud at ${p.start},${p.row}`);
      }
    }
  });

  test(`${def.id}: no enemy starts within 5 columns of the chicken`, () => {
    const [spawn] = cellsOf(def.map, 'C');
    for (const { ch, col } of cellsOf(def.map, ENEMY_CHARS)) {
      assert.ok(Math.abs(col - spawn.col) > 5, `'${ch}' at column ${col}, chicken at ${spawn.col}`);
    }
  });

  test(`${def.id}: the chicken, walkers, spider, checkpoint and goal stand on a fixed surface, and every sign has ground under it`, () => {
    for (const { ch, col, row } of cellsOf(def.map, 'CcZ*GmsSK')) {
      assert.ok(row + 1 < ROWS && standable(def.map[row + 1][col]), `'${ch}' at ${col},${row} is floating`);
    }
    for (const sign of def.signs) assert.ok((theme === 'castle' ? floorRow : surfaceRow)(def.map, sign.col) < ROWS, `sign at column ${sign.col} stands over a gap`);
  });
}

test('each level matches the spec exact crystal, enemy, rain-cloud and moving-cloud counts', () => {
  for (const def of levels) {
    const level = parseLevel(def);
    const expected = EXPECTED_COUNTS[def.id];
    assert.ok(expected, `${def.id} has expected counts`);
    assert.equal(level.crystals.length, expected.crystals, `${def.id} crystals`);
    for (const kind of ENEMY_KINDS) {
      assert.equal(level.enemies.filter((e) => e.kind === kind).length, expected[kind], `${def.id} ${kind}`);
    }
    assert.equal(level.rainClouds.length, expected.rain, `${def.id} rain clouds`);
    assert.equal(level.movers.length, expected.movers, `${def.id} moving clouds`);
  }
});
