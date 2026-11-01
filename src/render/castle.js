import { TILE, VIEW_W, VIEW_W_MAX, COLORS } from '../config.js';
import { tileAt, roomAt } from '../core/level.js';
import { mulberry32, inkShape, inkLine, inkRect } from './ink.js';
import { hashString, visibleCols, eachRun } from './layout.js';
import { fillSolidTiles, inkTileEdges } from './tiles.js';
import { drawPrincess } from './castle-sprites.js';
import { ROOM_PROPS, ROOM_TINTS } from './castle-props.js';

export function createCastleTheme(ctx) {
  const doodleCache = new Map();

  function doodlesFor(level) {
    if (doodleCache.has(level.id)) return doodleCache.get(level.id);
    const rand = mulberry32(hashString(level.id) ^ 0x2545f491);
    const perRoom = level.rooms.map((room) => {
      const props = ROOM_PROPS[room.kind ?? 'hall'];
      const start = room.left * 0.3 + 70;
      const end = Math.max(room.left, room.right - VIEW_W_MAX) * 0.3 + VIEW_W_MAX - 70;
      const items = [];
      for (let x = start, i = 0; x < end; x += 150 + rand() * 90, i++) {
        items.push({ draw: props[i % props.length], x, seed: Math.floor(rand() * 1e5) });
      }
      return items;
    });
    doodleCache.set(level.id, perRoom);
    return perRoom;
  }

  const viewRoom = (level, camX) => roomAt(level, camX + VIEW_W / 2);

  function drawBackdrop(level, camX, time) {
    const items = doodlesFor(level)[level.rooms.indexOf(viewRoom(level, camX))];
    for (const item of items) {
      const x = item.x - camX * 0.3;
      if (x < -120 || x > VIEW_W + 120) continue;
      item.draw(ctx, x, time, item.seed);
    }
  }

  function drawTiles(level, camX) {
    const [c0, c1] = visibleCols(level, camX);
    const solid = (c, r) => tileAt(level, c, r) === 'solid';

    fillSolidTiles(ctx, level, c0, c1, COLORS.stone);

    ctx.strokeStyle = COLORS.stoneShade;
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let c = c0; c <= c1; c++) {
      for (let r = 0; r < level.rows; r++) {
        if (!solid(c, r)) continue;
        const x = c * TILE;
        const y = r * TILE;
        ctx.moveTo(x + 2, y + TILE / 2);
        ctx.lineTo(x + TILE - 2, y + TILE / 2);
        const joint = r % 2 === 0 ? x + TILE / 2 : x + 4;
        ctx.moveTo(joint, y + 3);
        ctx.lineTo(joint, y + TILE / 2 - 3);
        ctx.moveTo(x + (r % 2 === 0 ? 4 : TILE / 2), y + TILE / 2 + 3);
        ctx.lineTo(x + (r % 2 === 0 ? 4 : TILE / 2), y + TILE - 3);
      }
    }
    ctx.stroke();

    for (let c = c0; c <= c1; c++) {
      for (let r = 0; r < level.rows; r++) {
        if (!solid(c, r)) continue;
        inkTileEdges(ctx, level, c, r);
        const rand = mulberry32(c * 131 + r * 7);
        if (rand() < 0.18) {
          const x = c * TILE + 8 + rand() * (TILE - 22);
          const y = r * TILE + 8 + rand() * (TILE - 22);
          inkLine(ctx, [[x, y], [x + 4, y + 5], [x + 2, y + 9], [x + 6, y + 13]], { stroke: COLORS.inkSoft, width: 1.2, seed: c * 31 + r });
        }
      }
    }

    for (let r = 0; r < level.rows; r++) {
      eachRun(c0, c1, (c) => tileAt(level, c, r) === 'oneway', (start, end) => drawShelf(start * TILE + 2, end * TILE - 2, r * TILE, start * 37 + r));
    }
  }

  function drawShelf(x0, x1, top, seed) {
    inkShape(ctx, [[x0, top], [x1, top], [x1, top + 12], [x0, top + 12]], { fill: COLORS.wood, width: 2.4, seed, smooth: false });
    for (const bx of [x0 + 10, x1 - 10]) inkLine(ctx, [[bx, top + 12], [bx, top + 24], [bx + (bx < (x0 + x1) / 2 ? -8 : 8), top + 12]], { width: 1.8, seed: seed + bx, smooth: false });
  }

  function drawThrone(goal, seed) {
    const { x, y } = goal;
    inkShape(ctx, [[x - 90, y - 4], [x + 30, y - 4], [x + 30, y], [x - 90, y]], { fill: COLORS.carpet, stroke: null, seed, offset: 0, smooth: false });
    inkRect(ctx, x + 6, y - 110, 44, 110, { fill: COLORS.carpet, width: 2.4, seed: seed + 1 });
    inkRect(ctx, x - 4, y - 44, 64, 14, { fill: COLORS.crown, width: 2.2, seed: seed + 2 });
    inkShape(ctx, [[x + 6, y - 110], [x + 16, y - 128], [x + 28, y - 114], [x + 40, y - 128], [x + 50, y - 110]], { fill: COLORS.crown, width: 2, seed: seed + 3, smooth: false });
  }

  return {
    paper: COLORS.castleWash,
    paperAt: (level, camX) => ROOM_TINTS[viewRoom(level, camX).kind] ?? COLORS.castleWash,
    drawBackdrop,
    drawTiles,
    drawGoal: (goal, time, awake) => {
      drawThrone(goal, 691);
      drawPrincess(ctx, goal, time, awake);
    },
  };
}
