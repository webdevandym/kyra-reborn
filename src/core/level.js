import { TILE, ROWS } from '../config.js';

const TILE_KINDS = { '#': 'solid', '=': 'oneway' };
const ENEMY_CHARS = { c: 'carrot', Z: 'zombie', p: 'propeller', b: 'bee' };
const KNOWN_CHARS = new Set(['.', '#', '=', 'C', 'c', 'Z', 'p', 'b', 'r', 'G']);

export function parseLevel(def) {
  const { id, map } = def;
  if (!Array.isArray(map) || map.length !== ROWS) {
    throw new Error(`${id}: map must have exactly ${ROWS} rows`);
  }
  const cols = map[0].length;
  const tiles = [];
  const enemies = [];
  const crystals = [];
  let spawn = null;
  let goal = null;

  map.forEach((line, row) => {
    if (line.length !== cols) {
      throw new Error(`${id}: row ${row} has ${line.length} columns, expected ${cols}`);
    }
    const tileRow = [];
    [...line].forEach((ch, col) => {
      if (!KNOWN_CHARS.has(ch)) throw new Error(`${id}: unknown character '${ch}' at ${col},${row}`);
      tileRow.push(TILE_KINDS[ch] ?? 'empty');
      const feet = { x: (col + 0.5) * TILE, y: (row + 1) * TILE };
      if (ch === 'C') {
        if (spawn) throw new Error(`${id}: more than one chicken start 'C'`);
        spawn = feet;
      } else if (ch === 'G') {
        if (goal) throw new Error(`${id}: more than one green crystal 'G'`);
        goal = feet;
      } else if (ENEMY_CHARS[ch]) {
        enemies.push({ kind: ENEMY_CHARS[ch], ...feet });
      } else if (ch === 'r') {
        crystals.push({ id: `${col},${row}`, x: feet.x, y: (row + 0.5) * TILE });
      }
    });
    tiles.push(tileRow);
  });

  if (!spawn) throw new Error(`${id}: missing chicken start 'C'`);
  if (!goal) throw new Error(`${id}: missing green crystal 'G'`);

  const level = {
    id,
    nameKey: `levels.${id}.name`,
    difficulty: def.difficulty ?? 1,
    cols,
    rows: ROWS,
    width: cols * TILE,
    height: ROWS * TILE,
    tiles,
    spawn,
    goal,
    enemies,
    crystals,
    signs: [],
  };
  level.signs = (def.signs ?? []).map((sign) => ({
    col: sign.col,
    key: sign.key,
    textKey: `levels.${id}.signs.${sign.key}`,
    x: (sign.col + 0.5) * TILE,
    y: solidTop(level, sign.col),
  }));
  return level;
}

export function tileAt(level, col, row) {
  if (col < 0 || col >= level.cols) return 'solid';
  if (row < 0) return 'empty';
  if (row >= level.rows) return 'solid';
  return level.tiles[row][col];
}

export function solidTop(level, col) {
  for (let row = 0; row < level.rows; row++) {
    if (tileAt(level, col, row) === 'solid') return row * TILE;
  }
  return level.height;
}
