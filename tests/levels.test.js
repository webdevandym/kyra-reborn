import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ROWS } from '../src/config.js';
import { parseLevel } from '../src/core/level.js';
import levels from '../src/levels/index.js';

const standable = (ch) => ch === '#' || ch === '=';

const EXPECTED_COUNTS = {
  level1: { crystals: 15, carrot: 5, zombie: 0, propeller: 0, bee: 0 },
  level2: { crystals: 20, carrot: 6, zombie: 3, propeller: 0, bee: 0 },
  level3: { crystals: 22, carrot: 7, zombie: 5, propeller: 0, bee: 0 },
  level4: { crystals: 22, carrot: 4, zombie: 2, propeller: 4, bee: 4 },
  level5: { crystals: 25, carrot: 7, zombie: 4, propeller: 4, bee: 5 },
};

function cellsOf(map, chars) {
  const cells = [];
  map.forEach((line, row) => [...line].forEach((ch, col) => {
    if (chars.includes(ch)) cells.push({ ch, col, row });
  }));
  return cells;
}

test('the level list is level1 to level5 in order, with difficulty 1-3 that never goes down', () => {
  assert.deepEqual(levels.map((def) => def.id), ['level1', 'level2', 'level3', 'level4', 'level5']);
  let previous = 1;
  for (const def of levels) {
    assert.ok(Number.isInteger(def.difficulty) && def.difficulty >= 1 && def.difficulty <= 3, `${def.id} difficulty ${def.difficulty}`);
    assert.ok(def.difficulty >= previous, `${def.id} is easier than the level before it`);
    previous = def.difficulty;
  }
});

function surfaceRow(map, col) {
  for (let row = 0; row < ROWS; row++) if (map[row][col] === '#') return row;
  return ROWS;
}

function platformRuns(map) {
  const runs = [];
  map.forEach((line, row) => {
    for (let col = 0; col < line.length; col++) {
      if (line[col] !== '=') continue;
      const start = col;
      while (col < line.length && line[col] === '=') col++;
      runs.push({ row, start, end: col - 1 });
    }
  });
  return runs;
}

for (const def of levels) {
  test(`${def.id}: parses, has a name in both languages and signs in both languages`, () => {
    const level = parseLevel(def);
    assert.ok(def.name.uk && def.name.en);
    for (const sign of def.signs) assert.ok(sign.text.uk && sign.text.en, `sign at col ${sign.col}`);
  });

  test(`${def.id}: has no pits — every column has solid ground on the bottom row`, () => {
    const bottom = def.map[ROWS - 1];
    for (let col = 0; col < bottom.length; col++) assert.equal(bottom[col], '#', `pit at column ${col}`);
  });

  test(`${def.id}: neighbouring ground heights differ by at most 3 tiles`, () => {
    for (let col = 1; col < def.map[0].length; col++) {
      const diff = Math.abs(surfaceRow(def.map, col) - surfaceRow(def.map, col - 1));
      assert.ok(diff <= 3, `step of ${diff} tiles between columns ${col - 1} and ${col}`);
    }
  });

  test(`${def.id}: every platform run can be reached from a surface at most 3 tiles below`, () => {
    for (const run of platformRuns(def.map)) {
      let reachable = false;
      for (let col = Math.max(0, run.start - 3); col <= Math.min(def.map[0].length - 1, run.end + 3); col++) {
        for (let row = run.row + 1; row <= Math.min(ROWS - 1, run.row + 3); row++) {
          if (standable(def.map[row][col])) reachable = true;
        }
      }
      assert.ok(reachable, `platform at row ${run.row}, columns ${run.start}-${run.end}`);
    }
  });

  test(`${def.id}: every red crystal floats 1–4 tiles above a surface in its own or a neighbouring column`, () => {
    def.map.forEach((line, row) => {
      [...line].forEach((ch, col) => {
        if (ch !== 'r') return;
        let ok = false;
        for (const c of [col - 1, col, col + 1]) {
          if (c < 0 || c >= line.length) continue;
          for (let r = row + 1; r <= Math.min(ROWS - 1, row + 4); r++) if (standable(def.map[r][c])) ok = true;
        }
        assert.ok(ok, `crystal at ${col},${row} is out of reach`);
      });
    });
  });

  test(`${def.id}: every propeller carrot hovers directly above a surface`, () => {
    for (const { col, row } of cellsOf(def.map, 'p')) {
      assert.ok(row + 1 < ROWS && standable(def.map[row + 1][col]), `propeller carrot at ${col},${row}`);
    }
  });

  test(`${def.id}: every bee has open air above and below it and a surface two rows down`, () => {
    for (const { col, row } of cellsOf(def.map, 'b')) {
      assert.ok(row === 0 || def.map[row - 1][col] !== '#', `ground above the bee at ${col},${row}`);
      assert.ok(row + 1 < ROWS && !standable(def.map[row + 1][col]), `surface right under the bee at ${col},${row}`);
      assert.ok(row + 2 < ROWS && standable(def.map[row + 2][col]), `no surface two rows under the bee at ${col},${row}`);
    }
  });

  test(`${def.id}: no enemy starts within 5 columns of the chicken`, () => {
    const [spawn] = cellsOf(def.map, 'C');
    for (const { ch, col } of cellsOf(def.map, 'cZpb')) {
      assert.ok(Math.abs(col - spawn.col) > 5, `'${ch}' at column ${col}, chicken at ${spawn.col}`);
    }
  });

  test(`${def.id}: the chicken, enemies and goal stand on something`, () => {
    def.map.forEach((line, row) => {
      [...line].forEach((ch, col) => {
        if (!'CcZG'.includes(ch)) return;
        assert.ok(row + 1 < ROWS && standable(def.map[row + 1][col]), `'${ch}' at ${col},${row} is floating`);
      });
    });
  });
}

test('each level matches the spec exact crystal and enemy counts', () => {
  for (const def of levels) {
    const level = parseLevel(def);
    const expected = EXPECTED_COUNTS[def.id];
    assert.ok(expected, `${def.id} has expected counts`);
    assert.equal(level.crystals.length, expected.crystals, `${def.id} crystals`);
    for (const kind of ['carrot', 'zombie', 'propeller', 'bee']) {
      assert.equal(level.enemies.filter((e) => e.kind === kind).length, expected[kind], `${def.id} ${kind}`);
    }
  }
});
