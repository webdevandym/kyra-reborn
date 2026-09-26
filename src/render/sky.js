import { TILE, VIEW_W, COLORS } from '../config.js';
import { tileAt } from '../core/level.js';
import { mulberry32, inkShape, inkLine, inkPoly } from './ink.js';
import { hashString, visibleCols } from './layout.js';
import { cloudPoints, drawMoon } from './sky-sprites.js';

export function createSkyTheme(ctx) {
  const doodleCache = new Map();

  function doodlesFor(level) {
    if (doodleCache.has(level.id)) return doodleCache.get(level.id);
    const rand = mulberry32(hashString(level.id) ^ 0x5bd1e995);
    const sparkles = [];
    for (let x = 30; x < level.width * 0.1 + VIEW_W + 60; x += 60 + rand() * 90) {
      sparkles.push({ x, y: 24 + rand() * 250, r: 3 + rand() * 3.5, tw: rand() * Math.PI * 2, seed: Math.floor(rand() * 1e5) });
    }
    const clouds = [];
    for (let x = 80; x < level.width * 0.3 + VIEW_W; x += 320 + rand() * 280) {
      clouds.push({ x, y: 60 + rand() * 140, s: 0.7 + rand() * 0.5, seed: Math.floor(rand() * 1e5) });
    }
    const doodles = { sparkles, clouds };
    doodleCache.set(level.id, doodles);
    return doodles;
  }

  function drawBackdrop(level, camX, time) {
    const { sparkles, clouds } = doodlesFor(level);
    for (const s of sparkles) {
      const sx = s.x - camX * 0.1;
      if (sx < -20 || sx > VIEW_W + 20) continue;
      const r = s.r * (0.65 + 0.35 * Math.sin(time * 1.5 + s.tw));
      const points = [
        [sx, s.y - r * 2], [sx + r * 0.5, s.y - r * 0.5], [sx + r * 2, s.y], [sx + r * 0.5, s.y + r * 0.5],
        [sx, s.y + r * 2], [sx - r * 0.5, s.y + r * 0.5], [sx - r * 2, s.y], [sx - r * 0.5, s.y - r * 0.5],
      ];
      inkPoly(ctx, points, { fill: COLORS.paper, stroke: COLORS.inkSoft, width: 1.4, seed: s.seed, jitter: 0.4 });
    }
    for (const c of clouds) {
      const cx = c.x - camX * 0.3;
      if (cx < -120 || cx > VIEW_W + 120) continue;
      inkShape(ctx, cloudPoints(cx, c.y, 52 * c.s, 18 * c.s), { fill: COLORS.cloudShade, stroke: COLORS.inkSoft, width: 1.8, seed: c.seed });
    }
  }

  function eachRun(c0, c1, pred, draw) {
    let c = c0;
    while (c <= c1) {
      if (!pred(c)) {
        c++;
        continue;
      }
      let start = c;
      while (pred(start - 1)) start--;
      let end = c;
      while (pred(end)) end++;
      draw(start, end);
      c = end;
    }
  }

  function drawCloudTop(x0, x1, top, seed) {
    const bumps = Math.max(1, Math.round((x1 - x0) / 34));
    const n = bumps * 6;
    const edge = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      edge.push([x0 + u * (x1 - x0), top + 2 - Math.abs(Math.sin(u * bumps * Math.PI)) * 6]);
    }
    inkShape(ctx, [...edge, [x1, top + 8], [x0, top + 8]], { fill: COLORS.cloud, stroke: null, seed, offset: 0, jitter: 0.4 });
    inkLine(ctx, edge, { width: 2.8, seed: seed + 1 });
  }

  function drawCloudBottom(x0, x1, bottom, seed) {
    const bumps = Math.max(1, Math.round((x1 - x0) / 30));
    const n = bumps * 6;
    const edge = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      edge.push([x0 + u * (x1 - x0), bottom - 2 + Math.abs(Math.sin(u * bumps * Math.PI)) * 8]);
    }
    inkShape(ctx, [[x0, bottom - 8], ...edge, [x1, bottom - 8]], { fill: COLORS.cloud, stroke: null, seed, offset: 0, jitter: 0.4 });
    inkLine(ctx, edge, { width: 2.6, seed: seed + 1 });
  }

  function drawTiles(level, camX) {
    const [c0, c1] = visibleCols(level, camX);
    const solid = (c, r) => tileAt(level, c, r) === 'solid';

    ctx.fillStyle = COLORS.cloud;
    for (let c = c0; c <= c1; c++) {
      for (let r = 0; r < level.rows; r++) if (solid(c, r)) ctx.fillRect(c * TILE, r * TILE, TILE + 0.5, TILE + 0.5);
    }

    for (let r = 0; r < level.rows; r++) {
      eachRun(c0, c1, (c) => solid(c, r) && !solid(c, r + 1), (start, end) => drawCloudBottom(start * TILE, end * TILE, (r + 1) * TILE, start * 23 + r));
      eachRun(c0, c1, (c) => solid(c, r) && !solid(c, r - 1), (start, end) => drawCloudTop(start * TILE, end * TILE, r * TILE, start * 13 + r));
    }

    for (let c = c0; c <= c1; c++) {
      for (let r = 0; r < level.rows; r++) {
        if (!solid(c, r)) continue;
        const top = r * TILE + (solid(c, r - 1) ? 0 : 5);
        const bottom = (r + 1) * TILE - (solid(c, r + 1) ? 0 : 5);
        if (!solid(c - 1, r)) inkLine(ctx, [[c * TILE, top], [c * TILE, bottom]], { width: 2.4, seed: c * 17 + r });
        if (!solid(c + 1, r)) inkLine(ctx, [[(c + 1) * TILE, top], [(c + 1) * TILE, bottom]], { width: 2.4, seed: c * 19 + r });
        const rand = mulberry32(c * 131 + r * 7);
        if (rand() < 0.45) {
          const x = c * TILE + 10 + rand() * (TILE - 26);
          const y = r * TILE + 14 + rand() * (TILE - 26);
          inkLine(ctx, [[x, y], [x + 4, y - 4], [x + 9, y - 3], [x + 10, y + 1]], { stroke: COLORS.inkSoft, width: 1.3, seed: c * 29 + r });
        }
      }
    }

    for (let r = 0; r < level.rows; r++) {
      eachRun(c0, c1, (c) => tileAt(level, c, r) === 'oneway', (start, end) => {
        const x0 = start * TILE;
        const x1 = end * TILE;
        inkShape(ctx, cloudPoints((x0 + x1) / 2, r * TILE + 8, (x1 - x0) / 2 + 4, 10), { fill: COLORS.cloud, width: 2.4, seed: start * 29 + r });
      });
    }
  }

  return {
    paper: COLORS.skyWash,
    drawBackdrop,
    drawTiles,
    drawGoal: (goal, time, awake) => drawMoon(ctx, goal, time, awake),
  };
}
