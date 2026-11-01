import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ROWS, MOVER, LIFT, TILE, BAT, GHOST, SPIDER, SHARK, DOLPHIN, FISH, BUBBLE } from '../src/config.js';
import { parseLevel, roomAt, solidTop, ROOM_KINDS } from '../src/core/level.js';
import levels from '../src/levels/index.js';
import { LANGS } from '../src/i18n/index.js';

const DICTS = Object.fromEntries(LANGS.map((lang) => [lang, JSON.parse(readFileSync(new URL(`../src/i18n/${lang}.json`, import.meta.url), 'utf8'))]));

const standable = (ch) => ch === '#' || ch === '=';
const surfaceLike = (ch) => standable(ch) || ch === '~' || ch === 'V';

const NONE = { rat: 0, ghost: 0, skeleton: 0, spider: 0 };
const EMPTY_LAND = { carrot: 0, zombie: 0, propeller: 0, bee: 0, star: 0, bat: 0, rain: 0, rat: 0, ghost: 0, skeleton: 0, spider: 0 };
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
  level12: { ...EMPTY_LAND, crystals: 21, movers: 2, dolphin: 5, fish: 5, shark: 1, bubble: 1, teal: 1, pearl: 0 },
  level13: { ...EMPTY_LAND, crystals: 20, movers: 4, dolphin: 8, fish: 6, shark: 1, bubble: 2, teal: 1, pearl: 0 },
  level14: { ...EMPTY_LAND, crystals: 18, movers: 4, dolphin: 7, fish: 6, shark: 2, bubble: 2, teal: 1, pearl: 1 },
  level15: { ...EMPTY_LAND, crystals: 27, movers: 0, rabbit: 4, deer: 3, snake: 3, monkey: 1 },
};
const ENEMY_KINDS = ['carrot', 'zombie', 'propeller', 'bee', 'star', 'bat', 'rat', 'ghost', 'skeleton', 'spider', 'dolphin', 'fish', 'shark', 'rabbit', 'deer', 'snake', 'monkey'];
const ENEMY_CHARS = 'cZpb*vmgsSdfH';
const SEA_CHARS = 'dfHoTPV';
const BANNED = { meadow: `*vR~mgsSOKD${SEA_CHARS}`, sky: `cZpbmgsSOKD${SEA_CHARS}`, castle: `cZpb*vR~${SEA_CHARS}`, sea: 'cZpb*vRmgsSOKD', forest: `cZpb*vR~mgsSD${SEA_CHARS}` };

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

test('the level list is level1 to level15, meadow then sky then castle then sea then forest, with difficulty 1-3 that never goes down within a theme', () => {
  assert.deepEqual(levels.map((def) => def.id), ['level1', 'level2', 'level3', 'level4', 'level5', 'level6', 'level7', 'level8', 'level9', 'level10', 'level11', 'level12', 'level13', 'level14', 'level15']);
  assert.deepEqual(levels.map((def) => def.theme ?? 'meadow'), ['meadow', 'meadow', 'meadow', 'meadow', 'meadow', 'sky', 'sky', 'sky', 'castle', 'castle', 'castle', 'sea', 'sea', 'sea', 'forest']);
  const last = {};
  for (const def of levels) {
    const theme = def.theme ?? 'meadow';
    assert.ok(Number.isInteger(def.difficulty) && def.difficulty >= 1 && def.difficulty <= 3, `${def.id} difficulty ${def.difficulty}`);
    assert.ok(def.difficulty >= (last[theme] ?? 1), `${def.id} is easier than the ${theme} level before it`);
    last[theme] = def.difficulty;
  }
  assert.deepEqual(levels.map((def) => def.difficulty), [1, 1, 2, 2, 3, 2, 2, 3, 2, 3, 3, 2, 3, 3, 3]);
});

test('the house appears only on level 17', () => {
  const withHouse = levels.filter((def) => cellsOf(def.map, 'U').length > 0).map((def) => def.id);
  assert.ok(withHouse.every((id) => id === 'level17'), `a house on ${withHouse}`);
  for (const def of levels) assert.ok(cellsOf(def.map, 'U').length <= 1, `${def.id} has more than one house`);
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
    const rooms = theme === 'forest' ? 3 : 1;
    test(`${def.id}: is ${theme === 'forest' ? 'three parts' : 'a single room'}`, () => {
      assert.equal(parseLevel(def).rooms.length, rooms);
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

  if (theme === 'sea') {
    const level = parseLevel(def);
    const [spawn] = cellsOf(def.map, 'C');
    const [goal] = cellsOf(def.map, 'G');
    const sharks = cellsOf(def.map, 'H');
    const pearls = cellsOf(def.map, 'P');
    const sticks = moverPaths(def.map);
    const lifts = runsOf(def.map, 'V');
    const open = (ch) => !standable(ch) && ch !== '~';
    const stickAt = (col, row) => sticks.some((p) => col >= p.pathStart && col <= p.pathEnd && Math.abs(p.row - row) <= LIFT.range);

    test(`${def.id}: neighbouring floor heights differ by at most 3 tiles`, () => {
      for (let col = 1; col < cols; col++) {
        const a = surfaceRow(def.map, col - 1);
        const b = surfaceRow(def.map, col);
        if (a === ROWS || b === ROWS) continue;
        assert.ok(Math.abs(a - b) <= 3, `step of ${Math.abs(a - b)} tiles between columns ${col - 1} and ${col}`);
      }
    });

    test(`${def.id}: pits not bridged by a sand stick are at most 3 columns wide, bridged ones at most 14, and the floor after a pit is at most 1 tile higher`, () => {
      for (const gap of gapsOf(def.map)) {
        assert.ok(gap.start > 0 && gap.end < cols - 1, `pit at the level edge (${gap.start}-${gap.end})`);
        const width = gap.end - gap.start + 1;
        const bridged = sticks.some((p) => p.pathStart <= gap.end && p.pathEnd >= gap.start) || lifts.some((v) => v.start <= gap.end && v.end >= gap.start);
        assert.ok(width <= (bridged ? 14 : 3), `pit ${gap.start}-${gap.end} is ${width} columns wide`);
        const rise = surfaceRow(def.map, gap.start - 1) - surfaceRow(def.map, gap.end + 1);
        assert.ok(rise <= 1, `the floor after the pit at ${gap.start}-${gap.end} is ${rise} tiles higher`);
      }
    });

    test(`${def.id}: every sliding sand stick is 2-4 tiles long, has an open path and a short hop to a floor or lift at both ends`, () => {
      for (const run of sticks) {
        const where = `sand stick at ${run.start},${run.row}`;
        assert.ok(run.end - run.start + 1 >= 2 && run.end - run.start + 1 <= 4, `${where} has a bad length`);
        assert.ok(run.pathStart - 2 >= 0 && run.pathEnd + 2 < cols, `${where} swings off the level`);
        for (let col = run.pathStart; col <= run.pathEnd; col++) {
          const ch = def.map[run.row][col];
          assert.ok(!standable(ch), `${where}: its path is blocked at column ${col}`);
          assert.ok(ch !== '~' || (col >= run.start && col <= run.end), `${where}: another stick shares its path at column ${col}`);
        }
        const hop = (candidates) => candidates.some((c) => [run.row - 1, run.row, run.row + 1].some((r) => standable(def.map[r][c]) || def.map[r][c] === 'V'));
        assert.ok(hop([run.pathStart - 1, run.pathStart - 2]), `${where}: nothing within a short hop of its left end`);
        assert.ok(hop([run.pathEnd + 1, run.pathEnd + 2]), `${where}: nothing within a short hop of its right end`);
      }
    });

    test(`${def.id}: every lift has a clear shaft of ${LIFT.range} tiles up and down and a floor or stick within 2 columns of both sides`, () => {
      for (const run of lifts) {
        const where = `lift at ${run.start},${run.row}`;
        assert.ok(run.row - LIFT.range >= 0 && run.row + LIFT.range < ROWS, `${where} leaves the level`);
        for (let col = run.start; col <= run.end; col++) {
          for (let r = run.row - LIFT.range; r <= run.row + LIFT.range; r++) {
            const ch = def.map[r][col];
            assert.ok(open(ch) && (ch !== 'V' || r === run.row), `${where}: its shaft is blocked at ${col},${r}`);
          }
        }
        const supported = (candidates) => candidates.some((c) => {
          for (let r = run.row - LIFT.range; r <= run.row + LIFT.range + 1; r++) if (standable(def.map[r]?.[c] ?? '.')) return true;
          return stickAt(c, run.row);
        });
        assert.ok(supported([run.start - 1, run.start - 2]), `${where}: nothing within 2 columns on its left`);
        assert.ok(supported([run.end + 1, run.end + 2]), `${where}: nothing within 2 columns on its right`);
      }
    });

    test(`${def.id}: every dolphin and fish over open water has a clear swim box, and the rest stand on a floor`, () => {
      for (const { ch, col, row } of cellsOf(def.map, 'df')) {
        const where = `'${ch}' at ${col},${row}`;
        const range = ch === 'd' ? DOLPHIN.swimRange : FISH.swimRange;
        if (standable(def.map[row + 1]?.[col] ?? '#')) continue;
        assert.ok(col - range >= 0 && col + range < cols, `${where}: swims off the level`);
        for (let c = col - range; c <= col + range; c++) {
          for (let r = row - 1; r <= row + 1; r++) assert.ok(open(def.map[r][c]) || (c === col && r === row), `${where}: its swim box hits ${c},${r}`);
        }
        assert.ok(row <= 7, `${where}: swims too low`);
      }
    });

    test(`${def.id}: every bubble drifts through open water past a red crystal`, () => {
      for (const { col, row } of cellsOf(def.map, 'o')) {
        const where = `bubble at ${col},${row}`;
        assert.ok(col - BUBBLE.range >= 0 && col + BUBBLE.range < cols, `${where}: drifts off the level`);
        for (let c = col - BUBBLE.range; c <= col + BUBBLE.range; c++) {
          for (let r = row - 1; r <= row + 1; r++) assert.ok(open(def.map[r][c]) || (c === col && r === row), `${where}: its path hits ${c},${r}`);
        }
        const near = cellsOf(def.map, 'r').some((c) => Math.abs(c.col - col) <= BUBBLE.range && Math.abs(c.row - row) <= 1);
        assert.ok(near, `${where}: no crystal in its path`);
      }
    });

    test(`${def.id}: the turquoise crystal sits near the start, within reach of the floor`, () => {
      const teals = cellsOf(def.map, 'T');
      assert.equal(teals.length, 1);
      const [{ col, row }] = teals;
      assert.ok(col - spawn.col <= 12 && col > spawn.col, `turquoise crystal at column ${col}`);
      let ok = false;
      for (let r = row + 1; r <= Math.min(ROWS - 1, row + 4); r++) if (standable(def.map[r][col])) ok = true;
      assert.ok(ok, 'out of reach');
    });

    test(`${def.id}: the shark lanes are flat and open, the sharks stand 6+ columns apart, and the crystal comes after the last shark`, () => {
      assert.ok(sharks.length >= 1 && sharks.length <= 2);
      const last = Math.max(...sharks.map((s) => s.col));
      for (const shark of sharks) {
        const floor = shark.row + 1;
        assert.ok(shark.col - spawn.col > 40, `shark at column ${shark.col} is too close to the start`);
        for (let col = shark.col - SHARK.maxRange / 2; col <= shark.col; col++) {
          assert.equal(floorRow(def.map, col), floor, `lane column ${col} is not flat`);
          for (const row of [shark.row, shark.row - 1]) assert.ok(def.map[row][col] !== '#' && def.map[row][col] !== '=', `block in the shell lane at ${col},${row}`);
        }
        for (const other of sharks) if (other !== shark) assert.ok(Math.abs(other.col - shark.col) >= 6, 'sharks too close');
      }
      assert.ok(goal.col - last >= 3, `the crystal at column ${goal.col} is not behind the last shark at ${last}`);
      for (let col = last; col <= goal.col + 1; col++) assert.equal(floorRow(def.map, col), goal.row + 1, `floor at column ${col}`);
    });

    test(`${def.id}: a pearl with a crab appears exactly on the two-shark level, on flat floor before the first shark`, () => {
      assert.equal(pearls.length, sharks.length === 2 ? 1 : 0);
      for (const pearl of pearls) {
        const first = Math.min(...sharks.map((s) => s.col));
        assert.ok(first - pearl.col >= 10, `pearl at column ${pearl.col} is too close to the sharks`);
        for (let col = pearl.col; col <= first; col++) assert.equal(floorRow(def.map, col), pearl.row + 1, `floor at column ${col}`);
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

  if (theme === 'forest') {
    const level = parseLevel(def);
    const walls = wallCols(def.map);
    const parts = level.rooms.map((room) => ({ first: room.left / TILE, last: room.right / TILE - 1 }));
    const partOf = (col) => parts.findIndex((p) => col >= p.first && col <= p.last);
    const inPart = (cells, i) => cells.filter((c) => partOf(c.col) === i);
    const byCol = (a, b) => a.col - b.col;
    const [spawn] = cellsOf(def.map, 'C');
    const [savepoint] = cellsOf(def.map, 'K');
    const [goal] = cellsOf(def.map, 'G');
    const bubbles = cellsOf(def.map, 'M');
    const portals = cellsOf(def.map, 'O').sort(byCol);
    const snakes = cellsOf(def.map, 'nw').sort(byCol);
    const ground = (col) => surfaceRow(def.map, col);
    const open = (col, row) => !standable(def.map[row]?.[col] ?? '#');
    const drop2 = parts[2].first + 1;
    const monkeyChases = (col) => partOf(col) > 0;

    test(`${def.id}: has three parts of 55 to 70 columns split by single full-height wall columns`, () => {
      assert.deepEqual(walls, [parts[0].last + 1, parts[1].last + 1]);
      for (const p of parts) {
        const width = p.last - p.first + 1;
        assert.ok(width >= 55 && width <= 70, `part ${p.first}-${p.last} is ${width} columns wide`);
      }
    });

    test(`${def.id}: a forest level has exactly three snakes, one per part`, () => {
      assert.deepEqual(snakes.map((s) => partOf(s.col)), [0, 1, 2]);
    });

    test(`${def.id}: each of the first two parts ends in a wall and holds one portal within eight tiles of its snake`, () => {
      assert.deepEqual(portals.map((o) => partOf(o.col)), [0, 1]);
      for (const i of [0, 1]) {
        const [snake] = inPart(snakes, i);
        const [portal] = inPart(portals, i);
        const wall = parts[i].last + 1;
        assert.ok(walls.includes(wall), `part ${i + 1} does not end in a wall`);
        assert.ok(Math.abs(portal.col - snake.col) <= 8, `portal at column ${portal.col} is ${Math.abs(portal.col - snake.col)} columns from its snake`);
        for (const [name, cell] of [['snake', snake], ['portal', portal]]) {
          assert.ok(wall - cell.col <= 12, `the ${name} at column ${cell.col} is not in the dead end before the wall at ${wall}`);
        }
        assert.equal(def.map[portal.row + 1][portal.col], '#', `portal at ${portal.col},${portal.row} does not stand on the ground`);
        assert.ok(open(portal.col, portal.row - 1), `no room above the portal at ${portal.col},${portal.row}`);
      }
    });

    test(`${def.id}: the savepoint stands on solid ground at the drop point of portal 1`, () => {
      assert.equal(savepoint.col, parts[1].first + 1, 'portal 1 drops the chicken 1.5 tiles into part 2');
      assert.equal(def.map[savepoint.row + 1][savepoint.col], '#');
      assert.equal(solidTop(level, savepoint.col), level.checkpoint.y, 'the drop height is the savepoint');
      for (let col = parts[1].first; col <= savepoint.col + 5; col++) {
        assert.equal(ground(col), savepoint.row + 1, `ground at column ${col} is not level with the savepoint, where the monkey arrives`);
        for (const row of [savepoint.row - 1, savepoint.row]) assert.ok(open(col, row), `no room for the monkey at ${col},${row}`);
      }
    });

    test(`${def.id}: portal 2 drops the chicken on open solid ground in part 3 with room for the monkey ahead`, () => {
      const floor = ground(drop2);
      assert.ok(floor < ROWS, `no ground at the drop point, column ${drop2}`);
      assert.equal(solidTop(level, drop2), floor * TILE, 'the chicken lands on the ground, not on a block above it');
      for (let col = parts[2].first; col <= drop2 + 5; col++) {
        assert.equal(ground(col), floor, `ground at column ${col} is not level with the drop point`);
        for (const row of [floor - 2, floor - 1]) assert.ok(open(col, row), `no room for the monkey at ${col},${row}`);
      }
    });

    test(`${def.id}: the monkey bubble is in part 2 and its column lies strictly between the savepoint and portal 2`, () => {
      assert.equal(bubbles.length, 1);
      const [bubble] = bubbles;
      const portal2 = portals[1];
      assert.equal(partOf(bubble.col), 1, `bubble at column ${bubble.col}`);
      assert.ok(savepoint.col < bubble.col && bubble.col < portal2.col, `bubble at column ${bubble.col}, savepoint at ${savepoint.col}, portal 2 at ${portal2.col}`);
      const floor = ground(bubble.col);
      assert.ok(floor < ROWS, 'the bubble hangs over a pit');
      assert.ok(floor - bubble.row >= 3, `the bubble at row ${bubble.row} is less than 2 rows above the ground at row ${floor}`);
      for (let col = bubble.col - 1; col <= bubble.col + 1; col++) {
        for (let row = bubble.row - 1; row < floor; row++) assert.ok(open(col, row), `the bubble's space is blocked at ${col},${row}`);
      }
    });

    test(`${def.id}: the crystal in part 3 is on ground`, () => {
      assert.equal(partOf(goal.col), 2, `crystal at column ${goal.col}`);
      for (let col = goal.col - 1; col <= goal.col + 1; col++) assert.equal(ground(col), goal.row + 1, `ground at column ${col}`);
      assert.ok(open(goal.col, goal.row - 1), 'no room above the crystal');
    });

    test(`${def.id}: pits lie inside a part, are at most 3 columns wide and 2 where the monkey chases, and the floors across a pit differ by at most 1 tile`, () => {
      for (const gap of gapsOf(def.map)) {
        const where = `pit ${gap.start}-${gap.end}`;
        const part = partOf(gap.start);
        assert.ok(partOf(gap.start - 1) === part && partOf(gap.end + 1) === part, `${where} touches a wall or the level edge`);
        const width = gap.end - gap.start + 1;
        assert.ok(width <= (monkeyChases(gap.start) ? 2 : 3), `${where} is ${width} columns wide`);
        const diff = Math.abs(ground(gap.start - 1) - ground(gap.end + 1));
        assert.ok(diff <= 1, `the floors across ${where} differ by ${diff} tiles`);
      }
    });

    test(`${def.id}: neighbouring floor heights inside a part differ by at most 3 tiles, 2 where the monkey chases`, () => {
      for (let col = 1; col < cols; col++) {
        if (walls.includes(col) || walls.includes(col - 1)) continue;
        const a = ground(col - 1);
        const b = ground(col);
        if (a === ROWS || b === ROWS) continue;
        assert.ok(Math.abs(a - b) <= (monkeyChases(col) ? 2 : 3), `step of ${Math.abs(a - b)} tiles between columns ${col - 1} and ${col}`);
      }
    });

    test(`${def.id}: where the monkey chases, every log is at most 2 tiles above a surface`, () => {
      for (const run of runsOf(def.map, '=')) {
        if (!monkeyChases(run.start)) continue;
        let reachable = false;
        for (let col = run.start - 1; col <= run.end + 1; col++) {
          if (walls.includes(col)) continue;
          for (let row = run.row + 1; row <= run.row + 2; row++) if (standable(def.map[row]?.[col] ?? '.')) reachable = true;
        }
        assert.ok(reachable, `log at row ${run.row}, columns ${run.start}-${run.end}`);
      }
    });

    test(`${def.id}: every snake can be stomped: a walking one stands on solid ground, a flying one hovers in open air one row above a surface`, () => {
      for (const { ch, col, row } of snakes) {
        const where = `'${ch}' at ${col},${row}`;
        if (ch === 'n') {
          assert.equal(def.map[row + 1][col], '#', `${where} does not stand on solid ground`);
          continue;
        }
        assert.ok(standable(def.map[row + 1][col]), `${where} does not hover one row above a surface`);
        for (let c = col - 1; c <= col + 1; c++) {
          for (let r = row - 2; r <= row; r++) assert.ok(open(c, r), `${where}: its air is blocked at ${c},${r}`);
        }
      }
    });

    test(`${def.id}: rabbits and deer stand on a surface and no tall character is buried in the ground`, () => {
      for (const { ch, col, row } of cellsOf(def.map, 'ae')) assert.ok(standable(def.map[row + 1][col]), `'${ch}' at ${col},${row} is floating`);
      for (const { ch, col, row } of cellsOf(def.map, 'eOKG')) assert.ok(open(col, row - 1), `'${ch}' at ${col},${row} has ground on its head`);
    });

    test(`${def.id}: no rabbit or deer can patrol onto a portal drop point`, () => {
      for (const { ch, col, row } of cellsOf(def.map, 'ae')) {
        const walkable = (c) => standable(def.map[row + 1][c] ?? '.') && def.map[row][c] !== '#' && (ch === 'a' || def.map[row - 1][c] !== '#');
        let left = col;
        let right = col;
        while (left > 0 && walkable(left - 1)) left--;
        while (right < cols - 1 && walkable(right + 1)) right++;
        for (const at of [savepoint.col, drop2]) assert.ok(at < left - 1 || at > right + 1, `'${ch}' at column ${col} patrols ${left}-${right}, onto the drop point at ${at}`);
      }
    });

    test(`${def.id}: no rabbit, deer or snake starts within 5 columns of the chicken start or of a portal drop point`, () => {
      for (const { ch, col } of cellsOf(def.map, 'aenw')) {
        for (const at of [spawn.col, savepoint.col, drop2]) assert.ok(Math.abs(col - at) > 5, `'${ch}' at column ${col}, start at ${at}`);
      }
    });

    test(`${def.id}: has at least four signs, each on the ground inside a part`, () => {
      assert.ok(def.signs.length >= 4, `${def.signs.length} signs`);
      for (const sign of def.signs) {
        assert.ok(partOf(sign.col) >= 0, `sign at column ${sign.col} is in a wall`);
        assert.ok(ground(sign.col) < ROWS, `sign at column ${sign.col} stands over a pit`);
      }
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
    for (const { ch, col, row } of cellsOf(def.map, 'CcZ*GmsSKHP')) {
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
      assert.equal(level.enemies.filter((e) => e.kind === kind).length, expected[kind] ?? 0, `${def.id} ${kind}`);
    }
    assert.equal(level.rainClouds.length, expected.rain, `${def.id} rain clouds`);
    assert.equal(level.movers.length, expected.movers, `${def.id} moving clouds and sticks`);
    assert.equal(level.bubbles.length, (expected.bubble ?? 0), `${def.id} bubbles`);
    assert.equal(level.teals.length, (expected.teal ?? 0), `${def.id} turquoise crystals`);
    assert.equal(level.pearls.length, (expected.pearl ?? 0), `${def.id} pearls`);
  }
});
