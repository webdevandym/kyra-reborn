import { TILE, VIEW_W, COLORS } from '../config.js';
import { tileAt } from '../core/level.js';
import { mulberry32, inkShape, inkLine, inkPoly, inkRect } from './ink.js';
import { hashString, visibleCols } from './layout.js';
import { drawStar } from './sprites.js';
import { drawPrincess } from './castle-sprites.js';

export function createCastleTheme(ctx) {
  const doodleCache = new Map();

  function doodlesFor(level) {
    if (doodleCache.has(level.id)) return doodleCache.get(level.id);
    const rand = mulberry32(hashString(level.id) ^ 0x2545f491);
    const items = [];
    let kind = 0;
    for (let x = 120; x < level.width * 0.3 + VIEW_W; x += 150 + rand() * 90) {
      items.push({ kind: ['window', 'torch', 'banner', 'torch'][kind % 4], x, seed: Math.floor(rand() * 1e5) });
      kind++;
    }
    doodleCache.set(level.id, items);
    return items;
  }

  function archPoints(cx, top, w, h) {
    const points = [[cx - w / 2, top + h], [cx - w / 2, top + w / 2]];
    for (let i = 1; i < 8; i++) {
      const a = Math.PI + (i / 8) * Math.PI;
      points.push([cx + Math.cos(a) * (w / 2), top + w / 2 + Math.sin(a) * (w / 2)]);
    }
    points.push([cx + w / 2, top + w / 2], [cx + w / 2, top + h]);
    return points;
  }

  function drawWindow(cx, seed) {
    inkPoly(ctx, archPoints(cx, 110, 56, 96), { fill: COLORS.windowSky, stroke: COLORS.inkSoft, width: 2.2, seed });
    inkLine(ctx, [[cx, 110], [cx, 206]], { stroke: COLORS.inkSoft, width: 1.6, seed: seed + 1 });
    inkLine(ctx, [[cx - 28, 160], [cx + 28, 160]], { stroke: COLORS.inkSoft, width: 1.6, seed: seed + 2 });
    drawStar(ctx, cx - 13, 138, 3.5, COLORS.star, seed + 3);
    drawStar(ctx, cx + 12, 180, 3, COLORS.star, seed + 4);
  }

  function drawTorch(cx, time, seed) {
    inkRect(ctx, cx - 4, 190, 8, 22, { fill: COLORS.wood, stroke: COLORS.inkSoft, width: 1.8, seed });
    const flicker = Math.sin(time * 13 + seed) * 2;
    inkPoly(ctx, [[cx - 8, 190], [cx, 166 + flicker], [cx + 8, 190]], { fill: COLORS.torch, stroke: COLORS.inkSoft, width: 1.6, seed: seed + 1, jitter: 1.4 });
    inkPoly(ctx, [[cx - 3, 190], [cx, 178 + flicker], [cx + 3, 190]], { fill: COLORS.fireCore, stroke: null, seed: seed + 2, jitter: 1 });
  }

  function drawBanner(cx, seed) {
    inkLine(ctx, [[cx - 24, 96], [cx + 24, 96]], { stroke: COLORS.inkSoft, width: 2.2, seed });
    inkPoly(ctx, [[cx - 18, 96], [cx + 18, 96], [cx + 18, 200], [cx, 184], [cx - 18, 200]], { fill: COLORS.banner, stroke: COLORS.inkSoft, width: 2, seed: seed + 1 });
    drawStar(ctx, cx, 136, 7, COLORS.crown, seed + 2);
  }

  function drawBackdrop(level, camX, time) {
    for (const item of doodlesFor(level)) {
      const x = item.x - camX * 0.3;
      if (x < -60 || x > VIEW_W + 60) continue;
      if (item.kind === 'window') drawWindow(x, item.seed);
      else if (item.kind === 'torch') drawTorch(x, time, item.seed);
      else drawBanner(x, item.seed);
    }
  }

  function drawTiles(level, camX) {
    const [c0, c1] = visibleCols(level, camX);
    const solid = (c, r) => tileAt(level, c, r) === 'solid';

    ctx.fillStyle = COLORS.stone;
    for (let c = c0; c <= c1; c++) {
      for (let r = 0; r < level.rows; r++) if (solid(c, r)) ctx.fillRect(c * TILE, r * TILE, TILE + 0.5, TILE + 0.5);
    }

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
        if (!solid(c - 1, r)) inkLine(ctx, [[c * TILE, r * TILE], [c * TILE, (r + 1) * TILE]], { width: 2.4, seed: c * 17 + r });
        if (!solid(c + 1, r)) inkLine(ctx, [[(c + 1) * TILE, r * TILE], [(c + 1) * TILE, (r + 1) * TILE]], { width: 2.4, seed: c * 19 + r });
        if (!solid(c, r - 1) && r > 0) inkLine(ctx, [[c * TILE, r * TILE], [(c + 1) * TILE, r * TILE]], { width: 2.6, seed: c * 23 + r });
        if (!solid(c, r + 1) && r < level.rows - 1) inkLine(ctx, [[c * TILE, (r + 1) * TILE], [(c + 1) * TILE, (r + 1) * TILE]], { width: 2.6, seed: c * 29 + r });
        const rand = mulberry32(c * 131 + r * 7);
        if (rand() < 0.18) {
          const x = c * TILE + 8 + rand() * (TILE - 22);
          const y = r * TILE + 8 + rand() * (TILE - 22);
          inkLine(ctx, [[x, y], [x + 4, y + 5], [x + 2, y + 9], [x + 6, y + 13]], { stroke: COLORS.inkSoft, width: 1.2, seed: c * 31 + r });
        }
      }
    }

    for (let r = 0; r < level.rows; r++) {
      let c = c0;
      while (c <= c1) {
        if (tileAt(level, c, r) !== 'oneway') {
          c++;
          continue;
        }
        let start = c;
        while (tileAt(level, start - 1, r) === 'oneway') start--;
        let end = c;
        while (tileAt(level, end, r) === 'oneway') end++;
        drawShelf(start * TILE + 2, end * TILE - 2, r * TILE, start * 37 + r);
        c = end;
      }
    }
  }

  function drawShelf(x0, x1, top, seed) {
    inkShape(ctx, [[x0, top], [x1, top], [x1, top + 12], [x0, top + 12]], { fill: COLORS.wood, width: 2.4, seed, smooth: false });
    for (const bx of [x0 + 10, x1 - 10]) inkLine(ctx, [[bx, top + 12], [bx, top + 24], [bx + (bx < (x0 + x1) / 2 ? -8 : 8), top + 12]], { width: 1.8, seed: seed + bx, smooth: false });
  }

  return {
    paper: COLORS.castleWash,
    drawBackdrop,
    drawTiles,
    drawGoal: (goal, time, awake) => drawPrincess(ctx, goal, time, awake),
  };
}
