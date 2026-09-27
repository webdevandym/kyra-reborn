import { TILE, ROWS } from '../config.js';

const TILE_KINDS = { '#': 'solid', '=': 'oneway' };
const ENEMY_CHARS = {
  c: 'carrot',
  Z: 'zombie',
  p: 'propeller',
  b: 'bee',
  '*': 'star',
  v: 'bat',
  m: 'rat',
  g: 'ghost',
  s: 'skeleton',
  S: 'spider',
};
const KNOWN_CHARS = new Set(['.', '#', '=', 'C', 'c', 'Z', 'p', 'b', 'r', 'G', '*', 'v', 'R', '~', 'm', 'g', 's', 'S', 'O', 'K', 'D']);
const THEMES = new Set(['meadow', 'sky', 'castle']);
export const ROOM_KINDS = ['hall', 'library', 'kitchen', 'dungeon', 'throne'];

export function parseLevel(def) {
  const { id, map } = def;
  const theme = def.theme ?? 'meadow';
  if (!THEMES.has(theme)) throw new Error(`${id}: unknown theme '${theme}'`);
  if (!Array.isArray(map) || map.length !== ROWS) {
    throw new Error(`${id}: map must have exactly ${ROWS} rows`);
  }
  const cols = map[0].length;
  const tiles = [];
  const enemies = [];
  const crystals = [];
  const rainClouds = [];
  const movers = [];
  let spawn = null;
  let goal = null;
  let portal = null;
  let checkpoint = null;
  const doors = [];

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
      } else if (ch === 'O') {
        if (portal) throw new Error(`${id}: more than one portal 'O'`);
        portal = feet;
      } else if (ch === 'K') {
        if (checkpoint) throw new Error(`${id}: more than one checkpoint 'K'`);
        checkpoint = feet;
      } else if (ch === 'D') {
        doors.push(feet);
      } else if (ENEMY_CHARS[ch]) {
        enemies.push({ kind: ENEMY_CHARS[ch], ...feet });
      } else if (ch === 'r') {
        crystals.push({ id: `${col},${row}`, x: feet.x, y: (row + 0.5) * TILE });
      } else if (ch === 'R') {
        rainClouds.push({ id: `${col},${row}`, col, row, x: (col + 0.5) * TILE, y: (row + 0.5) * TILE });
      } else if (ch === '~' && line[col - 1] !== '~') {
        let end = col;
        while (line[end] === '~') end++;
        const len = end - col;
        if (len < 2 || len > 4) {
          throw new Error(`${id}: moving cloud at ${col},${row} must be 2–4 tiles`);
        }
        movers.push({ id: `${col},${row}`, col, row, width: len * TILE, x: col * TILE, y: row * TILE });
      }
    });
    tiles.push(tileRow);
  });

  if (!spawn) throw new Error(`${id}: missing chicken start 'C'`);
  if (!goal) throw new Error(`${id}: missing green crystal 'G'`);
  if (theme === 'castle') {
    if (enemies.filter((e) => e.kind === 'spider').length !== 1) throw new Error(`${id}: a castle level needs exactly one spider 'S'`);
    if (!portal) throw new Error(`${id}: a castle level needs a portal 'O'`);
    if (!checkpoint) throw new Error(`${id}: a castle level needs a checkpoint 'K'`);
  }

  const level = {
    id,
    nameKey: `levels.${id}.name`,
    theme,
    difficulty: def.difficulty ?? 1,
    cols,
    rows: ROWS,
    width: cols * TILE,
    height: ROWS * TILE,
    tiles,
    rooms: roomsOf(tiles, cols, def.rooms, id),
    spawn,
    goal,
    portal,
    checkpoint,
    doors,
    enemies,
    crystals,
    rainClouds,
    movers,
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

function roomsOf(tiles, cols, kinds, id) {
  const wall = (col) => tiles.every((row) => row[col] === 'solid');
  const rooms = [];
  for (let col = 0; col < cols; col++) {
    if (wall(col)) continue;
    const start = col;
    while (col < cols && !wall(col)) col++;
    rooms.push({ left: start * TILE, right: col * TILE, kind: null });
  }
  if (kinds === undefined) return rooms;
  if (!Array.isArray(kinds) || kinds.length !== rooms.length) throw new Error(`${id}: 'rooms' must name one kind for each of the ${rooms.length} rooms`);
  kinds.forEach((kind, i) => {
    if (!ROOM_KINDS.includes(kind)) throw new Error(`${id}: unknown room kind '${kind}'`);
    rooms[i].kind = kind;
  });
  if (kinds[kinds.length - 1] !== 'throne') throw new Error(`${id}: the last room must be the 'throne' room`);
  return rooms;
}

export function roomIndex(level, x) {
  return level.rooms.indexOf(roomAt(level, x));
}

export function roomAt(level, x) {
  let nearest = level.rooms[0];
  let best = Infinity;
  for (const room of level.rooms) {
    if (x >= room.left && x < room.right) return room;
    const dist = x < room.left ? room.left - x : x - room.right;
    if (dist < best) {
      best = dist;
      nearest = room;
    }
  }
  return nearest;
}

export function tileAt(level, col, row) {
  if (col < 0 || col >= level.cols) return 'solid';
  if (row < 0) return 'empty';
  if (row >= level.rows) return 'empty';
  return level.tiles[row][col];
}

export function solidTop(level, col) {
  let open = false;
  for (let row = 0; row < level.rows; row++) {
    const solid = tileAt(level, col, row) === 'solid';
    if (solid && open) return row * TILE;
    if (!solid) open = true;
  }
  return level.height;
}
